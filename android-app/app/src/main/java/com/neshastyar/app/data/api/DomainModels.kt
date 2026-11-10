package com.neshastyar.app.data.api

import com.squareup.moshi.Json

data class CreateMeetingRequest(
    val title: String? = null,
    val meeting_date: String? = null,
    val status: String? = null,
    val summary: String? = null,
    @Json(name = "CommentText") val commentText: String? = null,
)

data class UpdateMeetingRequest(
    val title: String? = null,
    val meeting_date: String? = null,
    val status: String? = null,
    val summary: String? = null,
    @Json(name = "CommentText") val commentText: String? = null,
)

data class AiEditMeetingRequest(
    val prompt: String,
)

data class AiEditMeetingResponse(
    val meeting: MeetingDto? = null,
    val participants: List<ParticipantDto>? = null,
    val tags: List<TagDto>? = null,
    val model_used: String? = null,
    val changes_summary: String? = null,
)

data class UploadAudioData(
    val path: String? = null,
    val relativePath: String? = null,
    val size: Long? = null,
    val format: String? = null,
    val originalName: String? = null,
    val filename: String? = null,
)

data class UploadAudioResponse(
    val data: UploadAudioData? = null,
    val error: String? = null,
)

data class CreateUploadSessionRequest(
    val uploadId: String,
    val fileName: String,
    val totalSize: Long,
    val mimeType: String,
)

data class UploadSessionData(
    val uploadId: String? = null,
    val bytesReceived: Long? = null,
    val totalSize: Long? = null,
    val complete: Boolean? = null,
    val relativePath: String? = null,
    val size: Long? = null,
    val format: String? = null,
    val originalName: String? = null,
    val filename: String? = null,
)

data class UploadSessionResponse(
    val data: UploadSessionData? = null,
    val error: String? = null,
    val message: String? = null,
)

data class CreateAudioFileRequest(
    val meeting_id: String,
    val file_name: String,
    val file_path: String,
    val file_size: Long? = null,
    val duration: Int? = null,
    val format: String? = null,
    val upload_order: Int? = null,
)

data class CreateAudioFileResponse(
    val data: AudioFileDto? = null,
    val error: String? = null,
)

data class AnalyzeResponse(
    val success: Boolean? = null,
    val meetingId: String? = null,
    val usedTestWebhook: Boolean? = null,
    val status: String? = null,
)

data class TagDto(
    val id: String,
    val name: String? = null,
    val color: String? = null,
    val user_id: String? = null,
    val meeting_count: Int? = null,
    val created_at: String? = null,
    val updated_at: String? = null,
)

data class CreateTagRequest(
    val name: String,
    val color: String? = null,
)

data class UpdateTagRequest(
    val name: String? = null,
    val color: String? = null,
)

data class TagsManagementResponse(
    val tags: List<TagDto> = emptyList(),
    val untaggedMeetingsCount: Int = 0,
)

data class MergeTagsRequest(
    val sourceTagNames: List<String>,
    val targetTagName: String,
)

data class MeetingTagDto(
    val id: String? = null,
    val meeting_id: String? = null,
    val tag_id: String? = null,
)

data class CreateMeetingTagRequest(
    val meeting_id: String,
    val tag_id: String,
)

data class SuccessResponse(
    val success: Boolean? = null,
)

data class ParticipantDto(
    val id: String,
    val name: String? = null,
    val meetingCount: Int? = null,
    val user_id: String? = null,
)

data class ParticipantsListResponse(
    val participants: List<ParticipantDto> = emptyList(),
    val noParticipantsCount: Int = 0,
)

data class ParticipantMeetingsResponse(
    val participant: ParticipantDto? = null,
    val meetings: List<MeetingDto> = emptyList(),
)

data class NoParticipantsMeetingsResponse(
    val meetings: List<MeetingDto> = emptyList(),
)

data class CreateParticipantRequest(
    val name: String,
)

data class UpdateParticipantRequest(
    val name: String? = null,
    val newName: String? = null,
)

data class RenameParticipantResponse(
    val updatedMeetings: Int? = null,
    val participant: ParticipantDto? = null,
)

data class MergeParticipantsRequest(
    val sourceIds: List<String>? = null,
    val sourceNames: List<String>? = null,
    val targetName: String,
)

data class CreateMeetingParticipantRequest(
    val meeting_id: String,
    val participant_id: String? = null,
    val name: String? = null,
)

data class MeetingParticipantCreateResponse(
    val relationship: Any? = null,
    val participants: List<ParticipantDto>? = null,
)

data class AnalyzeMeetingRequest(
    val model: String? = null,
)

data class AnalyzeModelDto(
    val key: String,
    val label: String,
    val kind: String? = null,
    val provider: String? = null,
)

data class AnalyzeModelsResponse(
    val autoKey: String = "auto",
    val autoOrder: List<String> = emptyList(),
    val manualFallback: List<String> = emptyList(),
    val models: List<AnalyzeModelDto> = emptyList(),
)

data class ShareMeetingResponse(
    val token: String? = null,
    val url: String? = null,
    val enabled: Boolean? = null,
)

data class MeetingDecisionDto(
    val text: String = "",
    val assignee: String = "",
    val deadline: String = "",
)

data class PublicReportDto(
    val title: String = "",
    val meetingDate: String? = null,
    val participants: List<String> = emptyList(),
    val decisions: List<MeetingDecisionDto> = emptyList(),
    val summaryText: String = "",
    val location: String = "",
    val orgName: String? = null,
    val logoUrl: String? = null,
    val message: String? = null,
)

data class PublicReportEditRequest(
    val field: String,
    val value: String? = null,
    val index: Int? = null,
    val part: String? = null,
)

data class SendMailResponse(
    val data: Any? = null,
    val error: String? = null,
    val message: String? = null,
    val cooldownRemaining: Int? = null,
)