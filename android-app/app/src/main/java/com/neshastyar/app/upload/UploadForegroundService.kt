package com.neshastyar.app.upload

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import com.neshastyar.app.MainActivity
import com.neshastyar.app.R
import com.neshastyar.app.data.local.DraftStatus
import com.neshastyar.app.data.repository.DraftRepository
import com.neshastyar.app.data.repository.UploadMeetingRepository

/**
 * Upload keeps running after the screen locks. A screen-off device drops DNS for a
 * background page, which shows up as "unable to resolve host". A foreground service
 * plus a wake lock is the API available since Android 8.
 */
@AndroidEntryPoint
class UploadForegroundService : android.app.Service() {

    @Inject lateinit var uploadMeetingRepository: UploadMeetingRepository
    @Inject lateinit var draftRepository: DraftRepository
    @Inject lateinit var progressHub: UploadProgressHub

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mainHandler = Handler(Looper.getMainLooper())
    private var running = false
    private var foregroundStarted = false
    private var shownFileIndex = 0
    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null

    override fun onBind(intent: Intent?) = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val draftId = intent?.getStringExtra(EXTRA_DRAFT_ID)
        if (intent?.action != ACTION_START || draftId.isNullOrBlank()) {
            if (!running) stopSelf()
            return START_NOT_STICKY
        }
        if (running) {
            showProgress(getString(R.string.upload_notification_starting), 0, 0, 0)
            return START_REDELIVER_INTENT
        }
        running = true
        foregroundStarted = false
        shownFileIndex = 0
        showProgress(getString(R.string.upload_notification_starting), 0, 0, 0)
        acquireLocks()
        val tagIds = intent.getStringArrayListExtra(EXTRA_TAG_IDS).orEmpty()
        val participantIds = intent.getStringArrayListExtra(EXTRA_PARTICIPANT_IDS).orEmpty()
        progressHub.begin(draftId)
        scope.launch {
            draftRepository.setStatus(draftId, DraftStatus.ON_UPLOADING)
            try {
                val result = uploadMeetingRepository.uploadDraft(draftId, tagIds, participantIds) { progress ->
                    progressHub.progress(
                        draftId,
                        progress.percent,
                        progress.message,
                        progress.fileIndex,
                        progress.fileCount,
                    )
                    showProgress(progress.message, progress.percent, progress.fileIndex, progress.fileCount)
                }
                result.fold(
                    onSuccess = { meetingId ->
                        progressHub.success(draftId, meetingId)
                    },
                    onFailure = { error ->
                        draftRepository.setStatus(draftId, DraftStatus.ON_TAG_SELECTION)
                        progressHub.failure(draftId, error.message ?: getString(R.string.upload_failed))
                    },
                )
            } catch (error: Exception) {
                draftRepository.setStatus(draftId, DraftStatus.ON_TAG_SELECTION)
                progressHub.failure(draftId, error.message ?: getString(R.string.upload_failed))
            } finally {
                running = false
                releaseLocks()
                ServiceCompat.stopForeground(this@UploadForegroundService, ServiceCompat.STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_REDELIVER_INTENT
    }

    override fun onDestroy() {
        foregroundStarted = false
        releaseLocks()
        super.onDestroy()
    }

    private fun showProgress(message: String, percent: Int, fileIndex: Int, fileCount: Int) {
        val title = if (fileCount > 0 && fileIndex > 0) {
            getString(R.string.upload_file_progress, fileIndex, fileCount)
        } else {
            getString(R.string.upload_notification_title)
        }
        val text = message.ifBlank { getString(R.string.upload_notification_starting) }
        mainHandler.post {
            if (fileCount > 0 && fileIndex > 0 && fileIndex < shownFileIndex) return@post
            if (fileIndex > shownFileIndex) shownFileIndex = fileIndex
            val notification = buildNotification(title, text, percent)
            if (!foregroundStarted) {
                foregroundStarted = true
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ServiceCompat.startForeground(
                        this,
                        NOTIFICATION_ID,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
                    )
                } else {
                    startForeground(NOTIFICATION_ID, notification)
                }
            } else {
                getSystemService(NotificationManager::class.java)?.notify(NOTIFICATION_ID, notification)
            }
        }
    }

    private fun buildNotification(title: String, message: String, percent: Int): Notification {
        ensureChannel()
        val openApp = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setSmallIcon(R.drawable.ic_launcher)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setWhen(System.currentTimeMillis())
            .setContentIntent(openApp)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
        if (percent in 0..99) {
            builder.setProgress(100, percent, false)
        }
        return builder.build()
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NotificationManager::class.java) ?: return
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.upload_channel_name),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = getString(R.string.upload_channel_desc)
            setShowBadge(false)
        }
        nm.createNotificationChannel(channel)
    }

    private fun acquireLocks() {
        val power = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "neshastyar:upload").apply {
            setReferenceCounted(false)
            acquire(MAX_LOCK_MS)
        }
        val wifi = applicationContext.getSystemService(WIFI_SERVICE) as WifiManager
        @Suppress("DEPRECATION")
        wifiLock = wifi.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "neshastyar:upload-wifi").apply {
            setReferenceCounted(false)
            acquire()
        }
    }

    private fun releaseLocks() {
        runCatching { if (wakeLock?.isHeld == true) wakeLock?.release() }
        wakeLock = null
        runCatching { if (wifiLock?.isHeld == true) wifiLock?.release() }
        wifiLock = null
    }

    companion object {
        const val ACTION_START = "com.neshastyar.app.upload.START"
        const val EXTRA_DRAFT_ID = "draftId"
        const val EXTRA_TAG_IDS = "tagIds"
        const val EXTRA_PARTICIPANT_IDS = "participantIds"
        private const val CHANNEL_ID = "upload_meeting"
        private const val NOTIFICATION_ID = 1002
        private const val MAX_LOCK_MS = 60L * 60L * 1000L

        fun start(context: Context, draftId: String, tagIds: List<String>, participantIds: List<String>) {
            val intent = Intent(context, UploadForegroundService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_DRAFT_ID, draftId)
                putStringArrayListExtra(EXTRA_TAG_IDS, ArrayList(tagIds))
                putStringArrayListExtra(EXTRA_PARTICIPANT_IDS, ArrayList(participantIds))
            }
            androidx.core.content.ContextCompat.startForegroundService(context, intent)
        }
    }
}
