package com.neshastyar.app.data.repository

import com.neshastyar.app.data.api.AiEditMeetingRequest
import com.neshastyar.app.data.api.AiEditMeetingResponse
import com.neshastyar.app.data.api.AnalyzeMeetingRequest
import com.neshastyar.app.data.api.AnalyzeModelDto
import com.neshastyar.app.data.api.AnalyzeModelsResponse
import com.neshastyar.app.data.api.AudioFileDto
import com.neshastyar.app.data.api.MeetingDto
import com.neshastyar.app.data.api.NeshastyarApi
import com.neshastyar.app.data.api.NetworkErrors
import com.neshastyar.app.data.api.ShareMeetingResponse
import com.neshastyar.app.data.api.UpdateMeetingRequest
import java.net.SocketTimeoutException
import javax.inject.Inject
import javax.inject.Singleton
import org.json.JSONObject

sealed class MeetingsResult<out T> {
    data class Ok<T>(val data: T) : MeetingsResult<T>()
    data class Err(val message: String) : MeetingsResult<Nothing>()
}

@Singleton
class MeetingsRepository @Inject constructor(
    private val api: NeshastyarApi,
) {
    suspend fun listRecent(limit: Int = 50): MeetingsResult<List<MeetingDto>> {
        return try {
            val response = api.getMeetings(
                limit = limit,
                orderBy = "created_at",
                orderDirection = "DESC",
                compact = "1",
            )
            if (response.isSuccessful) MeetingsResult.Ok(response.body().orEmpty())
            else MeetingsResult.Err(errorMessage(response.code()))
        } catch (e: Exception) {
            MeetingsResult.Err(friendlyError(e))
        }
    }

    suspend fun getById(id: String): MeetingsResult<MeetingDto> {
        return try {
            val response = api.getMeeting(id)
            val body = response.body()
            if (response.isSuccessful && body != null) MeetingsResult.Ok(body)
            else MeetingsResult.Err(if (response.code() == 404) "جلسه پیدا نشد" else errorMessage(response.code()))
        } catch (e: Exception) {
            MeetingsResult.Err(friendlyError(e).ifBlank { "خطا در بارگذاری جلسه" })
        }
    }

    suspend fun getAudioFiles(meetingId: String): List<AudioFileDto> {
        return try {
            val response = api.getMeetingAudioFiles(meetingId)
            if (response.isSuccessful) response.body()?.data.orEmpty() else emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    suspend fun update(id: String, body: UpdateMeetingRequest): Result<MeetingDto> = runCatching {
        val r = api.updateMeeting(id, body)
        if (!r.isSuccessful) error("ذخیره ناموفق (${r.code()})")
        r.body() ?: error("پاسخ خالی")
    }

    suspend fun aiEdit(id: String, prompt: String): Result<AiEditMeetingResponse> = runCatching {
        val r = try {
            api.aiEditMeeting(id, AiEditMeetingRequest(prompt = prompt))
        } catch (e: Exception) {
            if (NetworkErrors.isUnreachable(e)) error(NetworkErrors.CANNOT_CONNECT)
            if (e is SocketTimeoutException) error("ویرایش هوشمند طولانی شد، دوباره تلاش کنید")
            throw e
        }
        val body = r.body()
        if (r.isSuccessful && body?.meeting != null) return@runCatching body
        val serverMessage = r.errorBody()?.string()?.let { raw ->
            runCatching { JSONObject(raw).optString("message") }.getOrNull()
        }?.takeIf { it.isNotBlank() }
        error(
            serverMessage ?: when (r.code()) {
                401, 403 -> "نشست منقضی شده؛ دوباره وارد شوید"
                404 -> "جلسه پیدا نشد"
                409 -> "ویرایش قبلی این جلسه هنوز در حال انجام است"
                else -> "ویرایش هوشمند ناموفق بود (${r.code()})"
            },
        )
    }

    suspend fun analyze(id: String, model: String? = null): Result<Unit> = runCatching {
        val body = AnalyzeMeetingRequest(model = model?.takeIf { it.isNotBlank() })
        val r = api.analyzeMeeting(id, body)
        if (!r.isSuccessful) error("درخواست پردازش ناموفق (${r.code()})")
    }

    suspend fun getAnalyzeModels(): AnalyzeModelsResponse {
        return try {
            val r = api.getAnalyzeModels()
            r.body()?.takeIf { r.isSuccessful && it.models.isNotEmpty() } ?: fallbackAnalyzeModels()
        } catch (_: Exception) {
            fallbackAnalyzeModels()
        }
    }

    suspend fun shareMeeting(id: String): Result<ShareMeetingResponse> = runCatching {
        val r = api.shareMeeting(id)
        val body = r.body()
        if (!r.isSuccessful || body?.url.isNullOrBlank()) {
            error("ساخت لینک صورتجلسه ناموفق (${r.code()})")
        }
        body!!
    }

    suspend fun disableMeetingShare(id: String): Result<Unit> = runCatching {
        val r = api.disableMeetingShare(id)
        if (!r.isSuccessful) error("غیرفعال کردن لینک ناموفق (${r.code()})")
    }

    companion object {
        fun fallbackAnalyzeModels(): AnalyzeModelsResponse = AnalyzeModelsResponse(
            autoKey = "auto",
            autoOrder = listOf(
                "gemini_flash",
                "gemini_4_argon",
                "deepseek_v41_flash",
                "glm_53",
                "qwen38_27b",
                "gemma4_31b_free",
                "nvidia",
            ),
            manualFallback = listOf("gemma4_31b_free", "nvidia"),
            models = listOf(
                AnalyzeModelDto(key = "gemini_flash", label = "Gemini Flash", kind = "major", provider = "google"),
                AnalyzeModelDto(key = "gemini_4_argon", label = "Gemini 4 Argon", kind = "major", provider = "openrouter"),
                AnalyzeModelDto(key = "gpt_61_sol", label = "GPT-6.1 Sol", kind = "major", provider = "openrouter"),
                AnalyzeModelDto(key = "claude_sonnet_55", label = "Claude Sonnet 5.5", kind = "major", provider = "openrouter"),
                AnalyzeModelDto(key = "nvidia", label = "NVIDIA Nemotron", kind = "open_weight", provider = "nvidia"),
                AnalyzeModelDto(key = "deepseek_v41_flash", label = "DeepSeek V4.1 Flash", kind = "open_weight", provider = "openrouter"),
                AnalyzeModelDto(key = "qwen38_27b", label = "Qwen3.8 27B", kind = "open_weight", provider = "openrouter"),
                AnalyzeModelDto(key = "glm_53", label = "GLM-5.3", kind = "open_weight", provider = "openrouter"),
                AnalyzeModelDto(key = "gemma4_31b_free", label = "Gemma 4 31B", kind = "open_weight", provider = "openrouter"),
            ),
        )

        fun modelLabel(
            key: String?,
            models: List<AnalyzeModelDto> = fallbackAnalyzeModels().models,
            autoKey: String = "auto",
        ): String {
            if (key.isNullOrBlank() || key == autoKey) return "Auto (پیشنهادی)"
            return models.firstOrNull { it.key == key }?.label ?: key
        }
    }

    suspend fun delete(id: String): Result<Unit> = runCatching {
        val r = api.deleteMeeting(id)
        if (!r.isSuccessful) error("حذف ناموفق (${r.code()})")
    }

    suspend fun sendMail(meetingId: String): Result<String> = runCatching {
        val url = "https://www.neshastyar.com/sendmail/$meetingId"
        val r = api.sendMail(url)
        when {
            r.isSuccessful -> "ایمیل ارسال شد"
            r.code() == 429 -> {
                val cool = r.body()?.cooldownRemaining
                if (cool != null) "لطفاً $cool ثانیه صبر کنید" else (r.body()?.message ?: "کمی بعد دوباره تلاش کنید")
            }
            else -> error(r.body()?.message ?: "ارسال ایمیل ناموفق (${r.code()})")
        }
    }

    suspend fun untaggedMeetings(): Result<List<MeetingDto>> = runCatching {
        val r = api.getUntaggedMeetings()
        if (!r.isSuccessful) error("خطا (${r.code()})")
        r.body().orEmpty()
    }

    private fun friendlyError(error: Exception): String {
        if (NetworkErrors.isUnreachable(error)) return NetworkErrors.CANNOT_CONNECT
        val raw = error.message.orEmpty()
        if (raw.contains("connection closed", ignoreCase = true) ||
            raw.contains("unexpected end of stream", ignoreCase = true) ||
            raw.contains("stream was reset", ignoreCase = true)
        ) {
            return "ارتباط با سرور قطع شد. دوباره تلاش کنید"
        }
        return raw.ifBlank { "خطا در بارگذاری جلسات" }
    }

    private fun errorMessage(code: Int): String = when (code) {
        401, 403 -> "نشست منقضی شده؛ دوباره وارد شوید"
        429 -> "تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید"
        else -> "خطا در دریافت جلسات ($code)"
    }
}