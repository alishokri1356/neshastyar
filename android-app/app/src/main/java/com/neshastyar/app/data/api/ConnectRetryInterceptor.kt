package com.neshastyar.app.data.api

import java.io.IOException
import java.net.ConnectException
import java.net.NoRouteToHostException
import java.net.UnknownHostException
import okhttp3.Interceptor
import okhttp3.Response

/** Shown after the connection retries are exhausted. Never show the raw DNS text. */
object NetworkErrors {
    const val CANNOT_CONNECT = "Cannot connect to server."

    fun isUnreachable(error: Throwable): Boolean {
        var current: Throwable? = error
        while (current != null) {
            if (current is CannotConnectException ||
                current is UnknownHostException ||
                current is ConnectException ||
                current is NoRouteToHostException
            ) {
                return true
            }
            val message = current.message.orEmpty()
            if (message.contains("Unable to resolve host", ignoreCase = true) ||
                message.contains("No address associated with hostname", ignoreCase = true) ||
                message.contains(CANNOT_CONNECT, ignoreCase = true)
            ) {
                return true
            }
            current = current.cause
        }
        return false
    }

    /** True when [ConnectRetryInterceptor] already used its attempts. */
    fun alreadyRetried(error: Throwable): Boolean {
        var current: Throwable? = error
        while (current != null) {
            if (current is CannotConnectException || current.message == CANNOT_CONNECT) return true
            current = current.cause
        }
        return false
    }

    fun userMessage(error: Throwable, fallback: String): String {
        if (isUnreachable(error)) return CANNOT_CONNECT
        return error.message?.trim().orEmpty().ifBlank { fallback }
    }
}

class CannotConnectException(cause: IOException) : IOException(NetworkErrors.CANNOT_CONNECT, cause)

/**
 * On DNS / connect failure, try the request 3 times with 3 seconds between attempts.
 * The raw host error is replaced so no screen can show it.
 */
class ConnectRetryInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        var last: IOException? = null
        repeat(ATTEMPTS) { attempt ->
            try {
                return chain.proceed(chain.request())
            } catch (e: IOException) {
                if (!NetworkErrors.isUnreachable(e) || e is CannotConnectException) throw e
                last = e
                if (attempt == ATTEMPTS - 1) return@repeat
                if (!pause()) throw CannotConnectException(e)
            }
        }
        throw CannotConnectException(last ?: IOException(NetworkErrors.CANNOT_CONNECT))
    }

    private fun pause(): Boolean {
        return try {
            Thread.sleep(GAP_MS)
            true
        } catch (e: InterruptedException) {
            Thread.currentThread().interrupt()
            false
        }
    }

    private companion object {
        const val ATTEMPTS = 3
        const val GAP_MS = 3_000L
    }
}
