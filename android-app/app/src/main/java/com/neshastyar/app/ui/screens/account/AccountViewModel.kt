package com.neshastyar.app.ui.screens.account

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import com.neshastyar.app.data.api.AnalyzeModelDto
import com.neshastyar.app.data.api.NeshastyarApi
import com.neshastyar.app.data.api.NetworkErrors
import com.neshastyar.app.data.api.ProfileUpdateRequest
import com.neshastyar.app.data.repository.AuthRepository
import com.neshastyar.app.data.repository.MeetingsRepository

data class AccountUi(
    val email: String = "",
    val name: String = "",
    val baleID: String = "",
    val orgName: String = "",
    val hasLogo: Boolean = false,
    val defaultAnalyzeModel: String = "auto",
    val autoKey: String = "auto",
    val analyzeModels: List<AnalyzeModelDto> = MeetingsRepository.fallbackAnalyzeModels().models,
    val loading: Boolean = true,
    val saving: Boolean = false,
    val uploadingLogo: Boolean = false,
    val message: String? = null,
    val error: String? = null,
    val loggedOut: Boolean = false,
)

@HiltViewModel
class AccountViewModel @Inject constructor(
    private val api: NeshastyarApi,
    private val authRepository: AuthRepository,
    private val meetingsRepository: MeetingsRepository,
    @ApplicationContext private val context: Context,
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
            val modelsResp = meetingsRepository.getAnalyzeModels()
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
                            orgName = user?.org_name.orEmpty(),
                            hasLogo = !user?.org_logo_path.isNullOrBlank(),
                            defaultAnalyzeModel = user?.default_analyze_model?.ifBlank { modelsResp.autoKey }
                                ?: modelsResp.autoKey,
                            autoKey = modelsResp.autoKey,
                            analyzeModels = modelsResp.models,
                        )
                    }
                } else {
                    _ui.update {
                        it.copy(
                            loading = false,
                            error = "بارگذاری پروفایل ناموفق (${r.code()})",
                            email = authRepository.currentEmail().orEmpty(),
                            name = authRepository.currentName().orEmpty(),
                            autoKey = modelsResp.autoKey,
                            analyzeModels = modelsResp.models,
                        )
                    }
                }
            } catch (e: Exception) {
                _ui.update {
                    it.copy(
                        loading = false,
                        error = NetworkErrors.userMessage(e, "خطا در بارگذاری پروفایل"),
                        email = authRepository.currentEmail().orEmpty(),
                        name = authRepository.currentName().orEmpty(),
                        autoKey = modelsResp.autoKey,
                        analyzeModels = modelsResp.models,
                    )
                }
            }
        }
    }

    fun onName(v: String) = _ui.update { it.copy(name = v, message = null, error = null) }
    fun onBale(v: String) = _ui.update { it.copy(baleID = v, message = null, error = null) }
    fun onOrgName(v: String) = _ui.update { it.copy(orgName = v, message = null, error = null) }
    fun onDefaultModel(v: String) = _ui.update { it.copy(defaultAnalyzeModel = v, message = null, error = null) }

    fun uploadLogo(uri: Uri) {
        viewModelScope.launch {
            _ui.update { it.copy(uploadingLogo = true, message = null, error = null) }
            try {
                val mime = context.contentResolver.getType(uri) ?: "image/png"
                val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                    ?: error("خواندن فایل تصویر ناموفق بود")
                if (bytes.size > 2 * 1024 * 1024) {
                    _ui.update { it.copy(uploadingLogo = false, error = "حجم نشان باید کمتر از ۲ مگابایت باشد") }
                    return@launch
                }
                val ext = when {
                    mime.contains("jpeg") || mime.contains("jpg") -> "jpg"
                    mime.contains("webp") -> "webp"
                    mime.contains("svg") -> "svg"
                    else -> "png"
                }
                val part = MultipartBody.Part.createFormData(
                    "logo",
                    "logo.$ext",
                    bytes.toRequestBody(mime.toMediaTypeOrNull()),
                )
                val r = api.uploadProfileLogo(part)
                if (r.isSuccessful) {
                    _ui.update {
                        it.copy(
                            uploadingLogo = false,
                            hasLogo = true,
                            message = "نشان سازمان ذخیره شد",
                        )
                    }
                } else {
                    _ui.update { it.copy(uploadingLogo = false, error = "بارگذاری نشان ناموفق (${r.code()})") }
                }
            } catch (e: Exception) {
                _ui.update {
                    it.copy(
                        uploadingLogo = false,
                        error = NetworkErrors.userMessage(e, "بارگذاری نشان ناموفق بود"),
                    )
                }
            }
        }
    }

    fun save() {
        viewModelScope.launch {
            _ui.update { it.copy(saving = true, message = null, error = null) }
            try {
                val snapshot = _ui.value
                val r = api.updateProfile(
                    ProfileUpdateRequest(
                        name = snapshot.name.trim().ifBlank { null },
                        baleID = snapshot.baleID.trim().ifBlank { null },
                        default_analyze_model = snapshot.defaultAnalyzeModel.ifBlank { "auto" },
                        org_name = snapshot.orgName.trim().ifBlank { null },
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
                            orgName = user?.org_name ?: it.orgName,
                            defaultAnalyzeModel = user?.default_analyze_model ?: it.defaultAnalyzeModel,
                        )
                    }
                } else {
                    _ui.update { it.copy(saving = false, error = "ذخیره ناموفق (${r.code()})") }
                }
            } catch (e: Exception) {
                _ui.update {
                    it.copy(
                        saving = false,
                        error = NetworkErrors.userMessage(e, "ذخیره ناموفق"),
                    )
                }
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
