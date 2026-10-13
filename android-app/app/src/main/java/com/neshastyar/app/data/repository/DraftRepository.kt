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
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import com.neshastyar.app.data.local.DraftAudioFileEntity
import com.neshastyar.app.data.local.DraftDao
import com.neshastyar.app.data.local.RecordingDraftEntity

@Singleton
class DraftRepository @Inject constructor(
    private val draftDao: DraftDao,
    @ApplicationContext private val context: Context,
) {
    private val fileLock = Mutex()
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
    ): DraftAudioFileEntity? = fileLock.withLock {
        val file = File(localPath)
        if (!isUsableAudio(file)) return@withLock null
        val path = file.absolutePath
        val existing = draftDao.listFiles(draftId).firstOrNull { sameFile(it.localPath, path) }
        if (existing != null) return@withLock existing
        val count = draftDao.fileCount(draftId)
        val entity = DraftAudioFileEntity(
            id = UUID.randomUUID().toString(),
            draftId = draftId,
            localPath = path,
            displayName = file.name,
            durationSec = durationSec.coerceAtLeast(0),
            mimeType = "audio/mp4",
            source = "recording",
            sortOrder = count + 1,
        )
        draftDao.upsertFile(entity)
        entity
    }

    /**
     * Drop rows whose audio is gone, and extra rows that point at the same file.
     * The list must match what is actually on the phone.
     */
    suspend fun pruneDraftFiles(draftId: String) = fileLock.withLock {
        val seen = mutableSetOf<String>()
        for (file in draftDao.listFiles(draftId)) {
            val resolved = resolveFile(file)
            if (resolved == null) {
                draftDao.deleteFile(file.id)
                continue
            }
            val path = resolved.absolutePath
            if (!seen.add(path)) {
                draftDao.deleteFile(file.id)
                continue
            }
            if (file.localPath != path) {
                draftDao.upsertFile(file.copy(localPath = path))
            }
        }
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

    /**
     * The row can outlive the original absolute path (recorder release, reinstall
     * of a debug build, or a path that was only the file name). Look up the bytes
     * by the stored path, then by file name under the app's own storage.
     */
    fun resolveFile(entity: DraftAudioFileEntity): File? {
        val direct = File(entity.localPath)
        if (isUsableAudio(direct)) return direct
        if (!entity.localPath.startsWith("/")) {
            val relative = File(context.filesDir, entity.localPath)
            if (isUsableAudio(relative)) return relative
        }
        val names = listOf(entity.displayName, direct.name)
            .map { it.substringAfterLast('/').substringAfterLast('\\').trim() }
            .filter { it.isNotEmpty() }
            .distinct()
        for (root in searchRoots()) {
            if (!root.isDirectory) continue
            for (name in names) {
                val exact = File(root, name)
                if (isUsableAudio(exact)) return exact
            }
            val children = root.listFiles() ?: continue
            val match = children.firstOrNull { child ->
                child.isFile && isUsableAudio(child) && names.any { name ->
                    child.name == name || child.name.endsWith("-$name")
                }
            }
            if (match != null) return match
        }
        return null
    }

    suspend fun healStoredPath(entity: DraftAudioFileEntity): DraftAudioFileEntity {
        val resolved = resolveFile(entity) ?: return entity
        if (resolved.absolutePath == entity.localPath) return entity
        val updated = entity.copy(localPath = resolved.absolutePath)
        draftDao.upsertFile(updated)
        return updated
    }

    suspend fun deleteFile(file: DraftAudioFileEntity) = fileLock.withLock {
        val path = File(file.localPath).absolutePath
        draftDao.deleteFile(file.id)
        val stillUsed = draftDao.listFiles(file.draftId).any { sameFile(it.localPath, path) }
        if (!stillUsed) {
            runCatching { File(path).delete() }
        }
    }

    private fun sameFile(storedPath: String, absolutePath: String): Boolean =
        storedPath == absolutePath || File(storedPath).absolutePath == absolutePath

    private fun isUsableAudio(file: File): Boolean =
        file.exists() && file.isFile && file.length() > 0L

    private fun searchRoots(): List<File> {
        val external = context.getExternalFilesDir(null)
        return listOfNotNull(
            File(context.filesDir, "recordings"),
            File(context.filesDir, "imports"),
            external?.let { File(it, "recordings") },
            external?.let { File(it, "imports") },
            context.filesDir,
            external,
            context.noBackupFilesDir,
            context.cacheDir,
            context.externalCacheDir,
        ).distinctBy { it.absolutePath }
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