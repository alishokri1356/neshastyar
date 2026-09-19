package com.neshastyar.app.data.repository

import com.neshastyar.app.data.api.CreateMeetingParticipantRequest
import com.neshastyar.app.data.api.CreateParticipantRequest
import com.neshastyar.app.data.api.MeetingDto
import com.neshastyar.app.data.api.MergeParticipantsRequest
import com.neshastyar.app.data.api.NeshastyarApi
import com.neshastyar.app.data.api.ParticipantDto
import com.neshastyar.app.data.api.ParticipantsListResponse
import com.neshastyar.app.data.api.UpdateParticipantRequest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ParticipantsRepository @Inject constructor(
    private val api: NeshastyarApi,
) {
    suspend fun list(): Result<ParticipantsListResponse> = runCatching {
        val r = api.getParticipants()
        if (!r.isSuccessful) error("خطا در دریافت افراد (${r.code()})")
        r.body() ?: ParticipantsListResponse()
    }

    suspend fun meetings(id: String): Result<Pair<ParticipantDto?, List<MeetingDto>>> = runCatching {
        val r = api.getParticipantMeetings(id)
        if (!r.isSuccessful) error("خطا (${r.code()})")
        val body = r.body()
        body?.participant to body?.meetings.orEmpty()
    }

    suspend fun meetingsWithoutParticipants(): Result<List<MeetingDto>> = runCatching {
        val r = api.getMeetingsWithoutParticipants()
        if (!r.isSuccessful) error("خطا (${r.code()})")
        r.body()?.meetings.orEmpty()
    }

    suspend fun create(name: String): Result<ParticipantDto> = runCatching {
        val r = api.createParticipant(CreateParticipantRequest(name.trim()))
        if (!r.isSuccessful) error("ایجاد ناموفق")
        r.body() ?: error("پاسخ خالی")
    }

    suspend fun rename(id: String, name: String): Result<ParticipantDto> = runCatching {
        val r = api.updateParticipant(id, UpdateParticipantRequest(name = name.trim()))
        if (!r.isSuccessful) error("تغییر نام ناموفق")
        r.body() ?: error("پاسخ خالی")
    }

    suspend fun delete(id: String): Result<Unit> = runCatching {
        val r = api.deleteParticipant(id)
        if (!r.isSuccessful) error("حذف ناموفق")
    }

    suspend fun merge(sourceIds: List<String>, targetName: String): Result<Unit> = runCatching {
        val r = api.mergeParticipants(MergeParticipantsRequest(sourceIds = sourceIds, targetName = targetName.trim()))
        if (!r.isSuccessful) error("ادغام ناموفق (${r.code()})")
    }

    suspend fun forMeeting(meetingId: String): Result<List<ParticipantDto>> = runCatching {
        val r = api.getMeetingParticipants(meetingId)
        if (!r.isSuccessful) error("خطا (${r.code()})")
        r.body().orEmpty()
    }

    suspend fun addToMeeting(meetingId: String, participantId: String?, name: String?): Result<Unit> = runCatching {
        val r = api.addMeetingParticipant(
            CreateMeetingParticipantRequest(meeting_id = meetingId, participant_id = participantId, name = name),
        )
        if (!r.isSuccessful) error("افزودن فرد ناموفق")
    }

    suspend fun removeFromMeeting(meetingId: String, participantId: String): Result<Unit> = runCatching {
        val r = api.removeMeetingParticipant(meetingId, participantId)
        if (!r.isSuccessful) error("حذف فرد ناموفق")
    }
}