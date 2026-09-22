package com.neshastyar.app.ui.update

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.neshastyar.app.data.repository.AppUpdateInfo
import com.neshastyar.app.data.repository.AppUpdateRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

@HiltViewModel
class AppUpdateViewModel @Inject constructor(
    private val appUpdateRepository: AppUpdateRepository,
) : ViewModel() {
    private val _update = MutableStateFlow<AppUpdateInfo?>(null)
    val update: StateFlow<AppUpdateInfo?> = _update.asStateFlow()

    fun check() {
        viewModelScope.launch {
            _update.value = appUpdateRepository.findAvailableUpdate()
        }
    }

    fun dismiss() {
        _update.value = null
    }
}
