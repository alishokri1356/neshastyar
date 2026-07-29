package com.neshastyar.app.ui.screens.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import com.neshastyar.app.data.api.NeshastyarApi
import com.neshastyar.app.data.api.ProfileUpdateRequest
import com.neshastyar.app.data.repository.AuthRepository

data class AccountUi(
    val email: String = "",
    val name: String = "",
    val baleID: String = "",
    val loading: Boolean = true,
    val saving: Boolean = false,
    val message: String? = null,
    val error: String? = null,
    val loggedOut: Boolean = false,
)

@HiltViewModel
class AccountViewModel @Inject constructor(
    private val api: NeshastyarApi,
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _ui = MutableStateFlow(
        AccountUi(
            email = authRepository.currentEmail().orEmpty(),
            name = authRepository.currentName().orEmpty(),
            loading = false,
        ),
    )
    val ui = _ui.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            try {
                val r = api.getProfile()
                if (r.isSuccessful) {
                    val user = r.body()?.data?.user
                    _ui.update {
                        it.copy(
                            loading = false,
                            email = user?.email ?: authRepository.currentEmail().orEmpty(),
                            name = user?.name.orEmpty(),
                            baleID = user?.baleID.orEmpty(),
                        )
                    }
                } else {
                    _ui.update {
                        it.copy(
                            loading = false,
                            error = "بارگذاری پروفایل ناموفق (${r.code()})",
                            email = authRepository.currentEmail().orEmpty(),
                            name = authRepository.currentName().orEmpty(),
                        )
                    }
                }
            } catch (e: Exception) {
                _ui.update {
                    it.copy(
                        loading = false,
                        error = e.message ?: "خطا در بارگذاری پروفایل",
                        email = authRepository.currentEmail().orEmpty(),
                        name = authRepository.currentName().orEmpty(),
                    )
                }
            }
        }
    }

    fun onName(v: String) = _ui.update { it.copy(name = v) }
    fun onBale(v: String) = _ui.update { it.copy(baleID = v) }

    fun save() {
        viewModelScope.launch {
            _ui.update { it.copy(saving = true, message = null, error = null) }
            try {
                val r = api.updateProfile(
                    ProfileUpdateRequest(
                        name = _ui.value.name.ifBlank { null },
                        baleID = _ui.value.baleID.ifBlank { null },
                    ),
                )
                if (r.isSuccessful) {
                    val user = r.body()?.data?.user
                    _ui.update {
                        it.copy(
                            saving = false,
                            message = "ذخیره شد",
                            name = user?.name ?: it.name,
                            baleID = user?.baleID ?: it.baleID,
                        )
                    }
                } else {
                    _ui.update { it.copy(saving = false, error = "ذخیره ناموفق (${r.code()})") }
                }
            } catch (e: Exception) {
                _ui.update { it.copy(saving = false, error = e.message ?: "ذخیره ناموفق") }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _ui.update { it.copy(loggedOut = true) }
        }
    }
}