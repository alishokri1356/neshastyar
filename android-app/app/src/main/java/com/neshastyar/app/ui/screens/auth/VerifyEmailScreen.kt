package com.neshastyar.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.neshastyar.app.data.repository.AuthRepository
import com.neshastyar.app.data.repository.AuthResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class VerifyStatus { Loading, Success, Error }

data class VerifyEmailUi(
    val status: VerifyStatus = VerifyStatus.Loading,
    val message: String = "",
    val resendEmail: String = "",
    val resending: Boolean = false,
    val resendMessage: String? = null,
)

@HiltViewModel
class VerifyEmailViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val token: String = savedStateHandle.get<String>("token").orEmpty()
    private val _ui = MutableStateFlow(VerifyEmailUi())
    val ui: StateFlow<VerifyEmailUi> = _ui.asStateFlow()

    init {
        verify()
    }

    fun onResendEmail(value: String) = _ui.update { it.copy(resendEmail = value, resendMessage = null) }

    fun verify() {
        if (token.isBlank()) {
            _ui.update {
                it.copy(status = VerifyStatus.Error, message = "لینک تأیید ایمیل نامعتبر است")
            }
            return
        }
        viewModelScope.launch {
            _ui.update { it.copy(status = VerifyStatus.Loading, message = "") }
            when (val result = authRepository.verifyEmailToken(token)) {
                is AuthResult.Success -> _ui.update {
                    it.copy(
                        status = VerifyStatus.Success,
                        message = "ایمیل شما با موفقیت تأیید شد. حالا می‌توانید وارد حساب کاربری خود شوید.",
                    )
                }
                is AuthResult.Error -> _ui.update {
                    it.copy(
                        status = VerifyStatus.Error,
                        message = result.message.ifBlank { "خطا در تأیید ایمیل. لینک ممکن است منقضی شده باشد." },
                    )
                }
                else -> _ui.update {
                    it.copy(status = VerifyStatus.Error, message = "خطا در تأیید ایمیل")
                }
            }
        }
    }

    fun resend() {
        val email = _ui.value.resendEmail.trim()
        if (email.isBlank()) {
            _ui.update { it.copy(resendMessage = "ایمیل را وارد کنید") }
            return
        }
        viewModelScope.launch {
            _ui.update { it.copy(resending = true, resendMessage = null) }
            when (val result = authRepository.resendVerification(email)) {
                is AuthResult.Success -> _ui.update {
                    it.copy(resending = false, resendMessage = "اگر این ایمیل ثبت شده باشد، لینک تأیید دوباره ارسال می‌شود.")
                }
                is AuthResult.Error -> _ui.update {
                    it.copy(resending = false, resendMessage = result.message)
                }
                else -> _ui.update {
                    it.copy(resending = false, resendMessage = "ارسال دوباره انجام نشد")
                }
            }
        }
    }
}

@Composable
fun VerifyEmailScreen(
    onGoLogin: () -> Unit,
    viewModel: VerifyEmailViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 24.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        if (state.status == VerifyStatus.Loading) {
            CircularProgressIndicator()
        }
        Text(
            text = when (state.status) {
                VerifyStatus.Loading -> "در حال تأیید ایمیل..."
                VerifyStatus.Success -> "ایمیل تأیید شد"
                VerifyStatus.Error -> "خطا در تأیید ایمیل"
            },
            style = MaterialTheme.typography.headlineMedium,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 16.dp),
        )
        if (state.message.isNotBlank()) {
            Text(
                text = state.message,
                style = MaterialTheme.typography.bodyMedium,
                color = if (state.status == VerifyStatus.Error) {
                    MaterialTheme.colorScheme.error
                } else {
                    MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f)
                },
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 12.dp),
            )
        }
        if (state.status == VerifyStatus.Success) {
            Button(
                onClick = onGoLogin,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 24.dp)
                    .height(52.dp),
            ) {
                Text("ورود به حساب کاربری")
            }
        }
        if (state.status == VerifyStatus.Error) {
            OutlinedTextField(
                value = state.resendEmail,
                onValueChange = viewModel::onResendEmail,
                label = { Text("ایمیل") },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 20.dp),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            )
            if (state.resendMessage != null) {
                Text(
                    text = state.resendMessage!!,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                )
            }
            Button(
                onClick = viewModel::resend,
                enabled = !state.resending,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp)
                    .height(52.dp),
            ) {
                if (state.resending) {
                    CircularProgressIndicator(
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp,
                        modifier = Modifier.height(22.dp),
                    )
                } else {
                    Text("ارسال دوباره لینک تأیید")
                }
            }
            OutlinedButton(
                onClick = onGoLogin,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp)
                    .height(52.dp),
            ) {
                Text("بازگشت به ورود")
            }
        }
    }
}
