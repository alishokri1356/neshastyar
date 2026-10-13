package com.neshastyar.app.ui.screens.tags

import android.content.Context
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.work.WorkManager
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import com.neshastyar.app.data.api.ParticipantDto
import com.neshastyar.app.data.api.TagDto
import com.neshastyar.app.data.repository.ParticipantsRepository
import com.neshastyar.app.data.repository.TagsRepository
import com.neshastyar.app.upload.CreateMeetingWorker
import com.neshastyar.app.upload.UploadForegroundService
import com.neshastyar.app.upload.UploadProgressHub

data class TagSelectionUiState(
    val tags: List<TagDto> = emptyList(),
    val participants: List<ParticipantDto> = emptyList(),
    val selected: Set<String> = emptySet(),
    val selectedParticipants: Set<String> = emptySet(),
    val loading: Boolean = true,
    val uploading: Boolean = false,
    val progress: Int = 0,
    val progressMessage: String = "",
    val fileIndex: Int = 0,
    val fileCount: Int = 0,
    val error: String? = null,
    val newTagName: String = "",
    val meetingId: String? = null,
    val done: Boolean = false,
)

@HiltViewModel
class TagSelectionViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val tagsRepository: TagsRepository,
    private val participantsRepository: ParticipantsRepository,
    private val uploadProgressHub: UploadProgressHub,
    @ApplicationContext private val context: Context,
) : ViewModel() {
    val draftId: String = checkNotNull(savedStateHandle["draftId"])

    private val _ui = MutableStateFlow(TagSelectionUiState())
    val ui: StateFlow<TagSelectionUiState> = _ui.asStateFlow()

    init {
        refresh()
        WorkManager.getInstance(context).cancelUniqueWork(CreateMeetingWorker.UNIQUE_PREFIX + draftId)
        viewModelScope.launch {
            uploadProgressHub.session.collect { session ->
                if (session == null || session.draftId != draftId) return@collect
                _ui.update {
                    it.copy(
                        uploading = session.uploading,
                        progress = session.progress,
                        progressMessage = session.message,
                        fileIndex = session.fileIndex,
                        fileCount = session.fileCount,
                        error = session.error,
                        meetingId = session.meetingId ?: it.meetingId,
                        done = session.done,
                    )
                }
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            val tagsResult = tagsRepository.list()
            val peopleResult = participantsRepository.list()
            _ui.update {
                it.copy(
                    loading = false,
                    tags = tagsResult.getOrDefault(emptyList()),
                    participants = peopleResult.getOrNull()?.participants.orEmpty(),
                    error = tagsResult.exceptionOrNull()?.message
                        ?: peopleResult.exceptionOrNull()?.message,
                )
            }
        }
    }

    fun selectTag(tagId: String) {
        _ui.update { it.copy(selected = it.selected + tagId) }
    }

    fun selectParticipant(participantId: String) {
        _ui.update { it.copy(selectedParticipants = it.selectedParticipants + participantId) }
    }

    fun removeTag(tagId: String) {
        _ui.update { it.copy(selected = it.selected - tagId) }
    }

    fun removeParticipant(participantId: String) {
        _ui.update { it.copy(selectedParticipants = it.selectedParticipants - participantId) }
    }

    fun onNewTagName(v: String) = _ui.update { it.copy(newTagName = v) }

    fun addFromQuery() {
        val name = _ui.value.newTagName.trim()
        if (name.isEmpty() || _ui.value.uploading) return
        val query = normalizeCatalogQuery(name)
        val tag = _ui.value.tags.find { normalizeCatalogQuery(it.name?.takeIf { n -> n.isNotBlank() } ?: it.id) == query }
        val person = _ui.value.participants.find {
            normalizeCatalogQuery(it.name?.takeIf { n -> n.isNotBlank() } ?: it.id) == query
        }
        when {
            tag != null && person != null -> _ui.update {
                it.copy(
                    selected = it.selected + tag.id,
                    selectedParticipants = it.selectedParticipants + person.id,
                    newTagName = "",
                )
            }
            tag != null -> _ui.update { it.copy(selected = it.selected + tag.id, newTagName = "") }
            person != null -> _ui.update {
                it.copy(selectedParticipants = it.selectedParticipants + person.id, newTagName = "")
            }
            else -> createTag()
        }
    }

    fun createTag() {
        val name = _ui.value.newTagName.trim()
        if (name.isEmpty()) return
        viewModelScope.launch {
            tagsRepository.create(name).fold(
                onSuccess = { tag ->
                    _ui.update {
                        it.copy(
                            tags = (it.tags + tag).distinctBy { t -> t.id },
                            selected = it.selected + tag.id,
                            newTagName = "",
                        )
                    }
                },
                onFailure = { e -> _ui.update { it.copy(error = e.message) } },
            )
        }
    }

    fun upload() {
        if (_ui.value.uploading) return
        val tagIds = _ui.value.selected.toList()
        val participantIds = _ui.value.selectedParticipants.toList()
        _ui.update {
            it.copy(
                uploading = true,
                error = null,
                progress = 0,
                progressMessage = "شروع آپلود…",
                done = false,
            )
        }
        WorkManager.getInstance(context).cancelUniqueWork(CreateMeetingWorker.UNIQUE_PREFIX + draftId)
        try {
            UploadForegroundService.start(context, draftId, tagIds, participantIds)
        } catch (error: Exception) {
            _ui.update {
                it.copy(
                    uploading = false,
                    error = error.message ?: "آپلود ناموفق",
                    progressMessage = "",
                )
            }
        }
    }
}

internal fun normalizeCatalogQuery(value: String): String {
    return value.trim()
        .replace('ي', 'ی')
        .replace('ك', 'ک')
        .replace("\u200c", "")
        .lowercase()
}
