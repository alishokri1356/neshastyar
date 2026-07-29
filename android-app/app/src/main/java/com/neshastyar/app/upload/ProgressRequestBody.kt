package com.neshastyar.app.upload

import java.io.File
import okhttp3.MediaType
import okhttp3.RequestBody
import okio.Buffer
import okio.BufferedSink
import okio.ForwardingSink
import okio.buffer

class ProgressRequestBody(
    private val file: File,
    private val contentType: MediaType?,
    private val onProgress: (bytesWritten: Long, contentLength: Long) -> Unit,
) : RequestBody() {
    override fun contentType(): MediaType? = contentType

    override fun contentLength(): Long = file.length()

    override fun writeTo(sink: BufferedSink) {
        val length = contentLength()
        val countingSink = object : ForwardingSink(sink) {
            private var written = 0L

            override fun write(source: Buffer, byteCount: Long) {
                super.write(source, byteCount)
                written += byteCount
                onProgress(written, length)
            }
        }
        val buffered = countingSink.buffer()
        file.inputStream().use { input ->
            val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
            while (true) {
                val read = input.read(buffer)
                if (read < 0) break
                buffered.write(buffer, 0, read)
            }
        }
        buffered.flush()
    }
}
