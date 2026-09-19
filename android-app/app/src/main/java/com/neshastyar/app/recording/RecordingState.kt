package com.neshastyar.app.recording

enum class RecorderPhase {
    Idle,
    Recording,
    Paused,
}

data class LiveRecordingState(
    val phase: RecorderPhase = RecorderPhase.Idle,
    val elapsedMs: Long = 0L,
    val outputPath: String? = null,
    val error: String? = null,
)