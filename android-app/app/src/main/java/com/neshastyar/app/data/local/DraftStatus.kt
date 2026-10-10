package com.neshastyar.app.data.local

/**
 * Stages of a meeting that still lives only on the device.
 * These are never sent as the server meeting status.
 */
object DraftStatus {
    const val ON_RECORDING = "OnRecording"
    const val ON_TAG_SELECTION = "OnTagSelection"
    const val ON_UPLOADING = "OnUploading"

    fun isTemporary(status: String?): Boolean =
        status == ON_RECORDING || status == ON_TAG_SELECTION || status == ON_UPLOADING
}
