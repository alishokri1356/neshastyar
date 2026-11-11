package com.neshastyar.app.ui.screens.report

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.neshastyar.app.data.api.PublicReportDto
import com.neshastyar.app.data.api.PublicReportEditRequest
import com.neshastyar.app.data.repository.MeetingsRepository
import com.neshastyar.app.data.repository.PublicReportRepository
import com.neshastyar.app.util.JalaliDates
import dagger.hilt.android.lifecycle.HiltViewModel
import java.net.URL
import javax.inject.Inject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class MeetingMinutesUi(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val shareUrl: String? = null,
    val token: String? = null,
    val report: PublicReportDto? = null,
    val logo: Bitmap? = null,
    val error: String? = null,
    val notice: String? = null,
)

@HiltViewModel
class MeetingMinutesViewModel @Inject constructor(
    private val meetings: MeetingsRepository,
    private val reports: PublicReportRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val meetingId: String = savedStateHandle.get<String>("meetingId").orEmpty()

    private val _ui = MutableStateFlow(MeetingMinutesUi())
    val ui: StateFlow<MeetingMinutesUi> = _ui.asStateFlow()

    init {
        open()
    }

    fun open() {
        if (meetingId.isBlank() || _ui.value.saving) return
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            meetings.shareMeeting(meetingId).fold(
                onSuccess = { result ->
                    val url = result.url.orEmpty()
                    val token = result.token?.takeIf { it.isNotBlank() }
                        ?: url.substringAfterLast("/report/", "").substringBefore('?').takeIf { it.isNotBlank() }
                    if (token.isNullOrBlank()) {
                        _ui.update {
                            it.copy(loading = false, error = "ساخت لینک صورتجلسه ناموفق بود")
                        }
                        return@fold
                    }
                    _ui.update { it.copy(shareUrl = url, token = token) }
                    loadReport(token)
                },
                onFailure = { e ->
                    _ui.update {
                        it.copy(
                            loading = false,
                            error = e.message ?: "ساخت لینک صورتجلسه ناموفق بود",
                        )
                    }
                },
            )
        }
    }

    fun disableLink() {
        if (meetingId.isBlank() || _ui.value.loading) return
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            meetings.disableMeetingShare(meetingId).fold(
                onSuccess = {
                    _ui.update {
                        MeetingMinutesUi(
                            loading = false,
                            notice = "لینک صورتجلسه غیرفعال شد",
                        )
                    }
                },
                onFailure = { e ->
                    _ui.update {
                        it.copy(
                            loading = false,
                            error = e.message ?: "غیرفعال کردن لینک ناموفق بود",
                        )
                    }
                },
            )
        }
    }

    fun clearNotice() = _ui.update { it.copy(error = null, notice = null) }

    fun saveTitle(value: String) = save(PublicReportEditRequest(field = "title", value = value.trim()))

    fun saveLocation(value: String) = save(PublicReportEditRequest(field = "location", value = value.trim()))

    fun saveOrgName(value: String) = save(PublicReportEditRequest(field = "orgName", value = value.trim()))

    fun saveParticipants(value: String) =
        save(PublicReportEditRequest(field = "participants", value = value.trim()))

    fun saveDate(value: String) {
        val parsed = JalaliDates.parseReportDateInput(value)
        if (parsed == null) {
            _ui.update { it.copy(error = "تاریخ را به شکل ۱۴۰۵/۰۸/۱۱ - ۱۶:۵۴ وارد کنید") }
            return
        }
        save(PublicReportEditRequest(field = "date", value = parsed))
    }

    fun saveDecision(index: Int, part: String, value: String) = save(
        PublicReportEditRequest(field = "decision", index = index, part = part, value = value.trim()),
    )

    fun addDecision() = save(PublicReportEditRequest(field = "addDecision"))

    fun deleteDecision(index: Int) = save(PublicReportEditRequest(field = "deleteDecision", index = index))

    fun uploadLogo(uri: Uri) {
        val token = _ui.value.token
        if (token.isNullOrBlank() || _ui.value.saving) return
        viewModelScope.launch {
            _ui.update { it.copy(saving = true, error = null, notice = null) }
            reports.uploadLogo(token, uri).fold(
                onSuccess = { report ->
                    _ui.update {
                        it.copy(saving = false, report = report, notice = "لوگو ذخیره شد")
                    }
                    loadLogo(report.logoUrl)
                },
                onFailure = { e ->
                    _ui.update {
                        it.copy(saving = false, error = e.message ?: "ذخیره لوگو انجام نشد")
                    }
                },
            )
        }
    }

    private suspend fun loadReport(token: String) {
        reports.fetchReport(token).fold(
            onSuccess = { report ->
                _ui.update { it.copy(loading = false, report = report, error = null) }
                loadLogo(report.logoUrl)
            },
            onFailure = { e ->
                _ui.update {
                    it.copy(loading = false, error = e.message ?: "صورتجلسه پیدا نشد")
                }
            },
        )
    }

    private fun save(edit: PublicReportEditRequest) {
        val token = _ui.value.token
        if (token.isNullOrBlank() || _ui.value.saving) return
        viewModelScope.launch {
            _ui.update { it.copy(saving = true, error = null, notice = null) }
            reports.updateReport(token, edit).fold(
                onSuccess = { report ->
                    _ui.update { it.copy(saving = false, report = report) }
                    if (edit.field == "orgName") loadLogo(report.logoUrl)
                },
                onFailure = { e ->
                    _ui.update {
                        it.copy(saving = false, error = e.message ?: "ذخیره صورتجلسه انجام نشد")
                    }
                },
            )
        }
    }

    private fun loadLogo(url: String?) {
        if (url.isNullOrBlank()) {
            _ui.update { it.copy(logo = null) }
            return
        }
        viewModelScope.launch {
            val bitmap = withContext(Dispatchers.IO) {
                runCatching {
                    val connection = URL(url).openConnection().apply {
                        connectTimeout = 15_000
                        readTimeout = 15_000
                    }
                    connection.getInputStream().use { BitmapFactory.decodeStream(it) }
                }.getOrNull()
            }
            if (_ui.value.report?.logoUrl == url) {
                _ui.update { it.copy(logo = bitmap) }
            }
        }
    }
}
