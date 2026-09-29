package com.neshastyar.app.upload

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.ServiceInfo
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import com.neshastyar.app.R
import com.neshastyar.app.data.repository.UploadMeetingRepository

@HiltWorker
class CreateMeetingWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val uploadMeetingRepository: UploadMeetingRepository,
) : CoroutineWorker(appContext, params) {

    override suspend fun getForegroundInfo(): ForegroundInfo {
        return createForegroundInfo("در حال آپلود جلسه…")
    }

    override suspend fun doWork(): Result {
        val draftId = inputData.getString(KEY_DRAFT_ID) ?: return Result.failure(
            workDataOf(KEY_ERROR to "شناسه پیش‌نویس نامعتبر"),
        )
        val tagIds = inputData.getStringArray(KEY_TAG_IDS)?.toList().orEmpty()
        val participantIds = inputData.getStringArray(KEY_PARTICIPANT_IDS)?.toList().orEmpty()

        runCatching { setForeground(getForegroundInfo()) }

        setProgress(
            workDataOf(
                KEY_PROGRESS to 0,
                KEY_PROGRESS_MESSAGE to "شروع آپلود…",
            ),
        )

        return uploadMeetingRepository.uploadDraft(draftId, tagIds, participantIds) { progress ->
            runCatching {
                setForeground(createForegroundInfo(progress.message))
            }
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
                if (runAttemptCount < 8) Result.retry()
                else Result.failure(workDataOf(KEY_ERROR to (e.message ?: "آپلود ناموفق")))
            },
        )
    }

    private fun createForegroundInfo(message: String): ForegroundInfo {
        val channelId = "upload_channel"
        val nm = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(
            channelId,
            "آپلود جلسه",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "نمایش وضعیت آپلود جلسه صوتی"
            setShowBadge(false)
        }
        nm.createNotificationChannel(channel)

        val notification = NotificationCompat.Builder(applicationContext, channelId)
            .setContentTitle("نشست‌یار")
            .setContentText(message)
            .setSmallIcon(R.drawable.ic_launcher)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ForegroundInfo(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
            )
        } else {
            ForegroundInfo(NOTIFICATION_ID, notification)
        }
    }

    companion object {
        private const val NOTIFICATION_ID = 2001
        const val UNIQUE_PREFIX = "create_meeting_"
        const val KEY_DRAFT_ID = "draft_id"
        const val KEY_TAG_IDS = "tag_ids"
        const val KEY_PARTICIPANT_IDS = "participant_ids"
        const val KEY_MEETING_ID = "meeting_id"
        const val KEY_ERROR = "error"
        const val KEY_PROGRESS = "progress"
        const val KEY_PROGRESS_MESSAGE = "progress_message"
        const val KEY_FILE_INDEX = "file_index"
        const val KEY_FILE_COUNT = "file_count"
    }
}
