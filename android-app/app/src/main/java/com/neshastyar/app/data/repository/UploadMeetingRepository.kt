package com.neshastyar.app.data.repository

import kotlin.math.roundToInt
import kotlinx.coroutines.runBlocking
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import com.neshastyar.app.data.api.CreateAudioFileRequest
import com.neshastyar.app.data.api.CreateMeetingRequest
import com.neshastyar.app.data.api.CreateMeetingTagRequest
import com.neshastyar.app.data.api.NeshastyarApi
import com.neshastyar.app.data.local.DraftAudioFileEntity
import com.neshastyar.app.data.local.DraftDao
import com.neshastyar.app.upload.ProgressRequestBody
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.atomic.AtomicLong
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UploadMeetingRepository @Inject constructor(
    private val api: NeshastyarApi,
    private val draftDao: DraftDao,
) {
    data class UploadedFile(
        val local: DraftAudioFileEntity,
        val relativePath: String,
        val size: Long,
        val format: String,
    )

    data class UploadProgress(
        val percent: Int,
        val message: String,
        val fileIndex: Int = 0,
        val fileCount: Int = 0,
    )

    suspend fun uploadDraft(
        draftId: String,
        selectedTagIds: List<String>,
        onProgress: suspend (UploadProgress) -> Unit = {},
    ): Result<String> = runCatching {
        val draft = draftDao.getDraft(draftId) ?: error("پیش‌نویس پیدا نشد")
        val files = draftDao.listFiles(draftId)
        if (files.isEmpty()) error("فایلی برای آپلود نیست")

        val fileCount = files.size
        emit(onProgress, 0, "شروع آپلود…", 0, fileCount)

        val uploaded = files.mapIndexed { index, file ->
            uploadOne(file, index, fileCount, onProgress)
        }

        emit(onProgress, 82, "ایجاد جلسه…", fileCount, fileCount)
        val title = files.first().displayName.substringBeforeLast('.').ifBlank { "جلسه" }
        val iso = isoNow()
        val meetingResp = api.createMeeting(
            CreateMeetingRequest(
                title = title,
                meeting_date = iso,
                summary = "",
                status = "آماده پردازش",
                commentText = draft.commentText.ifBlank { null },
            ),
        )
        if (!meetingResp.isSuccessful) error("ایجاد جلسه ناموفق (${meetingResp.code()})")
        val meeting = meetingResp.body() ?: error("پاسخ جلسه خالی")
        val meetingId = meeting.id

        emit(onProgress, 88, "ثبت فایل‌های صوتی…", fileCount, fileCount)
        uploaded.forEachIndexed { index, up ->
            val r = api.createAudioFile(
                CreateAudioFileRequest(
                    meeting_id = meetingId,
                    file_name = up.local.displayName,
                    file_path = up.relativePath,
                    file_size = up.size,
                    duration = up.local.durationSec,
                    format = up.format,
                    upload_order = index + 1,
                ),
            )
            if (!r.isSuccessful) error("ثبت فایل صوتی ناموفق (${r.code()})")
        }

        if (selectedTagIds.isNotEmpty()) {
            emit(onProgress, 94, "اتصال برچسب‌ها…", fileCount, fileCount)
            selectedTagIds.forEach { tagId ->
                api.createMeetingTag(CreateMeetingTagRequest(meetingId, tagId))
            }
        }

        emit(onProgress, 97, "ارسال برای پردازش…", fileCount, fileCount)
        val analyze = api.analyzeMeeting(meetingId)
        if (!analyze.isSuccessful) {
            // meeting already created; still return id
        }

        draftDao.clearFiles(draftId)
        files.forEach { runCatching { File(it.localPath).delete() } }
        draftDao.deleteDraft(draftId)
        emit(onProgress, 100, "آپلود کامل شد", fileCount, fileCount)
        meetingId
    }

    private suspend fun uploadOne(
        file: DraftAudioFileEntity,
        index: Int,
        fileCount: Int,
        onProgress: suspend (UploadProgress) -> Unit,
    ): UploadedFile {
        val local = File(file.localPath)
        if (!local.exists()) error("فایل محلی موجود نیست: ${file.displayName}")
        val ts = System.currentTimeMillis()
        val filename = "$ts-$index-${file.displayName}"
        val mediaType = (file.mimeType.ifBlank { "audio/mp4" }).toMediaTypeOrNull()
        val lastEmitMs = AtomicLong(0L)

        val body = ProgressRequestBody(local, mediaType) { written, total ->
            val now = System.currentTimeMillis()
            val shouldEmit = written >= total || now - lastEmitMs.get() >= 120L
            if (!shouldEmit) return@ProgressRequestBody
            lastEmitMs.set(now)
            val fileFraction = if (total > 0) written.toDouble() / total.toDouble() else 1.0
            val overall = ((index + fileFraction) / fileCount.toDouble()) * 80.0
            val percent = overall.roundToInt().coerceIn(0, 80)
            val msg = "آپلود فایل ${index + 1} از $fileCount"
            runBlocking {
                onProgress(
                    UploadProgress(
                        percent = percent,
                        message = msg,
                        fileIndex = index + 1,
                        fileCount = fileCount,
                    ),
                )
            }
        }
        val part = MultipartBody.Part.createFormData("audio", filename, body)
        val resp = api.uploadAudio(part)
        if (!resp.isSuccessful) error("آپلود ${file.displayName} ناموفق (${resp.code()})")
        val data = resp.body()?.data ?: error("پاسخ آپلود خالی")
        val relative = data.relativePath ?: error("relativePath خالی")
        val donePercent = (((index + 1).toDouble() / fileCount.toDouble()) * 80.0).roundToInt()
        emit(onProgress, donePercent, "آپلود فایل ${index + 1} از $fileCount", index + 1, fileCount)
        return UploadedFile(
            local = file,
            relativePath = relative.replace('\\', '/'),
            size = data.size ?: local.length(),
            format = data.format ?: file.mimeType,
        )
    }

    private suspend fun emit(
        onProgress: suspend (UploadProgress) -> Unit,
        percent: Int,
        message: String,
        fileIndex: Int,
        fileCount: Int,
    ) {
        onProgress(
            UploadProgress(
                percent = percent.coerceIn(0, 100),
                message = message,
                fileIndex = fileIndex,
                fileCount = fileCount,
            ),
        )
    }

    private fun isoNow(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(Date())
    }
}
