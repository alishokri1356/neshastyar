package com.neshastyar.app.upload

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import com.neshastyar.app.data.repository.UploadMeetingRepository

@HiltWorker
class CreateMeetingWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val uploadMeetingRepository: UploadMeetingRepository,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val draftId = inputData.getString(KEY_DRAFT_ID) ?: return Result.failure(
            workDataOf(KEY_ERROR to "شناسه پیش‌نویس نامعتبر"),
        )
        val tagIds = inputData.getStringArray(KEY_TAG_IDS)?.toList().orEmpty()

        setProgress(
            workDataOf(
                KEY_PROGRESS to 0,
                KEY_PROGRESS_MESSAGE to "شروع آپلود…",
            ),
        )

        return uploadMeetingRepository.uploadDraft(draftId, tagIds) { progress ->
            setProgress(
                workDataOf(
                    KEY_PROGRESS to progress.percent,
                    KEY_PROGRESS_MESSAGE to progress.message,
                    KEY_FILE_INDEX to progress.fileIndex,
                    KEY_FILE_COUNT to progress.fileCount,
                ),
            )
        }.fold(
            onSuccess = { meetingId ->
                Result.success(
                    workDataOf(
                        KEY_MEETING_ID to meetingId,
                        KEY_PROGRESS to 100,
                        KEY_PROGRESS_MESSAGE to "آپلود کامل شد",
                    ),
                )
            },
            onFailure = { e ->
                if (runAttemptCount < 3) Result.retry()
                else Result.failure(workDataOf(KEY_ERROR to (e.message ?: "آپلود ناموفق")))
            },
        )
    }

    companion object {
        const val UNIQUE_PREFIX = "create_meeting_"
        const val KEY_DRAFT_ID = "draft_id"
        const val KEY_TAG_IDS = "tag_ids"
        const val KEY_MEETING_ID = "meeting_id"
        const val KEY_ERROR = "error"
        const val KEY_PROGRESS = "progress"
        const val KEY_PROGRESS_MESSAGE = "progress_message"
        const val KEY_FILE_INDEX = "file_index"
        const val KEY_FILE_COUNT = "file_count"
    }
}
