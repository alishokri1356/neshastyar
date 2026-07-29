package com.neshastyar.app.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import com.neshastyar.app.data.repository.AuthRepository
import com.neshastyar.app.data.repository.AuthResult

data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val info: String? = null,
    val loggedIn: Boolean = false,
)

data class SignUpUiState(
    val name: String = "",
    val email: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val done: Boolean = false,
)

data class ForgotUiState(
    val email: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _ui = MutableStateFlow(LoginUiState())
    val ui: StateFlow<LoginUiState> = _ui.asStateFlow()

    fun onEmail(v: String) = _ui.update { it.copy(email = v, error = null) }
    fun onPassword(v: String) = _ui.update { it.copy(password = v, error = null) }
    fun clearMessages() = _ui.update { it.copy(error = null, info = null) }

    fun login() {
        val state = _ui.value
        if (state.email.isBlank() || state.password.isBlank()) {
            _ui.update { it.copy(error = "Ø§ÛŒÙ…ÛŒÙ„ Ùˆ Ø±Ù…Ø² Ø¹Ø¨ÙˆØ± Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯") }
            return
        }
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null, info = null) }
            when (val result = authRepository.login(state.email, state.password)) {
                is AuthResult.Success -> _ui.update { it.copy(loading = false, loggedIn = true) }
                is AuthResult.NeedsVerification -> _ui.update {
                    it.copy(loading = false, error = result.message, info = result.email)
                }
                is AuthResult.Error -> _ui.update { it.copy(loading = false, error = result.message) }
                AuthResult.LoggedOut -> _ui.update { it.copy(loading = false, error = "ÙˆØ±ÙˆØ¯ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯") }
            }
        }
    }
}

@HiltViewModel
class SignUpViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _ui = MutableStateFlow(SignUpUiState())
    val ui: StateFlow<SignUpUiState> = _ui.asStateFlow()

    fun onName(v: String) = _ui.update { it.copy(name = v, error = null) }
    fun onEmail(v: String) = _ui.update { it.copy(email = v, error = null) }
    fun onPassword(v: String) = _ui.update { it.copy(password = v, error = null) }
    fun onConfirm(v: String) = _ui.update { it.copy(confirmPassword = v, error = null) }

    fun signup() {
        val state = _ui.value
        if (state.email.isBlank() || state.password.isBlank()) {
            _ui.update { it.copy(error = "Ø§ÛŒÙ…ÛŒÙ„ Ùˆ Ø±Ù…Ø² Ø¹Ø¨ÙˆØ± Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª") }
            return
        }
        if (state.password.length < 6) {
            _ui.update { it.copy(error = "Ø±Ù…Ø² Ø¹Ø¨ÙˆØ± Ø¨Ø§ÛŒØ¯ Ø­Ø¯Ø§Ù‚Ù„ Û¶ Ú©Ø§Ø±Ø§Ú©ØªØ± Ø¨Ø§Ø´Ø¯") }
            return
        }
        if (state.password != state.confirmPassword) {
            _ui.update { it.copy(error = "Ø±Ù…Ø²Ù‡Ø§ÛŒ Ø¹Ø¨ÙˆØ± Ù…Ø·Ø§Ø¨Ù‚Øª Ù†Ø¯Ø§Ø±Ù†Ø¯") }
            return
        }
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            when (val result = authRepository.signup(state.email, state.password, state.name)) {
                is AuthResult.NeedsVerification, is AuthResult.Success -> _ui.update {
                    it.copy(
                        loading = false,
                        done = true,
                        successMessage = (result as? AuthResult.NeedsVerification)?.message
                            ?: "Ø«Ø¨Øªâ€ŒÙ†Ø§Ù… Ù…ÙˆÙÙ‚. Ø§ÛŒÙ…ÛŒÙ„ ØªØ£ÛŒÛŒØ¯ Ø±Ø§ Ø¨Ø±Ø±Ø³ÛŒ Ú©Ù†ÛŒØ¯.",
                    )
                }
                is AuthResult.Error -> _ui.update { it.copy(loading = false, error = result.message) }
                AuthResult.LoggedOut -> _ui.update { it.copy(loading = false, error = "Ø«Ø¨Øªâ€ŒÙ†Ø§Ù… Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯") }
            }
        }
    }
}

@HiltViewModel
class ForgotPasswordViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _ui = MutableStateFlow(ForgotUiState())
    val ui: StateFlow<ForgotUiState> = _ui.asStateFlow()

    fun onEmail(v: String) = _ui.update { it.copy(email = v, error = null) }

    fun submit() {
        val email = _ui.value.email
        if (email.isBlank()) {
            _ui.update { it.copy(error = "Ø§ÛŒÙ…ÛŒÙ„ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯") }
            return
        }
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            when (val result = authRepository.requestPasswordReset(email)) {
                is AuthResult.Success -> _ui.update {
                    it.copy(
                        loading = false,
                        successMessage = "Ø§Ú¯Ø± Ø§ÛŒÙ† Ø§ÛŒÙ…ÛŒÙ„ Ø«Ø¨Øª Ø´Ø¯Ù‡ Ø¨Ø§Ø´Ø¯ØŒ Ù„ÛŒÙ†Ú© Ø¨Ø§Ø²ÛŒØ§Ø¨ÛŒ Ø§Ø±Ø³Ø§Ù„ Ù…ÛŒâ€ŒØ´ÙˆØ¯.",
                    )
                }
                is AuthResult.Error -> _ui.update { it.copy(loading = false, error = result.message) }
                else -> _ui.update {
                    it.copy(
                        loading = false,
                        successMessage = "Ø§Ú¯Ø± Ø§ÛŒÙ† Ø§ÛŒÙ…ÛŒÙ„ Ø«Ø¨Øª Ø´Ø¯Ù‡ Ø¨Ø§Ø´Ø¯ØŒ Ù„ÛŒÙ†Ú© Ø¨Ø§Ø²ÛŒØ§Ø¨ÛŒ Ø§Ø±Ø³Ø§Ù„ Ù…ÛŒâ€ŒØ´ÙˆØ¯.",
                    )
                }
            }
        }
    }
}

@HiltViewModel
class SplashViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {
    sealed class Dest {
        data object Loading : Dest()
        data object Login : Dest()
        data object Home : Dest()
    }

    private val _dest = MutableStateFlow<Dest>(Dest.Loading)
    val dest: StateFlow<Dest> = _dest.asStateFlow()

    fun start() {
        viewModelScope.launch {
            when (authRepository.verifyStoredSession()) {
                is AuthResult.Success -> _dest.value = Dest.Home
                else -> _dest.value = Dest.Login
            }
        }
    }
}

