package com.neshastyar.app.upload

import java.io.File
import okhttp3.MediaType
import okhttp3.RequestBody
import okio.BufferedSink

/** Sends [byteCount] bytes from [file] starting at [offset]. Safe to write more than once. */
class FileSliceRequestBody(
    private val file: File,
    private val offset: Long,
    private val byteCount: Long,
    private val contentType: MediaType?,
    private val onProgress: (bytesWritten: Long) -> Unit,
) : RequestBody() {
    override fun contentType(): MediaType? = contentType

    override fun contentLength(): Long = byteCount

    override fun writeTo(sink: BufferedSink) {
        file.inputStream().use { input ->
            var skipped = 0L
            while (skipped < offset) {
                val n = input.skip(offset - skipped)
                if (n <= 0) error("Could not seek to upload offset")
                skipped += n
            }
            val buffer = ByteArray(64 * 1024)
            var remaining = byteCount
            var written = 0L
            while (remaining > 0) {
                val read = input.read(buffer, 0, minOf(buffer.size.toLong(), remaining).toInt())
                if (read < 0) break
                sink.write(buffer, 0, read)
                remaining -= read
                written += read
                onProgress(written)
            }
        }
    }
}
