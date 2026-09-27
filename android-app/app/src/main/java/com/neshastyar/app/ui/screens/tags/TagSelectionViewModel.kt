package com.neshastyar.app.ui.screens.tags

import android.content.Context
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkInfo
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit
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

data class TagSelectionUiState(
    val tags: List<TagDto> = emptyList(),
    val participants: List<ParticipantDto> = emptyList(),
    val selected: Set<String> = emptySet(),
    val selectedParticipants: Set<String> = emptySet(),
    val loading: Boolean = true,
    val uploading: Boolean = false,
    val progress: Int = 0,
    val progressMessage: String = "",
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
    @ApplicationContext private val context: Context,
) : ViewModel() {
    val draftId: String = checkNotNull(savedStateHandle["draftId"])

    private val _ui = MutableStateFlow(TagSelectionUiState())
    val ui: StateFlow<TagSelectionUiState> = _ui.asStateFlow()

    /** Only react to WorkManager terminal states after this screen enqueues an upload. */
    private var uploadRequested = false

    init {
        refresh()
        viewModelScope.launch {
            WorkManager.getInstance(context)
                .getWorkInfosForUniqueWorkFlow(CreateMeetingWorker.UNIQUE_PREFIX + draftId)
                .collect { infos ->
                    val info = infos.firstOrNull() ?: return@collect
                    val progress = info.progress.getInt(CreateMeetingWorker.KEY_PROGRESS, 0)
                    val message = info.progress.getString(CreateMeetingWorker.KEY_PROGRESS_MESSAGE).orEmpty()
                    when (info.state) {
                        WorkInfo.State.ENQUEUED -> {
                            if (!uploadRequested && !_ui.value.uploading) return@collect
                            _ui.update {
                                it.copy(
                                    uploading = true,
                                    error = null,
                                    progress = progress.coerceAtLeast(it.progress),
                                    progressMessage = message.ifBlank { "در انتظار شبکه…" },
                                )
                            }
                        }
                        WorkInfo.State.RUNNING -> {
                            if (!uploadRequested && !_ui.value.uploading) return@collect
                            _ui.update {
                                it.copy(
                                    uploading = true,
                                    error = null,
                                    progress = progress.coerceAtLeast(0),
                                    progressMessage = message.ifBlank { "در حال آپلود…" },
                                )
                            }
                        }
                        WorkInfo.State.SUCCEEDED -> {
                            // Ignore leftover success from a previous session for this reused draft id.
                            if (!uploadRequested) return@collect
                            val meetingId = info.outputData.getString(CreateMeetingWorker.KEY_MEETING_ID)
                            _ui.update {
                                it.copy(
                                    uploading = false,
                                    done = true,
                                    meetingId = meetingId,
                                    progress = 100,
                                    progressMessage = "آپلود کامل شد",
                                )
                            }
                        }
                        WorkInfo.State.FAILED -> {
                            if (!uploadRequested) return@collect
                            val err = info.outputData.getString(CreateMeetingWorker.KEY_ERROR) ?: "آپلود ناموفق"
                            _ui.update {
                                it.copy(
                                    uploading = false,
                                    error = err,
                                    progressMessage = "",
                                )
                            }
                        }
                        WorkInfo.State.CANCELLED -> {
                            if (!uploadRequested) return@collect
                            _ui.update {
                                it.copy(
                                    uploading = false,
                                    error = "آپلود لغو شد",
                                    progressMessage = "",
                                )
                            }
                        }
                        else -> Unit
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
        uploadRequested = true
        val selected = _ui.value.selected.toTypedArray()
        val participants = _ui.value.selectedParticipants.toTypedArray()
        val input = Data.Builder()
            .putString(CreateMeetingWorker.KEY_DRAFT_ID, draftId)
            .putStringArray(CreateMeetingWorker.KEY_TAG_IDS, selected as Array<String?>)
            .putStringArray(CreateMeetingWorker.KEY_PARTICIPANT_IDS, participants as Array<String?>)
            .build()
        val request = OneTimeWorkRequestBuilder<CreateMeetingWorker>()
            .setInputData(input)
            .setConstraints(
                Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build(),
            )
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
            .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            CreateMeetingWorker.UNIQUE_PREFIX + draftId,
            ExistingWorkPolicy.KEEP,
            request,
        )
        _ui.update {
            it.copy(
                uploading = true,
                error = null,
                progress = 0,
                progressMessage = "شروع آپلود…",
                done = false,
            )
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
