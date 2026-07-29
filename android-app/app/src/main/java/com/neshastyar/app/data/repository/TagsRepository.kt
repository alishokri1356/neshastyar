package com.neshastyar.app.data.repository

import com.neshastyar.app.data.api.CreateMeetingTagRequest
import com.neshastyar.app.data.api.CreateTagRequest
import com.neshastyar.app.data.api.MergeTagsRequest
import com.neshastyar.app.data.api.NeshastyarApi
import com.neshastyar.app.data.api.TagDto
import com.neshastyar.app.data.api.TagsManagementResponse
import com.neshastyar.app.data.api.UpdateTagRequest
import com.neshastyar.app.data.api.MeetingDto
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TagsRepository @Inject constructor(
    private val api: NeshastyarApi,
) {
    suspend fun list(withCount: Boolean = false): Result<List<TagDto>> = runCatching {
        val r = api.getTags(withCount = if (withCount) true else null, orderBy = "name", orderDirection = "ASC")
        if (!r.isSuccessful) error("خطا در دریافت برچسب‌ها (${r.code()})")
        r.body().orEmpty()
    }

    suspend fun management(): Result<TagsManagementResponse> = runCatching {
        val r = api.getTagsManagement()
        if (!r.isSuccessful) error("خطا در مدیریت برچسب‌ها (${r.code()})")
        r.body() ?: TagsManagementResponse()
    }

    suspend fun get(id: String): Result<TagDto> = runCatching {
        val r = api.getTag(id)
        r.body() ?: error("برچسب پیدا نشد")
    }

    suspend fun meetingsForTag(tagId: String): Result<List<MeetingDto>> = runCatching {
        val r = api.getMeetingsForTag(tagId)
        if (!r.isSuccessful) error("خطا (${r.code()})")
        r.body().orEmpty()
    }

    suspend fun create(name: String, color: String? = "#0F766E"): Result<TagDto> = runCatching {
        val r = api.createTag(CreateTagRequest(name = name.trim(), color = color))
        if (!r.isSuccessful) {
            if (r.code() == 409) error("این نام برچسب تکراری است")
            error("ایجاد برچسب ناموفق (${r.code()})")
        }
        r.body() ?: error("پاسخ خالی")
    }

    suspend fun rename(id: String, name: String): Result<TagDto> = runCatching {
        val r = api.updateTag(id, UpdateTagRequest(name = name.trim()))
        if (!r.isSuccessful) error("تغییر نام ناموفق")
        r.body() ?: error("پاسخ خالی")
    }

    suspend fun delete(id: String): Result<Unit> = runCatching {
        val r = api.deleteTag(id)
        if (!r.isSuccessful) error("حذف ناموفق")
    }

    suspend fun merge(sourceNames: List<String>, targetName: String): Result<Unit> = runCatching {
        val r = api.mergeTags(MergeTagsRequest(sourceNames, targetName.trim()))
        if (!r.isSuccessful) error("ادغام ناموفق (${r.code()})")
    }

    suspend fun tagsForMeeting(meetingId: String): Result<List<TagDto>> = runCatching {
        val r = api.getTagsForMeeting(meetingId)
        if (!r.isSuccessful) {
            // fallback via meeting-tags join list
            val links = api.getMeetingTags(meetingId = meetingId).body().orEmpty()
            val all = api.getTags().body().orEmpty().associateBy { it.id }
            links.mapNotNull { link -> link.tag_id?.let { all[it] } }
        } else r.body().orEmpty()
    }

    suspend fun link(meetingId: String, tagId: String): Result<Unit> = runCatching {
        val r = api.createMeetingTag(CreateMeetingTagRequest(meetingId, tagId))
        if (!r.isSuccessful && r.code() != 409) error("افزودن برچسب ناموفق")
    }

    suspend fun unlink(meetingId: String, tagId: String): Result<Unit> = runCatching {
        val r = api.deleteMeetingTag(meetingId, tagId)
        if (!r.isSuccessful) error("حذف برچسب ناموفق")
    }
}