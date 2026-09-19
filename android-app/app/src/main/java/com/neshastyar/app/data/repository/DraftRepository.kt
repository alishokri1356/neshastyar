package com.neshastyar.app.data.repository

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import com.neshastyar.app.data.local.DraftAudioFileEntity
import com.neshastyar.app.data.local.DraftDao
import com.neshastyar.app.data.local.RecordingDraftEntity

@Singleton
class DraftRepository @Inject constructor(
    private val draftDao: DraftDao,
    @ApplicationContext private val context: Context,
) {
    suspend fun ensureActiveDraft(): RecordingDraftEntity {
        val existing = draftDao.latestDraft()
        if (existing != null) return existing
        val draft = RecordingDraftEntity(id = UUID.randomUUID().toString())
        draftDao.upsertDraft(draft)
        return draft
    }

    fun observeFiles(draftId: String): Flow<List<DraftAudioFileEntity>> =
        draftDao.observeFiles(draftId)

    suspend fun updateComment(draftId: String, comment: String) {
        val draft = draftDao.getDraft(draftId) ?: return
        draftDao.updateDraft(draft.copy(commentText = comment))
    }

    suspend fun addRecordingFile(
        draftId: String,
        localPath: String,
        durationSec: Int,
    ): DraftAudioFileEntity {
        val count = draftDao.fileCount(draftId)
        val file = File(localPath)
        val entity = DraftAudioFileEntity(
            id = UUID.randomUUID().toString(),
            draftId = draftId,
            localPath = localPath,
            displayName = file.name,
            durationSec = durationSec.coerceAtLeast(0),
            mimeType = "audio/mp4",
            source = "recording",
            sortOrder = count + 1,
        )
        draftDao.upsertFile(entity)
        return entity
    }

    suspend fun importUri(draftId: String, uri: Uri): Result<DraftAudioFileEntity> =
        withContext(Dispatchers.IO) {
            try {
                val name = queryDisplayName(uri) ?: "import-${System.currentTimeMillis()}.audio"
                if (!isSupported(name)) {
                    return@withContext Result.failure(IllegalArgumentException("فرمت فایل پشتیبانی نمی‌شود"))
                }
                val destDir = File(context.filesDir, "imports").apply { mkdirs() }
                val dest = File(destDir, "${System.currentTimeMillis()}-$name")
                context.contentResolver.openInputStream(uri)?.use { input ->
                    dest.outputStream().use { output -> input.copyTo(output) }
                } ?: return@withContext Result.failure(IllegalStateException("خواندن فایل ممکن نبود"))

                val mime = context.contentResolver.getType(uri)
                    ?: MimeTypeMap.getSingleton().getMimeTypeFromExtension(
                        name.substringAfterLast('.', ""),
                    )
                    ?: "audio/*"
                val count = draftDao.fileCount(draftId)
                val entity = DraftAudioFileEntity(
                    id = UUID.randomUUID().toString(),
                    draftId = draftId,
                    localPath = dest.absolutePath,
                    displayName = name,
                    durationSec = 0,
                    mimeType = mime,
                    source = "import",
                    sortOrder = count + 1,
                )
                draftDao.upsertFile(entity)
                Result.success(entity)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun deleteFile(file: DraftAudioFileEntity) {
        draftDao.deleteFile(file.id)
        runCatching { File(file.localPath).delete() }
    }

    suspend fun getDraft(draftId: String) = draftDao.getDraft(draftId)

    private fun queryDisplayName(uri: Uri): String? {
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && cursor.moveToFirst()) return cursor.getString(idx)
        }
        return uri.lastPathSegment
    }

    private fun isSupported(name: String): Boolean {
        val ext = "." + name.substringAfterLast('.', missingDelimiterValue = "").lowercase()
        return ext in SUPPORTED_EXTENSIONS
    }

    companion object {
        val SUPPORTED_EXTENSIONS = setOf(
            ".mp3", ".wav", ".aac", ".m4a", ".ogg", ".opus", ".webm",
            ".3gp", ".3gpp", ".amr", ".flac", ".caf", ".aiff", ".aif",
        )
    }
}