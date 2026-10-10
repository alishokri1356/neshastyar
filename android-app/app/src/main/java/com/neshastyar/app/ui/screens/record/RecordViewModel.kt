package com.neshastyar.app.ui.screens.record

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import com.neshastyar.app.data.local.DraftAudioFileEntity
import com.neshastyar.app.data.local.DraftStatus
import com.neshastyar.app.data.repository.DraftRepository
import com.neshastyar.app.recording.LiveRecordingState
import com.neshastyar.app.recording.RecorderPhase
import com.neshastyar.app.recording.RecordingController

data class RecordUiState(
    val draftId: String? = null,
    val comment: String = "",
    val ready: Boolean = false,
    val resumeDraftId: String? = null,
    val message: String? = null,
    val error: String? = null,
)

@HiltViewModel
class RecordViewModel @Inject constructor(
    private val draftRepository: DraftRepository,
    private val recordingController: RecordingController,
) : ViewModel() {

    private val _ui = MutableStateFlow(RecordUiState())
    val ui: StateFlow<RecordUiState> = _ui.asStateFlow()

    val liveRecording: StateFlow<LiveRecordingState> = recordingController.state

    private val draftIdFlow = MutableStateFlow<String?>(null)

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    val files: StateFlow<List<DraftAudioFileEntity>> = draftIdFlow
        .flatMapLatest { id ->
            if (id == null) flowOf(emptyList()) else draftRepository.observeFiles(id)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private var lastPhase: RecorderPhase = RecorderPhase.Idle
    private var deferRecordingStatus = true

    init {
        viewModelScope.launch {
            val draft = draftRepository.ensureActiveDraft()
            draftIdFlow.value = draft.id
            draftRepository.recoverOrphanRecordings(draft.id)
            draftRepository.pruneDraftFiles(draft.id)
            val resume = draft.status == DraftStatus.ON_TAG_SELECTION ||
                draft.status == DraftStatus.ON_UPLOADING
            if (!resume) {
                draftRepository.setStatus(draft.id, DraftStatus.ON_RECORDING)
            }
            _ui.update {
                it.copy(
                    draftId = draft.id,
                    comment = draft.commentText,
                    ready = true,
                    resumeDraftId = if (resume) draft.id else null,
                )
            }
            deferRecordingStatus = false
        }
        viewModelScope.launch {
            recordingController.state.collect { state ->
                val prev = lastPhase
                lastPhase = state.phase
                if (prev != RecorderPhase.Idle && state.phase == RecorderPhase.Idle && state.error != null) {
                    _ui.update { it.copy(error = state.error) }
                }
            }
        }
        viewModelScope.launch {
            files.collect { list ->
                val draftId = list.firstOrNull()?.draftId ?: draftIdFlow.value ?: return@collect
                withContext(Dispatchers.IO) {
                    draftRepository.pruneDraftFiles(draftId)
                }
            }
        }
    }

    fun onRecordingPageVisible() {
        if (deferRecordingStatus || _ui.value.resumeDraftId != null) return
        val id = draftIdFlow.value ?: return
        viewModelScope.launch { draftRepository.setStatus(id, DraftStatus.ON_RECORDING) }
    }

    fun consumeResume() {
        _ui.update { it.copy(resumeDraftId = null) }
    }

    fun markTagSelection() {
        val id = draftIdFlow.value ?: return
        viewModelScope.launch { draftRepository.setStatus(id, DraftStatus.ON_TAG_SELECTION) }
    }

    fun onComment(value: String) {
        _ui.update { it.copy(comment = value) }
        val id = draftIdFlow.value ?: return
        viewModelScope.launch { draftRepository.updateComment(id, value) }
    }

    fun startRecording() {
        _ui.update { it.copy(error = null, message = null) }
        recordingController.startService()
    }

    fun pauseRecording() = recordingController.pause()
    fun resumeRecording() = recordingController.resume()
    fun stopRecording() = recordingController.stop()

    fun importUris(uris: List<Uri>) {
        val draftId = draftIdFlow.value ?: return
        viewModelScope.launch {
            uris.forEach { uri ->
                draftRepository.importUri(draftId, uri)
                    .onFailure { e ->
                        _ui.update { it.copy(error = e.message ?: "ورود فایل ناموفق بود") }
                    }
                    .onSuccess {
                        _ui.update { it.copy(message = "فایل اضافه شد") }
                    }
            }
        }
    }

    fun deleteFile(file: DraftAudioFileEntity) {
        val active = liveRecording.value
        if (active.phase != RecorderPhase.Idle && active.outputPath == file.localPath) return
        viewModelScope.launch { draftRepository.deleteFile(file) }
    }

    fun clearMessage() = _ui.update { it.copy(message = null, error = null) }

    fun canContinue(files: List<DraftAudioFileEntity>): Boolean =
        files.isNotEmpty() && liveRecording.value.phase == RecorderPhase.Idle
}