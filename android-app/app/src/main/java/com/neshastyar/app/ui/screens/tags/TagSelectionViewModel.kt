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
import com.neshastyar.app.data.local.DraftSelectionStore
import com.neshastyar.app.data.local.DraftStatus
import com.neshastyar.app.data.repository.DraftRepository
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
    private val draftRepository: DraftRepository,
    private val uploadProgressHub: UploadProgressHub,
    @ApplicationContext private val context: Context,
) : ViewModel() {
    val draftId: String = checkNotNull(savedStateHandle["draftId"])

    private val _ui = MutableStateFlow(TagSelectionUiState())
    val ui: StateFlow<TagSelectionUiState> = _ui.asStateFlow()

    init {
        refresh()
        viewModelScope.launch { markTagSelectionUnlessUploading() }
        WorkManager.getInstance(context).cancelUniqueWork(CreateMeetingWorker.UNIQUE_PREFIX + draftId)
        viewModelScope.launch {
            uploadProgressHub.session.collect { session ->
                if (session == null || session.draftId != draftId) return@collect
                if (!session.uploading && session.error != null) {
                    draftRepository.setStatus(draftId, DraftStatus.ON_TAG_SELECTION)
                }
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

    private suspend fun markTagSelectionUnlessUploading() {
        val draft = draftRepository.getDraft(draftId) ?: return
        val session = uploadProgressHub.session.value
        val uploading = draft.status == DraftStatus.ON_UPLOADING &&
            session?.draftId == draftId &&
            session.uploading &&
            session.error == null &&
            !session.done
        if (!uploading) {
            draftRepository.setStatus(draftId, DraftStatus.ON_TAG_SELECTION)
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            val tagsResult = tagsRepository.list()
            val peopleResult = participantsRepository.list()
            val (savedTags, savedPeople) = DraftSelectionStore.load(context, draftId)
            _ui.update { current ->
                val tags = tagsResult.getOrDefault(emptyList())
                val people = peopleResult.getOrNull()?.participants.orEmpty()
                current.copy(
                    loading = false,
                    tags = tags,
                    participants = people,
                    selected = (current.selected + savedTags).intersect(tags.map { tag -> tag.id }.toSet()),
                    selectedParticipants = (current.selectedParticipants + savedPeople)
                        .intersect(people.map { person -> person.id }.toSet()),
                    error = tagsResult.exceptionOrNull()?.message
                        ?: peopleResult.exceptionOrNull()?.message,
                )
            }
        }
    }

    fun selectTag(tagId: String) {
        _ui.update { it.copy(selected = it.selected + tagId, newTagName = "") }
        persistSelection()
    }

    fun selectParticipant(participantId: String) {
        _ui.update { it.copy(selectedParticipants = it.selectedParticipants + participantId, newTagName = "") }
        persistSelection()
    }

    fun removeTag(tagId: String) {
        _ui.update { it.copy(selected = it.selected - tagId) }
        persistSelection()
    }

    fun removeParticipant(participantId: String) {
        _ui.update { it.copy(selectedParticipants = it.selectedParticipants - participantId) }
        persistSelection()
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
            else -> {
                createTag()
                return
            }
        }
        persistSelection()
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
                    persistSelection()
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
        viewModelScope.launch { draftRepository.setStatus(draftId, DraftStatus.ON_UPLOADING) }
        try {
            UploadForegroundService.start(context, draftId, tagIds, participantIds)
        } catch (error: Exception) {
            viewModelScope.launch { draftRepository.setStatus(draftId, DraftStatus.ON_TAG_SELECTION) }
            _ui.update {
                it.copy(
                    uploading = false,
                    error = error.message ?: "آپلود ناموفق",
                    progressMessage = "",
                )
            }
        }
    }

    private fun persistSelection() {
        val state = _ui.value
        DraftSelectionStore.save(context, draftId, state.selected, state.selectedParticipants)
    }
}

internal fun normalizeCatalogQuery(value: String): String {
    return value.trim()
        .replace('ي', 'ی')
        .replace('ك', 'ک')
        .replace("\u200c", "")
        .lowercase()
}
