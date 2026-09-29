package com.neshastyar.app.recording

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import com.neshastyar.app.data.repository.DraftRepository

/**
 * One process-wide listener. Each open record screen used to insert its own row
 * for the same file, so one recording appeared twice and deleting either row
 * removed the audio.
 */
@Singleton
class RecordingDraftWriter @Inject constructor(
    private val controller: RecordingController,
    private val draftRepository: DraftRepository,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var started = false

    fun start() {
        if (started) return
        started = true
        scope.launch {
            var lastPhase = RecorderPhase.Idle
            controller.state.collect { state ->
                val prev = lastPhase
                lastPhase = state.phase
                if (prev == RecorderPhase.Idle || state.phase != RecorderPhase.Idle) return@collect
                val path = state.outputPath
                if (!path.isNullOrBlank() && state.error == null) {
                    val draft = draftRepository.ensureActiveDraft()
                    val sec = ((state.elapsedMs + 500) / 1000L).toInt()
                    draftRepository.addRecordingFile(draft.id, path, sec)
                }
                controller.clearTerminalState()
            }
        }
    }
}
