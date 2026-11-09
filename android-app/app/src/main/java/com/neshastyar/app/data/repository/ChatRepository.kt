package com.neshastyar.app.data.repository

import com.neshastyar.app.data.api.ChatSessionDto
import com.neshastyar.app.data.api.CreateChatSessionRequest
import com.neshastyar.app.data.api.NeshastyarApi
import com.neshastyar.app.data.api.NetworkErrors
import com.neshastyar.app.data.api.SendChatMessageRequest
import com.neshastyar.app.data.api.SendChatMessageResponse
import java.net.SocketTimeoutException
import javax.inject.Inject
import javax.inject.Singleton

sealed class ChatResult<out T> {
    data class Ok<T>(val data: T) : ChatResult<T>()
    data class Err(val message: String) : ChatResult<Nothing>()
}

@Singleton
class ChatRepository @Inject constructor(
    private val api: NeshastyarApi,
) {
    suspend fun listSessions(meetingId: String? = null, scope: String? = null): ChatResult<List<ChatSessionDto>> {
        return try {
            val response = api.getChatSessions(meetingId = meetingId, scope = scope)
            if (response.isSuccessful) ChatResult.Ok(response.body().orEmpty())
            else ChatResult.Err(errorMessage(response.code()))
        } catch (e: Exception) {
            ChatResult.Err(friendlyError(e))
        }
    }

    suspend fun createSession(meetingId: String? = null): ChatResult<ChatSessionDto> {
        return try {
            val response = api.createChatSession(CreateChatSessionRequest(meetingId = meetingId))
            val body = response.body()
            if (response.isSuccessful && body != null) ChatResult.Ok(body)
            else ChatResult.Err(errorMessage(response.code()))
        } catch (e: Exception) {
            ChatResult.Err(friendlyError(e))
        }
    }

    suspend fun getSession(id: String): ChatResult<ChatSessionDto> {
        return try {
            val response = api.getChatSession(id)
            val body = response.body()
            if (response.isSuccessful && body != null) ChatResult.Ok(body)
            else ChatResult.Err(if (response.code() == 404) "گفتگو پیدا نشد" else errorMessage(response.code()))
        } catch (e: Exception) {
            ChatResult.Err(friendlyError(e))
        }
    }

    suspend fun deleteSession(id: String): ChatResult<Unit> {
        return try {
            val response = api.deleteChatSession(id)
            if (response.isSuccessful) ChatResult.Ok(Unit)
            else ChatResult.Err(errorMessage(response.code()))
        } catch (e: Exception) {
            ChatResult.Err(friendlyError(e))
        }
    }

    suspend fun sendMessage(sessionId: String, content: String): ChatResult<SendChatMessageResponse> {
        return try {
            val response = api.sendChatMessage(sessionId, SendChatMessageRequest(content = content))
            val body = response.body()
            if (response.isSuccessful && body != null) ChatResult.Ok(body)
            else {
                val apiMessage = body?.message ?: body?.error
                ChatResult.Err(apiMessage ?: errorMessage(response.code()))
            }
        } catch (e: Exception) {
            ChatResult.Err(friendlyError(e))
        }
    }

    private fun friendlyError(error: Exception): String {
        if (NetworkErrors.isUnreachable(error)) return NetworkErrors.CANNOT_CONNECT
        if (error is SocketTimeoutException ||
            error.message.orEmpty().contains("timeout", ignoreCase = true)
        ) {
            return "پاسخ‌گویی طولانی شد، دوباره تلاش کنید"
        }
        val raw = error.message.orEmpty()
        if (raw.contains("connection closed", ignoreCase = true) ||
            raw.contains("unexpected end of stream", ignoreCase = true) ||
            raw.contains("stream was reset", ignoreCase = true)
        ) {
            return "ارتباط با سرور قطع شد. دوباره تلاش کنید"
        }
        return raw.ifBlank { "خطا در گفتگو" }
    }

    private fun errorMessage(code: Int): String = when (code) {
        401, 403 -> "نشست منقضی شده؛ دوباره وارد شوید"
        404 -> "گفتگو پیدا نشد"
        409 -> "پاسخ قبلی هنوز در حال آماده‌سازی است"
        429 -> "تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید"
        else -> "خطا در گفتگو ($code)"
    }
}
