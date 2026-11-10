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
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
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

data class ResetPasswordUi(
    val invalidLink: Boolean = false,
    val password: String = "",
    val confirm: String = "",
    val showPassword: Boolean = false,
    val loading: Boolean = false,
    val error: String? = null,
    val success: Boolean = false,
)

@HiltViewModel
class ResetPasswordViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val token: String = savedStateHandle.get<String>("token").orEmpty()
    private val _ui = MutableStateFlow(ResetPasswordUi(invalidLink = token.isBlank()))
    val ui: StateFlow<ResetPasswordUi> = _ui.asStateFlow()

    fun onPassword(value: String) = _ui.update { it.copy(password = value, error = null) }
    fun onConfirm(value: String) = _ui.update { it.copy(confirm = value, error = null) }
    fun toggleShow() = _ui.update { it.copy(showPassword = !it.showPassword) }

    fun submit() {
        val state = _ui.value
        if (token.isBlank()) {
            _ui.update { it.copy(invalidLink = true, error = "لینک بازنشانی رمز عبور نامعتبر است") }
            return
        }
        if (state.password.isBlank() || state.confirm.isBlank()) {
            _ui.update { it.copy(error = "رمز عبور و تکرار آن را وارد کنید") }
            return
        }
        if (state.password != state.confirm) {
            _ui.update { it.copy(error = "رمز عبور و تکرار آن یکسان نیستند") }
            return
        }
        if (state.password.length < 6) {
            _ui.update { it.copy(error = "رمز عبور باید حداقل ۶ کاراکتر باشد") }
            return
        }
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            when (val result = authRepository.resetPassword(token, state.password)) {
                is AuthResult.Success -> _ui.update { it.copy(loading = false, success = true, error = null) }
                is AuthResult.Error -> _ui.update {
                    it.copy(
                        loading = false,
                        error = result.message.ifBlank { "خطا در تغییر رمز عبور. لینک ممکن است منقضی شده باشد." },
                    )
                }
                else -> _ui.update { it.copy(loading = false, error = "خطا در تغییر رمز عبور") }
            }
        }
    }
}

@Composable
fun ResetPasswordScreen(
    onGoLogin: () -> Unit,
    viewModel: ResetPasswordViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    val visual = if (state.showPassword) VisualTransformation.None else PasswordVisualTransformation()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 24.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = if (state.success) "رمز عبور تغییر یافت" else "بازنشانی رمز عبور",
            style = MaterialTheme.typography.headlineMedium,
            textAlign = TextAlign.Center,
        )
        Text(
            text = when {
                state.success -> "حالا می‌توانید با رمز عبور جدید وارد شوید."
                state.invalidLink -> "لینک بازنشانی رمز عبور نامعتبر است"
                else -> "رمز عبور جدید خود را وارد کنید"
            },
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 8.dp, bottom = 20.dp),
        )

        if (!state.success && !state.invalidLink) {
            OutlinedTextField(
                value = state.password,
                onValueChange = viewModel::onPassword,
                label = { Text("رمز عبور جدید") },
                singleLine = true,
                visualTransformation = visual,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = state.confirm,
                onValueChange = viewModel::onConfirm,
                label = { Text("تکرار رمز عبور") },
                singleLine = true,
                visualTransformation = visual,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
            )
            TextButton(onClick = viewModel::toggleShow) {
                Text(if (state.showPassword) "پنهان کردن رمز" else "نمایش رمز")
            }
            if (state.error != null) {
                Text(
                    text = state.error!!,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp),
                )
            }
            Button(
                onClick = viewModel::submit,
                enabled = !state.loading,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp)
                    .height(52.dp),
            ) {
                if (state.loading) {
                    CircularProgressIndicator(
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp,
                        modifier = Modifier.height(22.dp),
                    )
                } else {
                    Text("ذخیره رمز عبور")
                }
            }
        }

        if (state.invalidLink && state.error != null && !state.success) {
            Text(
                text = state.error!!,
                color = MaterialTheme.colorScheme.error,
                textAlign = TextAlign.Center,
            )
        }

        if (state.success || state.invalidLink) {
            OutlinedButton(
                onClick = onGoLogin,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp)
                    .height(52.dp),
            ) {
                Text("ورود به حساب کاربری")
            }
        }
    }
}
