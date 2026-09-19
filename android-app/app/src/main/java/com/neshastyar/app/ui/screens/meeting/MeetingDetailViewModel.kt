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
import com.neshastyar.app.data.api.AudioFileDto
import com.neshastyar.app.data.api.MeetingDto
import com.neshastyar.app.data.api.ParticipantDto
import com.neshastyar.app.data.api.TagDto
import com.neshastyar.app.data.api.UpdateMeetingRequest
import com.neshastyar.app.data.repository.MeetingsRepository
import com.neshastyar.app.data.repository.MeetingsResult
import com.neshastyar.app.data.repository.ParticipantsRepository
import com.neshastyar.app.data.repository.TagsRepository
import com.neshastyar.app.util.MeetingSummaryParser
import com.neshastyar.app.util.ParsedMeetingSummary
import org.json.JSONArray
import org.json.JSONObject

data class MeetingDetailUiState(
    val loading: Boolean = true,
    val error: String? = null,
    val message: String? = null,
    val meeting: MeetingDto? = null,
    val summary: ParsedMeetingSummary = ParsedMeetingSummary(),
    val audioFiles: List<AudioFileDto> = emptyList(),
    val tags: List<TagDto> = emptyList(),
    val allTags: List<TagDto> = emptyList(),
    val participants: List<ParticipantDto> = emptyList(),
    val editTitle: String = "",
    val editSubject: String = "",
    val editSummaryText: String = "",
    val newParticipantName: String = "",
    val deleted: Boolean = false,
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
    fun onNewParticipant(v: String) = _ui.update { it.copy(newParticipantName = v) }

    fun saveTitle() = viewModelScope.launch {
        meetingsRepository.update(meetingId, UpdateMeetingRequest(title = _ui.value.editTitle)).fold(
            onSuccess = { m -> _ui.update { it.copy(meeting = m, message = "عنوان ذخیره شد") } },
            onFailure = { e -> _ui.update { it.copy(error = e.message) } },
        )
    }

    fun saveSummary() = viewModelScope.launch {
        val json = JSONObject().apply {
            put("Subject", _ui.value.editSubject)
            put("Summary", _ui.value.editSummaryText)
            put("People in meetings", JSONArray(_ui.value.summary.people))
            put("Bolet Points", JSONArray(_ui.value.summary.bulletPoints))
            put("Tags", JSONArray(_ui.value.summary.tags))
        }.toString()
        meetingsRepository.update(meetingId, UpdateMeetingRequest(summary = json)).fold(
            onSuccess = { m ->
                _ui.update {
                    it.copy(
                        meeting = m,
                        summary = MeetingSummaryParser.parse(m.summary, m.people),
                        message = "خلاصه ذخیره شد",
                    )
                }
            },
            onFailure = { e -> _ui.update { it.copy(error = e.message) } },
        )
    }

    fun analyze() = viewModelScope.launch {
        meetingsRepository.analyze(meetingId).fold(
            onSuccess = {
                _ui.update {
                    it.copy(
                        message = "درخواست پردازش ارسال شد",
                        meeting = it.meeting?.copy(status = "ارسال درخواست پردازش"),
                    )
                }
            },
            onFailure = { e -> _ui.update { it.copy(error = e.message) } },
        )
    }

    fun sendEmail() = viewModelScope.launch {
        meetingsRepository.sendMail(meetingId).fold(
            onSuccess = { msg -> _ui.update { it.copy(message = msg) } },
            onFailure = { e -> _ui.update { it.copy(error = e.message) } },
        )
    }

    fun linkTag(tagId: String) = viewModelScope.launch {
        tagsRepository.link(meetingId, tagId).onSuccess { reloadMeta() }
    }

    fun unlinkTag(tagId: String) = viewModelScope.launch {
        tagsRepository.unlink(meetingId, tagId).onSuccess { reloadMeta() }
    }

    fun addParticipant() = viewModelScope.launch {
        val name = _ui.value.newParticipantName.trim()
        if (name.isEmpty()) return@launch
        participantsRepository.addToMeeting(meetingId, null, name).onSuccess {
            _ui.update { it.copy(newParticipantName = "") }
            reloadMeta()
        }.onFailure { e -> _ui.update { it.copy(error = e.message) } }
    }

    fun removeParticipant(id: String) = viewModelScope.launch {
        participantsRepository.removeFromMeeting(meetingId, id).onSuccess { reloadMeta() }
    }

    fun deleteMeeting() = viewModelScope.launch {
        val tags = _ui.value.tags
        tags.forEach { tagsRepository.unlink(meetingId, it.id) }
        meetingsRepository.delete(meetingId).fold(
            onSuccess = { _ui.update { it.copy(deleted = true) } },
            onFailure = { e -> _ui.update { it.copy(error = e.message) } },
        )
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
                    val audio = meetingsRepository.getAudioFiles(meetingId)
                    val parsed = MeetingSummaryParser.parse(
                        summary = result.data.summary,
                        peopleField = result.data.people,
                    )
                    _ui.update {
                        it.copy(
                            loading = false,
                            meeting = result.data,
                            summary = parsed,
                            audioFiles = audio,
                            editTitle = result.data.title.orEmpty(),
                            editSubject = parsed.subject,
                            editSummaryText = parsed.summaryText,
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

    private suspend fun reloadMeta() {
        val tags = tagsRepository.tagsForMeeting(meetingId).getOrElse { emptyList() }
        val allTags = tagsRepository.list().getOrElse { emptyList() }
        val people = participantsRepository.forMeeting(meetingId).getOrElse { emptyList() }
        _ui.update { it.copy(tags = tags, allTags = allTags, participants = people) }
    }
}