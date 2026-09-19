package com.neshastyar.app.recording

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

@Singleton
class RecordingController @Inject constructor(
    @ApplicationContext private val appContext: Context,
) {
    private val _state = MutableStateFlow(LiveRecordingState())
    val state: StateFlow<LiveRecordingState> = _state.asStateFlow()

    @Volatile private var startedAtElapsedRealtime: Long = 0L
    @Volatile private var accumulatedMs: Long = 0L

    fun startService() {
        val intent = Intent(appContext, RecordingForegroundService::class.java).apply {
            action = RecordingForegroundService.ACTION_START
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            appContext.startForegroundService(intent)
        } else {
            appContext.startService(intent)
        }
    }

    fun pause() = send(RecordingForegroundService.ACTION_PAUSE)
    fun resume() = send(RecordingForegroundService.ACTION_RESUME)
    fun stop() = send(RecordingForegroundService.ACTION_STOP)

    fun onRecordingStarted(path: String) {
        startedAtElapsedRealtime = SystemClock.elapsedRealtime()
        accumulatedMs = 0L
        _state.value = LiveRecordingState(
            phase = RecorderPhase.Recording,
            elapsedMs = 0L,
            outputPath = path,
        )
    }

    fun onPaused() {
        accumulatedMs += (SystemClock.elapsedRealtime() - startedAtElapsedRealtime).coerceAtLeast(0L)
        _state.update { it.copy(phase = RecorderPhase.Paused, elapsedMs = accumulatedMs) }
    }

    fun onResumed() {
        startedAtElapsedRealtime = SystemClock.elapsedRealtime()
        _state.update { it.copy(phase = RecorderPhase.Recording, elapsedMs = accumulatedMs) }
    }

    fun tick() {
        val current = _state.value
        if (current.phase != RecorderPhase.Recording) return
        val elapsed = accumulatedMs + (SystemClock.elapsedRealtime() - startedAtElapsedRealtime)
        _state.update { it.copy(elapsedMs = elapsed) }
    }

    fun onStopped(finalPath: String?, durationMs: Long, error: String? = null) {
        startedAtElapsedRealtime = 0L
        accumulatedMs = 0L
        _state.value = LiveRecordingState(
            phase = RecorderPhase.Idle,
            elapsedMs = durationMs,
            outputPath = finalPath,
            error = error,
        )
    }

    fun clearTerminalState() {
        _state.value = LiveRecordingState()
    }

    fun currentElapsedMs(): Long {
        val current = _state.value
        return if (current.phase == RecorderPhase.Recording) {
            accumulatedMs + (SystemClock.elapsedRealtime() - startedAtElapsedRealtime)
        } else {
            current.elapsedMs
        }
    }

    private fun send(action: String) {
        val intent = Intent(appContext, RecordingForegroundService::class.java).apply {
            this.action = action
        }
        appContext.startService(intent)
    }
}