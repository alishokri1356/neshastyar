package com.neshastyar.app.data.local

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "recording_drafts")
data class RecordingDraftEntity(
    @PrimaryKey val id: String,
    val commentText: String = "",
    val createdAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "draft_audio_files")
data class DraftAudioFileEntity(
    @PrimaryKey val id: String,
    val draftId: String,
    val localPath: String,
    val displayName: String,
    val durationSec: Int = 0,
    val mimeType: String = "audio/mp4",
    val source: String = "recording", // recording | import
    val sortOrder: Int = 0,
    val uploadState: String = "pending",
    val remoteRelativePath: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
)

@Dao
interface DraftDao {
    @Query("SELECT * FROM recording_drafts ORDER BY createdAt DESC LIMIT 1")
    suspend fun latestDraft(): RecordingDraftEntity?

    @Query("SELECT * FROM recording_drafts WHERE id = :id")
    suspend fun getDraft(id: String): RecordingDraftEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDraft(draft: RecordingDraftEntity)

    @Update
    suspend fun updateDraft(draft: RecordingDraftEntity)

    @Query("SELECT * FROM draft_audio_files WHERE draftId = :draftId ORDER BY sortOrder ASC, createdAt ASC")
    fun observeFiles(draftId: String): Flow<List<DraftAudioFileEntity>>

    @Query("SELECT * FROM draft_audio_files WHERE draftId = :draftId ORDER BY sortOrder ASC, createdAt ASC")
    suspend fun listFiles(draftId: String): List<DraftAudioFileEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertFile(file: DraftAudioFileEntity)

    @Query("DELETE FROM draft_audio_files WHERE id = :id")
    suspend fun deleteFile(id: String)

    @Query("DELETE FROM draft_audio_files WHERE draftId = :draftId")
    suspend fun clearFiles(draftId: String)

    @Query("DELETE FROM recording_drafts WHERE id = :id")
    suspend fun deleteDraft(id: String)

    @Query("SELECT COUNT(*) FROM draft_audio_files WHERE draftId = :draftId")
    suspend fun fileCount(draftId: String): Int
}