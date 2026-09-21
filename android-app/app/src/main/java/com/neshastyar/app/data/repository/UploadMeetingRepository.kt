package com.neshastyar.app.data.repository

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlin.math.roundToInt
import kotlinx.coroutines.delay
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import com.neshastyar.app.data.api.CreateAudioFileRequest
import com.neshastyar.app.data.api.CreateMeetingRequest
import com.neshastyar.app.data.api.CreateMeetingTagRequest
import com.neshastyar.app.data.api.CreateUploadSessionRequest
import com.neshastyar.app.data.api.NeshastyarApi
import com.neshastyar.app.data.local.DraftAudioFileEntity
import com.neshastyar.app.data.local.DraftDao
import com.neshastyar.app.upload.FileSliceRequestBody
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.atomic.AtomicLong
import javax.inject.Inject
import kotlinx.coroutines.runBlocking
import javax.inject.Singleton
import retrofit2.Response

@Singleton
class UploadMeetingRepository @Inject constructor(
    private val api: NeshastyarApi,
    private val draftDao: DraftDao,
    @ApplicationContext private val context: Context,
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
        val meetingId = savedMeetingId(draftId) ?: createMeeting(draft.commentText, files).also {
            saveMeetingId(draftId, it)
        }

        emit(onProgress, 88, "ثبت فایل‌های صوتی…", fileCount, fileCount)
        uploaded.forEachIndexed { index, up ->
            if (up.local.uploadState == STATE_LINKED) return@forEachIndexed
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
            draftDao.upsertFile(
                up.local.copy(
                    uploadState = STATE_LINKED,
                    remoteRelativePath = up.relativePath,
                ),
            )
        }

        if (selectedTagIds.isNotEmpty()) {
            emit(onProgress, 94, "اتصال برچسب‌ها…", fileCount, fileCount)
            selectedTagIds.forEach { tagId ->
                api.createMeetingTag(CreateMeetingTagRequest(meetingId, tagId))
            }
        }

        emit(onProgress, 97, "ارسال برای پردازش…", fileCount, fileCount)
        api.analyzeMeeting(meetingId)

        draftDao.clearFiles(draftId)
        files.forEach { runCatching { File(it.localPath).delete() } }
        draftDao.deleteDraft(draftId)
        clearMeetingId(draftId)
        emit(onProgress, 100, "آپلود کامل شد", fileCount, fileCount)
        meetingId
    }

    private suspend fun createMeeting(commentText: String, files: List<DraftAudioFileEntity>): String {
        val title = files.first().displayName.substringBeforeLast('.').ifBlank { "جلسه" }
        val meetingResp = api.createMeeting(
            CreateMeetingRequest(
                title = title,
                meeting_date = isoNow(),
                summary = "",
                status = "آماده پردازش",
                commentText = commentText.ifBlank { null },
            ),
        )
        if (!meetingResp.isSuccessful) error("ایجاد جلسه ناموفق (${meetingResp.code()})")
        return meetingResp.body()?.id ?: error("پاسخ جلسه خالی")
    }

    private suspend fun uploadOne(
        file: DraftAudioFileEntity,
        index: Int,
        fileCount: Int,
        onProgress: suspend (UploadProgress) -> Unit,
    ): UploadedFile {
        val savedPath = file.remoteRelativePath?.replace('\\', '/')
        if ((file.uploadState == STATE_UPLOADED || file.uploadState == STATE_LINKED) && !savedPath.isNullOrBlank()) {
            val donePercent = (((index + 1).toDouble() / fileCount.toDouble()) * 80.0).roundToInt()
            emit(onProgress, donePercent, "فایل ${index + 1} از قبل آپلود شده", index + 1, fileCount)
            val local = File(file.localPath)
            return UploadedFile(
                local = file,
                relativePath = savedPath,
                size = if (local.exists()) local.length() else 0L,
                format = file.mimeType,
            )
        }

        val local = File(file.localPath)
        if (!local.exists()) error("فایل محلی موجود نیست: ${file.displayName}")
        val total = local.length()
        if (total <= 0L) error("فایل خالی است: ${file.displayName}")

        val session = retrying {
            val response = api.createUploadSession(
                CreateUploadSessionRequest(
                    uploadId = file.id,
                    fileName = file.displayName,
                    totalSize = total,
                    mimeType = file.mimeType.ifBlank { "audio/mp4" },
                ),
            )
            if (!response.isSuccessful) error("شروع آپلود ناموفق (${response.code()})")
            response.body()?.data ?: error("پاسخ آپلود خالی")
        }

        if (session.complete == true && !session.relativePath.isNullOrBlank()) {
            return rememberUploaded(file, session.relativePath, session.size ?: total, session.format, index, fileCount, onProgress)
        }

        var offset = session.bytesReceived ?: 0L
        val mediaType = "application/octet-stream".toMediaTypeOrNull()
        val lastEmitMs = AtomicLong(0L)
        while (offset < total) {
            val length = minOf(CHUNK_BYTES, total - offset)
            val startOffset = offset
            val response = retrying {
                val body = FileSliceRequestBody(local, startOffset, length, mediaType) { written ->
                    val now = System.currentTimeMillis()
                    val done = written >= length
                    if (!done && now - lastEmitMs.get() < 150L) return@FileSliceRequestBody
                    lastEmitMs.set(now)
                    val fileFraction = (startOffset + written).toDouble() / total.toDouble()
                    val overall = ((index + fileFraction) / fileCount.toDouble()) * 80.0
                    val message = if (startOffset > 0L) {
                        "ادامه آپلود فایل ${index + 1} از $fileCount"
                    } else {
                        "آپلود فایل ${index + 1} از $fileCount"
                    }
                    runBlocking {
                        emit(
                            onProgress,
                            overall.roundToInt().coerceIn(0, 80),
                            message,
                            index + 1,
                            fileCount,
                        )
                    }
                }
                val chunkResponse = api.appendUploadChunk(file.id, startOffset, body)
                if (!chunkResponse.isSuccessful && chunkResponse.code() != 409) {
                    error("آپلود ${file.displayName} ناموفق (${chunkResponse.code()})")
                }
                chunkResponse
            }
            val conflictOffset = conflictBytes(response)
            if (conflictOffset != null) {
                offset = conflictOffset
                continue
            }
            if (!response.isSuccessful) error("آپلود ${file.displayName} ناموفق (${response.code()})")
            offset = response.body()?.data?.bytesReceived ?: (startOffset + length)
            val fileFraction = offset.toDouble() / total.toDouble()
            val overall = ((index + fileFraction) / fileCount.toDouble()) * 80.0
            val message = if (startOffset > 0L) {
                "ادامه آپلود فایل ${index + 1} از $fileCount"
            } else {
                "آپلود فایل ${index + 1} از $fileCount"
            }
            emit(onProgress, overall.roundToInt().coerceIn(0, 80), message, index + 1, fileCount)
        }

        val completed = retrying {
            val response = api.completeUploadSession(file.id)
            if (!response.isSuccessful) error("پایان آپلود ناموفق (${response.code()})")
            response.body()?.data ?: error("پاسخ پایان آپلود خالی")
        }
        val relative = completed.relativePath ?: error("relativePath خالی")
        return rememberUploaded(file, relative, completed.size ?: total, completed.format, index, fileCount, onProgress)
    }

    private suspend fun rememberUploaded(
        file: DraftAudioFileEntity,
        relativePath: String,
        size: Long,
        format: String?,
        index: Int,
        fileCount: Int,
        onProgress: suspend (UploadProgress) -> Unit,
    ): UploadedFile {
        val normalized = relativePath.replace('\\', '/')
        val stored = file.copy(uploadState = STATE_UPLOADED, remoteRelativePath = normalized)
        draftDao.upsertFile(stored)
        val donePercent = (((index + 1).toDouble() / fileCount.toDouble()) * 80.0).roundToInt()
        emit(onProgress, donePercent, "آپلود فایل ${index + 1} از $fileCount", index + 1, fileCount)
        return UploadedFile(
            local = stored,
            relativePath = normalized,
            size = size,
            format = format ?: file.mimeType,
        )
    }

    private fun conflictBytes(response: Response<*>): Long? {
        if (response.code() != 409) return null
        val raw = response.errorBody()?.string().orEmpty()
        return Regex("\"bytesReceived\"\\s*:\\s*(\\d+)").find(raw)?.groupValues?.getOrNull(1)?.toLongOrNull()
    }

    private suspend fun <T> retrying(times: Int = 4, block: suspend () -> T): T {
        var last: Exception? = null
        repeat(times) { attempt ->
            try {
                return block()
            } catch (e: Exception) {
                last = e
                if (attempt < times - 1) delay(500L * (attempt + 1))
            }
        }
        throw last ?: IllegalStateException("آپلود ناموفق بود")
    }

    private fun prefs() = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun savedMeetingId(draftId: String): String? =
        prefs().getString(meetingKey(draftId), null)?.takeIf { it.isNotBlank() }

    private fun saveMeetingId(draftId: String, meetingId: String) {
        prefs().edit().putString(meetingKey(draftId), meetingId).apply()
    }

    private fun clearMeetingId(draftId: String) {
        prefs().edit().remove(meetingKey(draftId)).apply()
    }

    private fun meetingKey(draftId: String) = "meeting_$draftId"

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

    companion object {
        private const val CHUNK_BYTES = 5L * 1024L * 1024L
        private const val PREFS = "upload_resume"
        private const val STATE_UPLOADED = "uploaded"
        private const val STATE_LINKED = "linked"
    }
}
