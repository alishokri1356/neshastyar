package com.neshastyar.app.ui.screens.chat

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.neshastyar.app.data.api.ChatSessionDto
import com.neshastyar.app.data.repository.ChatRepository
import com.neshastyar.app.data.repository.ChatResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ChatHistoryUiState(
    val meetingId: String? = null,
    val sessions: List<ChatSessionDto> = emptyList(),
    val loading: Boolean = true,
    val error: String? = null,
    val deletingId: String? = null,
)

@HiltViewModel
class ChatHistoryViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val chatRepository: ChatRepository,
) : ViewModel() {
    private val meetingId: String? = savedStateHandle.get<String>("meetingId")
        ?.takeIf { it.isNotBlank() && it != "null" }

    private val _ui = MutableStateFlow(ChatHistoryUiState(meetingId = meetingId))
    val ui: StateFlow<ChatHistoryUiState> = _ui.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            val result = if (meetingId != null) {
                chatRepository.listSessions(meetingId = meetingId)
            } else {
                chatRepository.listSessions(scope = "all")
            }
            when (result) {
                is ChatResult.Ok -> _ui.update {
                    it.copy(loading = false, sessions = result.data, error = null)
                }
                is ChatResult.Err -> _ui.update {
                    it.copy(loading = false, error = result.message)
                }
            }
        }
    }

    fun delete(sessionId: String) {
        viewModelScope.launch {
            _ui.update { it.copy(deletingId = sessionId, error = null) }
            when (val result = chatRepository.deleteSession(sessionId)) {
                is ChatResult.Ok -> _ui.update {
                    it.copy(
                        deletingId = null,
                        sessions = it.sessions.filterNot { session -> session.id == sessionId },
                    )
                }
                is ChatResult.Err -> _ui.update {
                    it.copy(deletingId = null, error = result.message)
                }
            }
        }
    }
}
