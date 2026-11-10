package com.neshastyar.app.data.repository

import android.content.Context
import android.net.Uri
import com.neshastyar.app.BuildConfig
import com.neshastyar.app.data.api.NeshastyarApi
import com.neshastyar.app.data.api.NetworkErrors
import com.neshastyar.app.data.api.PublicReportDto
import com.neshastyar.app.data.api.PublicReportEditRequest
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PublicReportRepository @Inject constructor(
    private val api: NeshastyarApi,
    @ApplicationContext private val context: Context,
) {
    suspend fun fetchReport(token: String): Result<PublicReportDto> = runCatching {
        val response = try {
            api.getPublicReport(token.trim())
        } catch (e: Exception) {
            throw IllegalStateException(NetworkErrors.userMessage(e, "خطا در دریافت صورتجلسه"))
        }
        val body = response.body()
        if (response.isSuccessful && body != null) {
            withAbsoluteLogo(body)
        } else {
            error(extractServerError(response.errorBody()?.string()) ?: "صورتجلسه پیدا نشد")
        }
    }

    suspend fun updateReport(token: String, edit: PublicReportEditRequest): Result<PublicReportDto> = runCatching {
        val response = try {
            api.updatePublicReport(token.trim(), edit)
        } catch (e: Exception) {
            throw IllegalStateException(NetworkErrors.userMessage(e, "ذخیره صورتجلسه انجام نشد"))
        }
        val body = response.body()
        if (response.isSuccessful && body != null) {
            withAbsoluteLogo(body)
        } else {
            error(extractServerError(response.errorBody()?.string()) ?: "ذخیره صورتجلسه انجام نشد")
        }
    }

    suspend fun uploadLogo(token: String, uri: Uri): Result<PublicReportDto> = runCatching {
        val mime = context.contentResolver.getType(uri) ?: "image/png"
        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            ?: error("خواندن فایل تصویر ناموفق بود")
        if (bytes.size > 2 * 1024 * 1024) {
            error("حجم لوگو باید کمتر از ۲ مگابایت باشد")
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
        val response = try {
            api.uploadPublicReportLogo(token.trim(), part)
        } catch (e: Exception) {
            throw IllegalStateException(NetworkErrors.userMessage(e, "ذخیره لوگو انجام نشد"))
        }
        val body = response.body()
        if (response.isSuccessful && body != null) {
            withAbsoluteLogo(body)
        } else {
            error(extractServerError(response.errorBody()?.string()) ?: "ذخیره لوگو انجام نشد")
        }
    }

    companion object {
        fun absoluteFromApiPath(apiPath: String): String {
            if (apiPath.startsWith("http://", ignoreCase = true) ||
                apiPath.startsWith("https://", ignoreCase = true)
            ) {
                return apiPath
            }
            val origin = BuildConfig.API_BASE_URL.replace(Regex("/api/?$"), "")
            val cleanPath = if (apiPath.startsWith("/")) apiPath else "/$apiPath"
            return "$origin$cleanPath"
        }

        fun withAbsoluteLogo(report: PublicReportDto): PublicReportDto {
            val logo = report.logoUrl
            if (logo.isNullOrBlank()) return report
            return report.copy(logoUrl = absoluteFromApiPath(logo))
        }

        private fun extractServerError(raw: String?): String? {
            if (raw.isNullOrBlank()) return null
            return runCatching {
                val obj = JSONObject(raw)
                obj.optString("message").ifBlank { obj.optString("error") }
            }.getOrNull()?.takeIf { it.isNotBlank() }
        }
    }
}
