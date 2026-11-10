package com.neshastyar.app.data.repository

import com.neshastyar.app.data.api.NeshastyarApi
import com.neshastyar.app.data.api.NetworkErrors
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import org.json.JSONObject
import java.io.File
import java.net.SocketTimeoutException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DictationRepository @Inject constructor(
    private val api: NeshastyarApi,
) {
    suspend fun transcribe(file: File): Result<String> = runCatching {
        val part = MultipartBody.Part.createFormData(
            "audio",
            file.name,
            file.asRequestBody("audio/mp4".toMediaTypeOrNull()),
        )
        val r = try {
            api.transcribeDictation(part)
        } catch (e: Exception) {
            if (NetworkErrors.isUnreachable(e)) error(NetworkErrors.CANNOT_CONNECT)
            if (e is SocketTimeoutException) error("تبدیل گفتار طولانی شد، دوباره تلاش کنید")
            throw e
        }
        val body = r.body()
        if (r.isSuccessful && body != null) return@runCatching body.text.orEmpty().trim()
        val serverMessage = r.errorBody()?.string()?.let { raw ->
            runCatching { JSONObject(raw).optString("message") }.getOrNull()
        }?.takeIf { it.isNotBlank() }
        error(
            serverMessage ?: when (r.code()) {
                401, 403 -> "نشست منقضی شده؛ دوباره وارد شوید"
                429 -> "تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید"
                else -> "تبدیل گفتار به متن ناموفق بود (${r.code()})"
            },
        )
    }
}

@EntryPoint
@InstallIn(SingletonComponent::class)
interface DictationEntryPoint {
    fun dictationRepository(): DictationRepository
}
