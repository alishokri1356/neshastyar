package com.neshastyar.app.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import com.neshastyar.app.data.api.MeetingDto
import com.neshastyar.app.data.local.DraftStatus
import com.neshastyar.app.data.repository.AuthRepository
import com.neshastyar.app.data.repository.DraftRepository
import com.neshastyar.app.data.repository.MeetingsRepository
import com.neshastyar.app.data.repository.MeetingsResult
import com.neshastyar.app.recording.RecorderPhase
import com.neshastyar.app.recording.RecordingController
import com.neshastyar.app.util.JalaliDates
import java.util.Date

data class MeetingDateGroup(
    val label: String,
    val meetings: List<MeetingDto>,
)

data class LocalDraftUi(
    val id: String,
    val status: String,
    val title: String,
    val createdAt: Long,
)

data class HomeUiState(
    val name: String? = null,
    val email: String? = null,
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val error: String? = null,
    val groups: List<MeetingDateGroup> = emptyList(),
    val expanded: Set<String> = emptySet(),
    val loggedOut: Boolean = false,
    val totalCount: Int = 0,
    val todayCount: Int = 0,
    val analyzingCount: Int = 0,
    val localDraft: LocalDraftUi? = null,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val meetingsRepository: MeetingsRepository,
    private val authRepository: AuthRepository,
    private val draftRepository: DraftRepository,
    private val recordingController: RecordingController,
) : ViewModel() {
    private val _ui = MutableStateFlow(
        HomeUiState(
            name = authRepository.currentName(),
            email = authRepository.currentEmail(),
        ),
    )
    val ui: StateFlow<HomeUiState> = _ui.asStateFlow()

    private var loadJob: Job? = null

    init {
        load(initial = true)
        observeLocalDraft()
    }

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    private fun observeLocalDraft() {
        viewModelScope.launch {
            combine(draftRepository.observeLatestDraft(), recordingController.state) { draft, live ->
                draft to live.phase
            }.flatMapLatest { (draft, phase) ->
                if (draft == null) {
                    flowOf(null)
                } else {
                    draftRepository.observeFiles(draft.id).map { files ->
                        val visible = draft.status != DraftStatus.ON_RECORDING ||
                            files.isNotEmpty() ||
                            phase != RecorderPhase.Idle
                        if (!visible) {
                            null
                        } else {
                            LocalDraftUi(
                                id = draft.id,
                                status = draft.status,
                                title = draft.commentText.trim().ifBlank { "جلسه جدید" },
                                createdAt = draft.createdAt,
                            )
                        }
                    }
                }
            }.collect { card ->
                _ui.update { it.copy(localDraft = card) }
            }
        }
    }

    fun refresh() = load(initial = false)

    /** Reloads meeting status from the server without the pull-to-refresh indicator. */
    fun syncFromServer() {
        if (loadJob?.isActive == true) return
        load(initial = false, quiet = true)
    }

    fun toggleGroup(label: String) {
        _ui.update { state ->
            val next = state.expanded.toMutableSet()
            if (!next.add(label)) next.remove(label)
            state.copy(expanded = next)
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _ui.update { it.copy(loggedOut = true) }
        }
    }

    private fun load(initial: Boolean, quiet: Boolean = false) {
        loadJob = viewModelScope.launch {
            if (!quiet) {
                _ui.update {
                    it.copy(
                        loading = initial && it.groups.isEmpty(),
                        refreshing = !initial || it.groups.isNotEmpty(),
                        error = null,
                    )
                }
            }
            when (val result = meetingsRepository.listRecent(50)) {
                is MeetingsResult.Ok -> {
                    val groups = groupMeetings(result.data)
                    val expanded = when {
                        _ui.value.expanded.isNotEmpty() -> _ui.value.expanded
                        groups.isNotEmpty() -> setOf(groups.first().label)
                        else -> emptySet()
                    }
                    val todayLabel = JalaliDates.groupLabel(Date())
                    val todayCount = groups.find { it.label == todayLabel }?.meetings?.size
                        ?: result.data.count { m ->
                            val d = JalaliDates.parseApiDate(m.meeting_date)
                                ?: JalaliDates.parseApiDate(m.created_at)
                            d != null && JalaliDates.groupLabel(d) == todayLabel
                        }
                    val analyzing = result.data.count { m ->
                        val s = m.status.orEmpty()
                        s == "On Process" || s == "ارسال درخواست پردازش" ||
                            s == "آماده پردازش" || s == "در حال پردازش" || s == "در حال تحلیل"
                    }
                    _ui.update {
                        it.copy(
                            loading = false,
                            refreshing = false,
                            groups = groups,
                            expanded = expanded,
                            error = null,
                            totalCount = result.data.size,
                            todayCount = todayCount,
                            analyzingCount = analyzing,
                        )
                    }
                }
                is MeetingsResult.Err -> {
                    _ui.update {
                        it.copy(
                            loading = false,
                            refreshing = false,
                            error = if (quiet && it.groups.isNotEmpty()) null else result.message,
                        )
                    }
                }
            }
        }
    }

    private fun groupMeetings(meetings: List<MeetingDto>): List<MeetingDateGroup> {
        val sorted = meetings.sortedByDescending { m ->
            JalaliDates.parseApiDate(m.created_at)?.time
                ?: JalaliDates.parseApiDate(m.meeting_date)?.time
                ?: 0L
        }
        val map = linkedMapOf<String, MutableList<MeetingDto>>()
        for (meeting in sorted) {
            val date = JalaliDates.parseApiDate(meeting.meeting_date)
                ?: JalaliDates.parseApiDate(meeting.created_at)
                ?: Date()
            val label = JalaliDates.groupLabel(date)
            map.getOrPut(label) { mutableListOf() }.add(meeting)
        }
        return map.map { (label, list) -> MeetingDateGroup(label, list) }
    }
}