package com.neshastyar.app.ui.screens.meeting

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import com.neshastyar.app.data.api.MeetingDto
import com.neshastyar.app.data.api.ParticipantDto
import com.neshastyar.app.data.api.ParticipantsListResponse
import com.neshastyar.app.data.api.TagDto
import com.neshastyar.app.data.api.UpdateMeetingRequest
import com.neshastyar.app.data.repository.MeetingsRepository
import com.neshastyar.app.data.repository.MeetingsResult
import com.neshastyar.app.data.repository.ParticipantsRepository
import com.neshastyar.app.data.repository.TagsRepository
import com.neshastyar.app.util.MeetingSummaryParser
import com.neshastyar.app.util.ParsedMeetingSummary
import com.neshastyar.app.util.StatusStyle
import org.json.JSONArray
import org.json.JSONObject

data class MeetingDetailUiState(
    val loading: Boolean = true,
    val error: String? = null,
    val message: String? = null,
    val meeting: MeetingDto? = null,
    val summary: ParsedMeetingSummary = ParsedMeetingSummary(),
    val tags: List<TagDto> = emptyList(),
    val allTags: List<TagDto> = emptyList(),
    val participants: List<ParticipantDto> = emptyList(),
    val allParticipants: List<ParticipantDto> = emptyList(),
    val editTitle: String = "",
    val editSubject: String = "",
    val editSummaryText: String = "",
    val editing: Boolean = false,
    val reprocessing: Boolean = false,
    /** Hides leftover summary text after a reprocess request, until processing finishes. */
    val summarySuppressed: Boolean = false,
    /** Linked tags and participants have been fetched at least once. */
    val tagsReady: Boolean = false,
)

@HiltViewModel
class MeetingDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val meetingsRepository: MeetingsRepository,
    private val tagsRepository: TagsRepository,
    private val participantsRepository: ParticipantsRepository,
) : ViewModel() {
    private val meetingId: String = checkNotNull(savedStateHandle["meetingId"])
    private val _ui = MutableStateFlow(MeetingDetailUiState())
    val ui = _ui.asStateFlow()
    private var pollJob: Job? = null

    init {
        load(initial = true)
        startPolling()
    }

    fun retry() = load(initial = true)

    fun onTitle(v: String) = _ui.update { it.copy(editTitle = v) }
    fun onSubject(v: String) = _ui.update { it.copy(editSubject = v) }
    fun onSummaryText(v: String) = _ui.update { it.copy(editSummaryText = v) }

    fun startEditing() = _ui.update {
        it.copy(
            editing = true,
            editTitle = it.meeting?.title.orEmpty(),
            editSubject = it.summary.subject,
            editSummaryText = it.summary.summaryText,
            error = null,
        )
    }

    fun saveEditing() = viewModelScope.launch {
        if (!_ui.value.editing) return@launch
        val snapshot = _ui.value
        meetingsRepository.update(meetingId, UpdateMeetingRequest(title = snapshot.editTitle)).fold(
            onSuccess = { meeting ->
                _ui.update { it.copy(meeting = meeting, editTitle = meeting.title.orEmpty()) }
                saveSummaryAndFinish()
            },
            onFailure = { e -> _ui.update { it.copy(error = e.message) } },
        )
    }

    private suspend fun saveSummaryAndFinish() {
        val snapshot = _ui.value
        val json = JSONObject().apply {
            put("Subject", snapshot.editSubject)
            put("Summary", snapshot.editSummaryText)
            put("People in meetings", JSONArray(snapshot.summary.people))
            put("Bolet Points", JSONArray(snapshot.summary.bulletPoints))
            put("Tags", JSONArray(snapshot.summary.tags))
        }.toString()
        meetingsRepository.update(meetingId, UpdateMeetingRequest(summary = json)).fold(
            onSuccess = { meeting ->
                val parsed = MeetingSummaryParser.parse(meeting.summary, meeting.people)
                _ui.update {
                    it.copy(
                        meeting = meeting,
                        summary = parsed,
                        editing = false,
                        editSubject = parsed.subject,
                        editSummaryText = parsed.summaryText,
                        message = "ذخیره شد",
                        error = null,
                    )
                }
            },
            onFailure = { e -> _ui.update { it.copy(error = e.message) } },
        )
    }

    fun requestReprocess() = viewModelScope.launch {
        if (_ui.value.reprocessing) return@launch
        _ui.update { it.copy(reprocessing = true, error = null, message = null) }
        meetingsRepository.analyze(meetingId).fold(
            onSuccess = {
                _ui.update { current ->
                    current.copy(
                        reprocessing = false,
                        summarySuppressed = true,
                        message = "درخواست پردازش ارسال شد",
                        error = null,
                        summary = ParsedMeetingSummary(),
                        editSubject = "",
                        editSummaryText = "",
                        editing = false,
                        meeting = current.meeting?.copy(status = "ارسال درخواست پردازش"),
                    )
                }
            },
            onFailure = { e ->
                _ui.update {
                    it.copy(
                        reprocessing = false,
                        error = e.message ?: "درخواست پردازش ناموفق بود",
                    )
                }
            },
        )
    }

    fun sendEmail() = viewModelScope.launch {
        meetingsRepository.sendMail(meetingId).fold(
            onSuccess = { msg -> _ui.update { it.copy(message = msg, error = null) } },
            onFailure = { e -> _ui.update { it.copy(error = e.message) } },
        )
    }

    /** Subject, summary, and key points, in the same plain-text shape as the web app. */
    fun summaryClipboardText(): String? {
        val state = _ui.value
        val parts = buildList {
            val subject = state.editSubject.trim()
            if (subject.isNotEmpty()) add("موضوع:\n$subject")
            val summary = state.editSummaryText.trim()
            if (summary.isNotEmpty()) add("خلاصه:\n$summary")
            if (state.summary.bulletPoints.isNotEmpty()) {
                add("نکات کلیدی:\n" + state.summary.bulletPoints.joinToString("\n") { "• $it" })
            }
        }
        return parts.joinToString("\n\n").ifBlank { null }
    }

    fun noteCopied() = _ui.update {
        it.copy(message = "موضوع، خلاصه و نکات کلیدی کپی شد", error = null)
    }

    fun noteCopyEmpty() = _ui.update { it.copy(error = "خلاصه‌ای برای کپی وجود ندارد") }

    fun linkTag(tagId: String) = viewModelScope.launch {
        tagsRepository.link(meetingId, tagId).onSuccess { reloadMeta() }
            .onFailure { e -> _ui.update { it.copy(error = e.message) } }
    }

    fun addSuggestedTag(name: String) = viewModelScope.launch {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return@launch
        val existing = _ui.value.allTags.firstOrNull {
            it.name.orEmpty().trim().equals(trimmed, ignoreCase = true)
        }
        val tag = existing ?: tagsRepository.create(trimmed).getOrElse { error ->
            _ui.update { it.copy(error = error.message) }
            return@launch
        }
        if (_ui.value.tags.any { it.id == tag.id }) {
            _ui.update { it.copy(message = "برچسب قبلاً اضافه شده", error = null) }
            return@launch
        }
        tagsRepository.link(meetingId, tag.id)
            .onSuccess {
                reloadMeta()
                refreshMeetingContent("برچسب به جلسه اضافه شد")
            }
            .onFailure { e -> _ui.update { it.copy(error = e.message) } }
    }

    fun unlinkTag(tagId: String) = viewModelScope.launch {
        tagsRepository.unlink(meetingId, tagId)
            .onSuccess {
                _ui.update { it.copy(message = "برچسب از جلسه حذف شد", error = null) }
                reloadMeta()
            }
            .onFailure { e -> _ui.update { it.copy(error = e.message) } }
    }

    fun renameTag(tagId: String, name: String) = viewModelScope.launch {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) {
            _ui.update { it.copy(error = "نام برچسب را وارد کنید") }
            return@launch
        }
        tagsRepository.rename(tagId, trimmed)
            .onSuccess {
                _ui.update { it.copy(message = "نام برچسب ذخیره شد", error = null) }
                reloadMeta()
            }
            .onFailure { e -> _ui.update { it.copy(error = e.message) } }
    }

    fun linkParticipant(participantId: String) = viewModelScope.launch {
        participantsRepository.addToMeeting(meetingId, participantId, null)
            .onSuccess {
                _ui.update { it.copy(message = "فرد به جلسه اضافه شد", error = null) }
                reloadMeta()
            }
            .onFailure { e -> _ui.update { it.copy(error = e.message) } }
    }

    fun addParticipantByName(name: String) = viewModelScope.launch {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return@launch
        participantsRepository.addToMeeting(meetingId, null, trimmed)
            .onSuccess {
                _ui.update { it.copy(message = "فرد به جلسه اضافه شد", error = null) }
                reloadMeta()
            }
            .onFailure { e -> _ui.update { it.copy(error = e.message) } }
    }

    fun renameParticipant(id: String, name: String) = viewModelScope.launch {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) {
            _ui.update { it.copy(error = "نام را وارد کنید") }
            return@launch
        }
        participantsRepository.rename(id, trimmed)
            .onSuccess {
                reloadMeta()
                refreshMeetingContent("نام در خلاصه و متن اسکن‌شده هم اصلاح شد")
            }
            .onFailure { e -> _ui.update { it.copy(error = e.message) } }
    }

    fun removeParticipant(id: String) = viewModelScope.launch {
        participantsRepository.removeFromMeeting(meetingId, id)
            .onSuccess {
                _ui.update { it.copy(message = "فرد از جلسه حذف شد", error = null) }
                reloadMeta()
            }
            .onFailure { e -> _ui.update { it.copy(error = e.message) } }
    }

    private fun startPolling() {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (isActive) {
                delay(30_000)
                load(initial = false)
            }
        }
    }

    private fun load(initial: Boolean) {
        viewModelScope.launch {
            if (initial) _ui.update { it.copy(loading = true, error = null) }
            when (val result = meetingsRepository.getById(meetingId)) {
                is MeetingsResult.Ok -> {
                    val parsed = MeetingSummaryParser.parse(
                        summary = result.data.summary,
                        peopleField = result.data.people,
                    )
                    val processed = StatusStyle.isProcessedStatus(result.data.status)
                    val failed = StatusStyle.isErrorStatus(result.data.status)
                    _ui.update { current ->
                        val suppress = current.summarySuppressed && !processed && !failed
                        current.copy(
                            loading = false,
                            meeting = result.data,
                            summary = if (suppress) ParsedMeetingSummary() else parsed,
                            summarySuppressed = current.summarySuppressed && !processed && !failed,
                            editTitle = if (current.editing) current.editTitle else result.data.title.orEmpty(),
                            editSubject = when {
                                current.editing -> current.editSubject
                                suppress -> ""
                                else -> parsed.subject
                            },
                            editSummaryText = when {
                                current.editing -> current.editSummaryText
                                suppress -> ""
                                else -> parsed.summaryText
                            },
                        )
                    }
                    reloadMeta()
                }
                is MeetingsResult.Err -> {
                    _ui.update { it.copy(loading = false, error = result.message) }
                }
            }
        }
    }

    private suspend fun refreshMeetingContent(message: String) {
        when (val result = meetingsRepository.getById(meetingId)) {
            is MeetingsResult.Ok -> {
                val parsed = MeetingSummaryParser.parse(
                    summary = result.data.summary,
                    peopleField = result.data.people,
                )
                _ui.update { current ->
                    current.copy(
                        meeting = result.data,
                        summary = parsed,
                        editTitle = if (current.editing) current.editTitle else result.data.title.orEmpty(),
                        editSubject = if (current.editing) current.editSubject else parsed.subject,
                        editSummaryText = if (current.editing) current.editSummaryText else parsed.summaryText,
                        message = message,
                        error = null,
                    )
                }
            }
            is MeetingsResult.Err -> _ui.update { it.copy(error = result.message) }
        }
    }

    private suspend fun reloadMeta() {
        val tags = tagsRepository.tagsForMeeting(meetingId).getOrElse { emptyList() }
        val allTags = tagsRepository.list().getOrElse { emptyList() }
        val people = participantsRepository.forMeeting(meetingId).getOrElse { emptyList() }
        val allPeople = participantsRepository.list().getOrElse { ParticipantsListResponse() }.participants
        _ui.update {
            it.copy(
                tags = tags,
                allTags = allTags,
                participants = people,
                allParticipants = allPeople,
                tagsReady = true,
            )
        }
    }
}