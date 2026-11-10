package com.neshastyar.app.recording

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import android.os.ParcelFileDescriptor
import java.io.File

/** Short voice clips for dictation: 16 kHz mono AAC in an .m4a file under the cache dir. */
class DictationRecorder(private val context: Context) {
    private var recorder: MediaRecorder? = null
    private var pfd: ParcelFileDescriptor? = null
    private var file: File? = null

    val isRecording: Boolean get() = recorder != null

    fun start(onMaxDurationReached: () -> Unit) {
        cancel()
        val out = File(context.cacheDir, "dictation-${System.currentTimeMillis()}.m4a")
        val descriptor = ParcelFileDescriptor.open(
            out,
            ParcelFileDescriptor.MODE_READ_WRITE or
                ParcelFileDescriptor.MODE_CREATE or
                ParcelFileDescriptor.MODE_TRUNCATE,
        )
        val mr = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(context)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }
        try {
            mr.setAudioSource(MediaRecorder.AudioSource.MIC)
            mr.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            mr.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            mr.setAudioChannels(1)
            mr.setAudioSamplingRate(16_000)
            mr.setAudioEncodingBitRate(32_000)
            mr.setMaxDuration(MAX_DURATION_MS)
            mr.setOnInfoListener { _, what, _ ->
                if (what == MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED) onMaxDurationReached()
            }
            mr.setOutputFile(descriptor.fileDescriptor)
            mr.prepare()
            mr.start()
        } catch (e: Exception) {
            mr.release()
            runCatching { descriptor.close() }
            out.delete()
            throw e
        }
        recorder = mr
        pfd = descriptor
        file = out
    }

    /** Stops recording and returns the clip, or null when nothing usable was captured. */
    fun stop(): File? {
        val mr = recorder ?: return null
        recorder = null
        // MediaRecorder.stop() throws when almost no audio was captured.
        val stopped = runCatching { mr.stop() }.isSuccess
        mr.release()
        closeDescriptor()
        val out = file
        file = null
        if (!stopped || out == null || out.length() == 0L) {
            out?.delete()
            return null
        }
        return out
    }

    fun cancel() {
        recorder?.let { mr ->
            runCatching { mr.stop() }
            mr.release()
        }
        recorder = null
        closeDescriptor()
        file?.delete()
        file = null
    }

    private fun closeDescriptor() {
        runCatching { pfd?.close() }
        pfd = null
    }

    companion object {
        const val MAX_DURATION_MS = 120_000
    }
}
