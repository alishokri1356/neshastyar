package com.neshastyar.app.data.api

data class ChatMessageDto(
    val id: String,
    val session_id: String? = null,
    val role: String,
    val content: String,
    val model_used: String? = null,
    val status: String? = null,
    val created_at: String? = null,
)

data class ChatSessionDto(
    val id: String,
    val user_id: String? = null,
    val meeting_id: String? = null,
    val scope: String,
    val title: String? = null,
    val meeting_title: String? = null,
    val last_message_preview: String? = null,
    val last_message_at: String? = null,
    val created_at: String? = null,
    val updated_at: String? = null,
    val messages: List<ChatMessageDto>? = null,
)

data class CreateChatSessionRequest(
    val meetingId: String? = null,
)

data class SendChatMessageRequest(
    val content: String,
)

data class SendChatMessageResponse(
    val session: ChatSessionDto? = null,
    val userMessage: ChatMessageDto? = null,
    val assistantMessage: ChatMessageDto? = null,
    val error: String? = null,
    val message: String? = null,
)
