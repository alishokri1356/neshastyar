package com.neshastyar.app.navigation

import android.content.Intent
import android.net.Uri

/** Incoming https links for verify-email, reset-password, and /report/:token. */
sealed class AppLink {
    data class VerifyEmail(val token: String) : AppLink()
    data class ResetPassword(val token: String) : AppLink()
    data class Report(val token: String) : AppLink()
}

object AppLinks {
    private val hosts = setOf("www.neshastyar.com", "neshastyar.com")

    fun from(intent: Intent?): AppLink? {
        val uri = intent?.data ?: return null
        if (!uri.scheme.equals("https", ignoreCase = true)) return null
        val host = uri.host?.lowercase() ?: return null
        if (host !in hosts) return null
        val path = uri.path.orEmpty().trimEnd('/')
        return when {
            path == "/verify-email" -> tokenQuery(uri)?.let(AppLink::VerifyEmail)
            path == "/reset-password" -> tokenQuery(uri)?.let(AppLink::ResetPassword)
            path.startsWith("/report/") -> {
                val token = Uri.decode(path.removePrefix("/report/").substringBefore('/'))
                    .trim()
                    .takeIf { it.isNotEmpty() }
                token?.let(AppLink::Report)
            }
            else -> null
        }
    }

    private fun tokenQuery(uri: Uri): String? =
        uri.getQueryParameter("token")?.trim()?.takeIf { it.isNotEmpty() }
}
