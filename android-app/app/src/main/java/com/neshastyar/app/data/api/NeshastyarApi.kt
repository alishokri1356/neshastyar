package com.neshastyar.app.data.api

import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Url

interface NeshastyarApi {
    // Auth
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

    @POST("auth/request-password-reset")
    suspend fun requestPasswordReset(@Body body: EmailOnlyRequest): Response<SimpleSuccessResponse>

    @POST("auth/resend-verification")
    suspend fun resendVerification(@Body body: EmailOnlyRequest): Response<SimpleSuccessResponse>

    @POST("auth/reset-password")
    suspend fun resetPassword(@Body body: ResetPasswordRequest): Response<SimpleSuccessResponse>

    // Meetings
    @GET("meetings")
    suspend fun getMeetings(
        @Query("limit") limit: Int? = null,
        @Query("orderBy") orderBy: String? = null,
        @Query("orderDirection") orderDirection: String? = null,
    ): Response<List<MeetingDto>>

    @GET("meetings/untagged")
    suspend fun getUntaggedMeetings(): Response<List<MeetingDto>>

    @GET("meetings/{id}")
    suspend fun getMeeting(@Path("id") id: String): Response<MeetingDto>

    @POST("meetings")
    suspend fun createMeeting(@Body body: CreateMeetingRequest): Response<MeetingDto>

    @PUT("meetings/{id}")
    suspend fun updateMeeting(@Path("id") id: String, @Body body: UpdateMeetingRequest): Response<MeetingDto>

    @POST("meetings/{id}/analyze")
    suspend fun analyzeMeeting(@Path("id") id: String): Response<AnalyzeResponse>

    @DELETE("meetings/{id}")
    suspend fun deleteMeeting(@Path("id") id: String): Response<SuccessResponse>

    @GET("meetings/{meetingId}/audio-files")
    suspend fun getMeetingAudioFiles(@Path("meetingId") meetingId: String): Response<AudioFilesResponse>

    @Multipart
    @POST("upload/audio")
    suspend fun uploadAudio(@Part audio: MultipartBody.Part): Response<UploadAudioResponse>

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
    suspend fun updateParticipant(@Path("id") id: String, @Body body: UpdateParticipantRequest): Response<ParticipantDto>

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
}