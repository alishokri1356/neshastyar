package com.neshastyar.app.recording

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import dagger.hilt.android.AndroidEntryPoint
import java.io.File
import javax.inject.Inject
import com.neshastyar.app.MainActivity
import com.neshastyar.app.R

@AndroidEntryPoint
class RecordingForegroundService : Service() {

    @Inject lateinit var controller: RecordingController

    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null
    private var recording = false
    private var paused = false
    private var segmentStartedElapsed: Long = 0L
    private var accumulatedMs: Long = 0L

    private var audioManager: AudioManager? = null
    private var focusRequest: AudioFocusRequest? = null

    private val handler = Handler(Looper.getMainLooper())
    private val tickRunnable = object : Runnable {
        override fun run() {
            if (recording && !paused) {
                controller.tick()
                updateNotification()
                handler.postDelayed(this, 1000L)
            }
        }
    }

    private val focusChangeListener = AudioManager.OnAudioFocusChangeListener { change ->
        when (change) {
            AudioManager.AUDIOFOCUS_LOSS,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
            -> {
                if (recording && !paused) pauseInternal()
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startRecording()
            ACTION_PAUSE -> pauseInternal()
            ACTION_RESUME -> resumeInternal()
            ACTION_STOP -> stopRecording(error = null)
            else -> Unit
        }
        return START_STICKY
    }

    override fun onDestroy() {
        handler.removeCallbacks(tickRunnable)
        releaseRecorderQuietly()
        abandonFocus()
        super.onDestroy()
    }

    private fun startRecording() {
        if (recording) return
        ensureChannel()
        val file = File(filesDir, "recordings").apply { mkdirs() }.let { dir ->
            File(dir, "rec-${System.currentTimeMillis()}.m4a")
        }
        outputFile = file

        try {
            requestFocus()
            val mr = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(this)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }
            mr.setAudioSource(MediaRecorder.AudioSource.MIC)
            mr.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            mr.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            mr.setAudioEncodingBitRate(128_000)
            mr.setAudioSamplingRate(44_100)
            mr.setOutputFile(file.absolutePath)
            mr.prepare()
            mr.start()
            recorder = mr
            recording = true
            paused = false
            accumulatedMs = 0L
            segmentStartedElapsed = SystemClock.elapsedRealtime()
            controller.onRecordingStarted(file.absolutePath)
            startAsForeground()
            handler.removeCallbacks(tickRunnable)
            handler.post(tickRunnable)
        } catch (e: Exception) {
            releaseRecorderQuietly()
            recording = false
            controller.onStopped(null, 0L, e.message ?: "شروع ضبط ناموفق بود")
            stopSelf()
        }
    }

    private fun pauseInternal() {
        val mr = recorder ?: return
        if (!recording || paused) return
        try {
            mr.pause()
            accumulatedMs += SystemClock.elapsedRealtime() - segmentStartedElapsed
            paused = true
            handler.removeCallbacks(tickRunnable)
            controller.onPaused()
            updateNotification()
        } catch (e: Exception) {
            stopRecording(e.message)
        }
    }

    private fun resumeInternal() {
        val mr = recorder ?: return
        if (!recording || !paused) return
        try {
            mr.resume()
            paused = false
            segmentStartedElapsed = SystemClock.elapsedRealtime()
            controller.onResumed()
            handler.removeCallbacks(tickRunnable)
            handler.post(tickRunnable)
            updateNotification()
        } catch (e: Exception) {
            stopRecording(e.message)
        }
    }

    private fun stopRecording(error: String?) {
        handler.removeCallbacks(tickRunnable)
        var duration = accumulatedMs
        if (recording && !paused) {
            duration += SystemClock.elapsedRealtime() - segmentStartedElapsed
        }
        try {
            recorder?.apply {
                stop()
                release()
            }
        } catch (_: Exception) {
        } finally {
            recorder = null
        }
        recording = false
        paused = false
        abandonFocus()
        val path = outputFile?.absolutePath
        // Drop tiny/failed files
        val file = outputFile
        if (file != null && (!file.exists() || file.length() < 256L)) {
            file.delete()
            controller.onStopped(null, 0L, error ?: "فایل ضبط خالی بود")
        } else {
            controller.onStopped(path, duration.coerceAtLeast(0L), error)
        }
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun startAsForeground() {
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun updateNotification() {
        val nm = getSystemService(NotificationManager::class.java) ?: return
        nm.notify(NOTIFICATION_ID, buildNotification())
    }

    private fun buildNotification(): Notification {
        val openApp = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val pauseResumeAction = if (paused) {
            NotificationCompat.Action(
                0,
                getString(R.string.recording_action_resume),
                servicePending(ACTION_RESUME, 2),
            )
        } else {
            NotificationCompat.Action(
                0,
                getString(R.string.recording_action_pause),
                servicePending(ACTION_PAUSE, 1),
            )
        }
        val stopAction = NotificationCompat.Action(
            0,
            getString(R.string.recording_action_stop),
            servicePending(ACTION_STOP, 3),
        )
        val title = if (paused) {
            getString(R.string.recording_notification_paused)
        } else {
            getString(R.string.recording_notification_title)
        }
        val elapsed = controller.currentElapsedMs()
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(formatElapsed(elapsed))
            .setSmallIcon(R.drawable.ic_launcher)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(openApp)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .addAction(pauseResumeAction)
            .addAction(stopAction)
            .build()
    }

    private fun servicePending(action: String, requestCode: Int): PendingIntent {
        val intent = Intent(this, RecordingForegroundService::class.java).setAction(action)
        return PendingIntent.getService(
            this,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NotificationManager::class.java) ?: return
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.recording_channel_name),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = getString(R.string.recording_channel_desc)
            setShowBadge(false)
        }
        nm.createNotificationChannel(channel)
    }

    private fun requestFocus() {
        audioManager = getSystemService(AUDIO_SERVICE) as AudioManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build(),
                )
                .setOnAudioFocusChangeListener(focusChangeListener)
                .build()
            focusRequest = req
            audioManager?.requestAudioFocus(req)
        } else {
            @Suppress("DEPRECATION")
            audioManager?.requestAudioFocus(
                focusChangeListener,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN,
            )
        }
    }

    private fun abandonFocus() {
        val am = audioManager ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest?.let { am.abandonAudioFocusRequest(it) }
        } else {
            @Suppress("DEPRECATION")
            am.abandonAudioFocus(focusChangeListener)
        }
        focusRequest = null
    }

    private fun releaseRecorderQuietly() {
        try {
            recorder?.release()
        } catch (_: Exception) {
        }
        recorder = null
    }

    private fun formatElapsed(ms: Long): String {
        val totalSec = (ms / 1000L).toInt().coerceAtLeast(0)
        val m = totalSec / 60
        val s = totalSec % 60
        return "%d:%02d".format(m, s)
    }

    companion object {
        const val ACTION_START = "com.neshastyar.app.recording.START"
        const val ACTION_PAUSE = "com.neshastyar.app.recording.PAUSE"
        const val ACTION_RESUME = "com.neshastyar.app.recording.RESUME"
        const val ACTION_STOP = "com.neshastyar.app.recording.STOP"
        private const val CHANNEL_ID = "recording_mic"
        private const val NOTIFICATION_ID = 1001
    }
}