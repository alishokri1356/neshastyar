package com.neshastyar.app.ui.screens.chat

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.neshastyar.app.data.api.ChatMessageDto
import com.neshastyar.app.data.repository.ChatRepository
import com.neshastyar.app.data.repository.ChatResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ChatUiState(
    val meetingId: String? = null,
    val sessionId: String? = null,
    val scopeLabel: String = "همه جلسات",
    val title: String? = null,
    val input: String = "",
    val messages: List<ChatMessageDto> = emptyList(),
    val loadingSession: Boolean = false,
    val sending: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val chatRepository: ChatRepository,
) : ViewModel() {
    private val initialMeetingId: String? = savedStateHandle.get<String>("meetingId")
        ?.takeIf { it.isNotBlank() && it != "null" }
    private val initialSessionId: String? = savedStateHandle.get<String>("sessionKey")
        ?.takeIf { it.isNotBlank() && it != "null" && it != "new" }

    private val _ui = MutableStateFlow(
        ChatUiState(
            meetingId = initialMeetingId,
            sessionId = initialSessionId,
            scopeLabel = if (initialMeetingId != null) "این جلسه" else "همه جلسات",
        ),
    )
    val ui: StateFlow<ChatUiState> = _ui.asStateFlow()

    init {
        if (!initialSessionId.isNullOrBlank()) {
            loadSession(initialSessionId)
        }
    }

    fun onInput(value: String) {
        _ui.update { it.copy(input = value, error = null) }
    }

    fun appendDictation(text: String) {
        val cleaned = text.trim()
        if (cleaned.isBlank()) return
        _ui.update { state ->
            val merged = listOf(state.input.trim(), cleaned)
                .filter { it.isNotBlank() }
                .joinToString(" ")
            state.copy(input = merged, error = null)
        }
    }

    fun send(content: String? = null) {
        val question = (content ?: _ui.value.input).trim()
        if (question.isBlank() || _ui.value.sending) return

        viewModelScope.launch {
            _ui.update { it.copy(sending = true, error = null, input = if (content == null) "" else it.input) }
            var sessionId = _ui.value.sessionId
            if (sessionId.isNullOrBlank()) {
                when (val created = chatRepository.createSession(_ui.value.meetingId)) {
                    is ChatResult.Ok -> {
                        sessionId = created.data.id
                        _ui.update {
                            it.copy(
                                sessionId = created.data.id,
                                title = created.data.title,
                                messages = created.data.messages.orEmpty(),
                            )
                        }
                    }
                    is ChatResult.Err -> {
                        _ui.update { it.copy(sending = false, error = created.message) }
                        return@launch
                    }
                }
            }

            when (val result = chatRepository.sendMessage(sessionId!!, question)) {
                is ChatResult.Ok -> {
                    val session = result.data.session
                    val messages = session?.messages
                        ?: (_ui.value.messages + listOfNotNull(result.data.userMessage, result.data.assistantMessage))
                    _ui.update {
                        it.copy(
                            sending = false,
                            sessionId = session?.id ?: sessionId,
                            title = session?.title ?: it.title,
                            messages = messages,
                            error = if (result.data.assistantMessage?.status == "error") {
                                result.data.assistantMessage?.content
                            } else {
                                null
                            },
                        )
                    }
                }
                is ChatResult.Err -> {
                    _ui.update { it.copy(sending = false, error = result.message) }
                }
            }
        }
    }

    fun retryLast() {
        val lastUser = _ui.value.messages.lastOrNull { it.role == "user" }?.content ?: return
        send(lastUser)
    }

    private fun loadSession(sessionId: String) {
        viewModelScope.launch {
            _ui.update { it.copy(loadingSession = true, error = null) }
            when (val result = chatRepository.getSession(sessionId)) {
                is ChatResult.Ok -> {
                    _ui.update {
                        it.copy(
                            loadingSession = false,
                            sessionId = result.data.id,
                            meetingId = result.data.meeting_id ?: it.meetingId,
                            scopeLabel = if (result.data.scope == "meeting") "این جلسه" else "همه جلسات",
                            title = result.data.title,
                            messages = result.data.messages.orEmpty(),
                        )
                    }
                }
                is ChatResult.Err -> {
                    _ui.update { it.copy(loadingSession = false, error = result.message) }
                }
            }
        }
    }
}
