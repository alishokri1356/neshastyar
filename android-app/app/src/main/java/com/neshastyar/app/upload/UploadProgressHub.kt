package com.neshastyar.app.upload

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class UploadSession(
    val draftId: String,
    val uploading: Boolean = true,
    val progress: Int = 0,
    val message: String = "",
    val fileIndex: Int = 0,
    val fileCount: Int = 0,
    val error: String? = null,
    val meetingId: String? = null,
    val done: Boolean = false,
)

@Singleton
class UploadProgressHub @Inject constructor() {
    private val _session = MutableStateFlow<UploadSession?>(null)
    val session: StateFlow<UploadSession?> = _session.asStateFlow()

    fun begin(draftId: String) {
        _session.value = UploadSession(draftId = draftId, message = "شروع آپلود…")
    }

    fun progress(draftId: String, percent: Int, message: String, fileIndex: Int = 0, fileCount: Int = 0) {
        val current = _session.value
        if (current != null && current.draftId != draftId) return
        // A late callback from an earlier file must not put the label back to "1 of N".
        if (current != null && current.draftId == draftId && fileCount > 0 && fileIndex < current.fileIndex) return
        _session.value = UploadSession(
            draftId = draftId,
            uploading = true,
            progress = percent.coerceIn(0, 100),
            message = message,
            fileIndex = fileIndex,
            fileCount = fileCount,
        )
    }

    fun success(draftId: String, meetingId: String) {
        _session.value = UploadSession(
            draftId = draftId,
            uploading = false,
            progress = 100,
            message = "آپلود کامل شد",
            meetingId = meetingId,
            done = true,
        )
    }

    fun failure(draftId: String, message: String) {
        _session.value = UploadSession(
            draftId = draftId,
            uploading = false,
            progress = _session.value?.takeIf { it.draftId == draftId }?.progress ?: 0,
            message = "",
            error = message,
        )
    }
}
