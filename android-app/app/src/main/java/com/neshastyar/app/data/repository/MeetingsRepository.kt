package com.neshastyar.app.data.repository

import com.neshastyar.app.data.api.AudioFileDto
import com.neshastyar.app.data.api.MeetingDto
import com.neshastyar.app.data.api.NeshastyarApi
import com.neshastyar.app.data.api.UpdateMeetingRequest
import javax.inject.Inject
import javax.inject.Singleton

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
            val response = api.getMeetings(limit = limit, orderBy = "created_at", orderDirection = "DESC")
            if (response.isSuccessful) MeetingsResult.Ok(response.body().orEmpty())
            else MeetingsResult.Err(errorMessage(response.code()))
        } catch (e: Exception) {
            MeetingsResult.Err(e.message ?: "خطا در بارگذاری جلسات")
        }
    }

    suspend fun getById(id: String): MeetingsResult<MeetingDto> {
        return try {
            val response = api.getMeeting(id)
            val body = response.body()
            if (response.isSuccessful && body != null) MeetingsResult.Ok(body)
            else MeetingsResult.Err(if (response.code() == 404) "جلسه پیدا نشد" else errorMessage(response.code()))
        } catch (e: Exception) {
            MeetingsResult.Err(e.message ?: "خطا در بارگذاری جلسه")
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

    suspend fun analyze(id: String): Result<Unit> = runCatching {
        val r = api.analyzeMeeting(id)
        if (!r.isSuccessful) error("درخواست پردازش ناموفق (${r.code()})")
    }

    suspend fun delete(id: String): Result<Unit> = runCatching {
        val r = api.deleteMeeting(id)
        if (!r.isSuccessful) error("حذف ناموفق (${r.code()})")
    }

    suspend fun sendMail(meetingId: String): Result<String> = runCatching {
        val url = "https://neshastyar.com/sendmail/$meetingId"
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

    private fun errorMessage(code: Int): String = when (code) {
        401, 403 -> "نشست منقضی شده؛ دوباره وارد شوید"
        429 -> "تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید"
        else -> "خطا در دریافت جلسات ($code)"
    }
}