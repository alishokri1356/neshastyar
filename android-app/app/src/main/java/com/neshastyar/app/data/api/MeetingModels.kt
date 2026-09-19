package com.neshastyar.app.data.api

import com.squareup.moshi.Json

data class MeetingDto(
    val id: String,
    val user_id: String? = null,
    val title: String? = null,
    val meeting_date: String? = null,
    val status: String? = null,
    val summary: String? = null,
    @Json(name = "CommentText") val commentText: String? = null,
    val html: String? = null,
    val people: String? = null,
    val transcription: String? = null,
    val created_at: String? = null,
    val updated_at: String? = null,
    val lastTimeEmailSent: String? = null,
)

data class AudioFileDto(
    val id: String? = null,
    val meeting_id: String? = null,
    val file_name: String? = null,
    val file_path: String? = null,
    val file_size: Long? = null,
    val duration: Double? = null,
    val format: String? = null,
    val upload_order: Int? = null,
    val created_at: String? = null,
    val updated_at: String? = null,
)

data class AudioFilesResponse(
    val data: List<AudioFileDto>? = null,
    val error: String? = null,
)