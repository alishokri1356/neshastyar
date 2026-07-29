package com.neshastyar.app.ui.screens.tags

import android.content.Context
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkInfo
import androidx.work.WorkManager
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import com.neshastyar.app.data.api.TagDto
import com.neshastyar.app.data.repository.TagsRepository
import com.neshastyar.app.upload.CreateMeetingWorker

data class TagSelectionUiState(
    val tags: List<TagDto> = emptyList(),
    val selected: Set<String> = emptySet(),
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
            tagsRepository.list().fold(
                onSuccess = { list -> _ui.update { it.copy(loading = false, tags = list) } },
                onFailure = { e -> _ui.update { it.copy(loading = false, error = e.message) } },
            )
        }
    }

    fun toggle(tagId: String) {
        _ui.update { state ->
            val next = state.selected.toMutableSet()
            if (!next.add(tagId)) next.remove(tagId)
            state.copy(selected = next)
        }
    }

    fun onNewTagName(v: String) = _ui.update { it.copy(newTagName = v) }

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
        val input = Data.Builder()
            .putString(CreateMeetingWorker.KEY_DRAFT_ID, draftId)
            .putStringArray(CreateMeetingWorker.KEY_TAG_IDS, selected as Array<String?>)
            .build()
        val request = OneTimeWorkRequestBuilder<CreateMeetingWorker>()
            .setInputData(input)
            .setConstraints(
                Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build(),
            )
            .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            CreateMeetingWorker.UNIQUE_PREFIX + draftId,
            ExistingWorkPolicy.REPLACE,
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
