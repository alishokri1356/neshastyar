package com.neshastyar.app.data.api

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Url

interface NeshastyarApi {
    // Auth
    @POST("auth/google")
    suspend fun googleAuth(@Body body: GoogleAuthRequest): Response<AuthResponse>

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): Response<AuthResponse>

    @POST("auth/signup")
    suspend fun signup(@Body body: SignupRequest): Response<AuthResponse>

    @POST("auth/logout")
    suspend fun logout(): Response<AuthResponse>

    @POST("auth/verify")
    suspend fun verify(): Response<VerifyResponse>

    @GET("auth/profile")
    suspend fun getProfile(): Response<ProfileResponse>

    @PUT("auth/profile")
    suspend fun updateProfile(@Body body: ProfileUpdateRequest): Response<ProfileResponse>

    @Multipart
    @POST("auth/profile/logo")
    suspend fun uploadProfileLogo(@Part logo: MultipartBody.Part): Response<ProfileResponse>

    @GET("auth/verify-email")
    suspend fun verifyEmail(@Query("token") token: String): Response<SimpleSuccessResponse>

    @POST("auth/request-password-reset")
    suspend fun requestPasswordReset(@Body body: EmailOnlyRequest): Response<SimpleSuccessResponse>

    @POST("auth/resend-verification")
    suspend fun resendVerification(@Body body: EmailOnlyRequest): Response<SimpleSuccessResponse>

    @POST("auth/reset-password")
    suspend fun resetPassword(@Body body: ResetPasswordRequest): Response<SimpleSuccessResponse>

    @GET("android/latest")
    suspend fun getLatestAndroidApp(): Response<LatestAndroidResponse>

    // Meetings
    @GET("meetings")
    suspend fun getMeetings(
        @Query("limit") limit: Int? = null,
        @Query("orderBy") orderBy: String? = null,
        @Query("orderDirection") orderDirection: String? = null,
        @Query("compact") compact: String? = null,
    ): Response<List<MeetingDto>>

    @GET("meetings/analyze-models")
    suspend fun getAnalyzeModels(): Response<AnalyzeModelsResponse>

    @GET("meetings/untagged")
    suspend fun getUntaggedMeetings(): Response<List<MeetingDto>>

    @GET("meetings/{id}")
    suspend fun getMeeting(@Path("id") id: String): Response<MeetingDto>

    @POST("meetings")
    suspend fun createMeeting(@Body body: CreateMeetingRequest): Response<MeetingDto>

    @PUT("meetings/{id}")
    suspend fun updateMeeting(@Path("id") id: String, @Body body: UpdateMeetingRequest): Response<MeetingDto>

    @POST("meetings/{id}/analyze")
    suspend fun analyzeMeeting(
        @Path("id") id: String,
        @Body body: AnalyzeMeetingRequest = AnalyzeMeetingRequest(),
    ): Response<AnalyzeResponse>

    @POST("meetings/{id}/share")
    suspend fun shareMeeting(@Path("id") id: String): Response<ShareMeetingResponse>

    @DELETE("meetings/{id}/share")
    suspend fun disableMeetingShare(@Path("id") id: String): Response<ShareMeetingResponse>

    @POST("meetings/{id}/ai-edit")
    suspend fun aiEditMeeting(
        @Path("id") id: String,
        @Body body: AiEditMeetingRequest,
    ): Response<AiEditMeetingResponse>

    @DELETE("meetings/{id}")
    suspend fun deleteMeeting(@Path("id") id: String): Response<SuccessResponse>

    @GET("meetings/{meetingId}/audio-files")
    suspend fun getMeetingAudioFiles(@Path("meetingId") meetingId: String): Response<AudioFilesResponse>

    @Multipart
    @POST("upload/audio")
    suspend fun uploadAudio(@Part audio: MultipartBody.Part): Response<UploadAudioResponse>

    @POST("upload/sessions")
    suspend fun createUploadSession(@Body body: CreateUploadSessionRequest): Response<UploadSessionResponse>

    @GET("upload/sessions/{uploadId}")
    suspend fun getUploadSession(@Path("uploadId") uploadId: String): Response<UploadSessionResponse>

    @PATCH("upload/sessions/{uploadId}")
    suspend fun appendUploadChunk(
        @Path("uploadId") uploadId: String,
        @Query("offset") offset: Long,
        @Body body: RequestBody,
    ): Response<UploadSessionResponse>

    @POST("upload/sessions/{uploadId}/complete")
    suspend fun completeUploadSession(@Path("uploadId") uploadId: String): Response<UploadAudioResponse>

    @POST("audio-files")
    suspend fun createAudioFile(@Body body: CreateAudioFileRequest): Response<CreateAudioFileResponse>

    // Tags
    @GET("tags")
    suspend fun getTags(
        @Query("withCount") withCount: Boolean? = null,
        @Query("orderBy") orderBy: String? = null,
        @Query("orderDirection") orderDirection: String? = null,
    ): Response<List<TagDto>>

    @GET("tags/management")
    suspend fun getTagsManagement(): Response<TagsManagementResponse>

    @GET("tags/{id}")
    suspend fun getTag(@Path("id") id: String): Response<TagDto>

    @GET("tags/{id}/meetings")
    suspend fun getTagMeetings(@Path("id") id: String): Response<List<MeetingDto>>

    @POST("tags")
    suspend fun createTag(@Body body: CreateTagRequest): Response<TagDto>

    @PUT("tags/{id}")
    suspend fun updateTag(@Path("id") id: String, @Body body: UpdateTagRequest): Response<TagDto>

    @DELETE("tags/{id}")
    suspend fun deleteTag(@Path("id") id: String): Response<SuccessResponse>

    @POST("tags/merge")
    suspend fun mergeTags(@Body body: MergeTagsRequest): Response<Map<String, Any?>>

    // Meeting-tags
    @GET("meeting-tags")
    suspend fun getMeetingTags(
        @Query("meeting_id") meetingId: String? = null,
        @Query("tag_id") tagId: String? = null,
    ): Response<List<MeetingTagDto>>

    @POST("meeting-tags")
    suspend fun createMeetingTag(@Body body: CreateMeetingTagRequest): Response<MeetingTagDto>

    @DELETE("meeting-tags")
    suspend fun deleteMeetingTag(
        @Query("meeting_id") meetingId: String,
        @Query("tag_id") tagId: String,
    ): Response<SuccessResponse>

    @GET("meeting-tags/meetings/{meetingId}/tags")
    suspend fun getTagsForMeeting(@Path("meetingId") meetingId: String): Response<List<TagDto>>

    @GET("meeting-tags/tags/{tagId}/meetings")
    suspend fun getMeetingsForTag(@Path("tagId") tagId: String): Response<List<MeetingDto>>

    // Participants
    @GET("participants")
    suspend fun getParticipants(): Response<ParticipantsListResponse>

    @GET("participants/no-meetings")
    suspend fun getMeetingsWithoutParticipants(): Response<NoParticipantsMeetingsResponse>

    @POST("participants")
    suspend fun createParticipant(@Body body: CreateParticipantRequest): Response<ParticipantDto>

    @GET("participants/{id}")
    suspend fun getParticipant(@Path("id") id: String): Response<ParticipantDto>

    @GET("participants/{id}/meetings")
    suspend fun getParticipantMeetings(@Path("id") id: String): Response<ParticipantMeetingsResponse>

    @PUT("participants/{id}")
    suspend fun updateParticipant(
        @Path("id") id: String,
        @Body body: UpdateParticipantRequest,
    ): Response<RenameParticipantResponse>

    @POST("participants/merge")
    suspend fun mergeParticipants(@Body body: MergeParticipantsRequest): Response<Map<String, Any?>>

    @DELETE("participants/{id}")
    suspend fun deleteParticipant(@Path("id") id: String): Response<SuccessResponse>

    @GET("meeting-participants/meetings/{meetingId}/participants")
    suspend fun getMeetingParticipants(@Path("meetingId") meetingId: String): Response<List<ParticipantDto>>

    @POST("meeting-participants")
    suspend fun addMeetingParticipant(@Body body: CreateMeetingParticipantRequest): Response<MeetingParticipantCreateResponse>

    @DELETE("meeting-participants")
    suspend fun removeMeetingParticipant(
        @Query("meeting_id") meetingId: String,
        @Query("participant_id") participantId: String,
    ): Response<SuccessResponse>

    @GET
    suspend fun sendMail(@Url url: String): Response<SendMailResponse>

    // Chat
    @GET("chats")
    suspend fun getChatSessions(
        @Query("meetingId") meetingId: String? = null,
        @Query("scope") scope: String? = null,
    ): Response<List<ChatSessionDto>>

    @POST("chats")
    suspend fun createChatSession(@Body body: CreateChatSessionRequest): Response<ChatSessionDto>

    @GET("chats/{id}")
    suspend fun getChatSession(@Path("id") id: String): Response<ChatSessionDto>

    @DELETE("chats/{id}")
    suspend fun deleteChatSession(@Path("id") id: String): Response<SuccessResponse>

    @POST("chats/{id}/messages")
    suspend fun sendChatMessage(
        @Path("id") id: String,
        @Body body: SendChatMessageRequest,
    ): Response<SendChatMessageResponse>

    // Dictation
    @Multipart
    @POST("dictation/transcribe")
    suspend fun transcribeDictation(@Part audio: MultipartBody.Part): Response<DictationResponse>

    // Public Shareable Minutes Report (صورتجلسه)
    @GET("public/reports/{token}")
    suspend fun getPublicReport(@Path("token") token: String): Response<PublicReportDto>

    @PATCH("public/reports/{token}")
    suspend fun updatePublicReport(
        @Path("token") token: String,
        @Body body: PublicReportEditRequest,
    ): Response<PublicReportDto>

    @Multipart
    @POST("public/reports/{token}/logo")
    suspend fun uploadPublicReportLogo(
        @Path("token") token: String,
        @Part logo: MultipartBody.Part,
    ): Response<PublicReportDto>
}