package com.neshastyar.app.navigation

import android.net.Uri

/** Mirrors web routes from src/App.tsx */
sealed class Routes(val route: String) {
    data object Splash : Routes("splash")
    data object Login : Routes("login")
    data object SignUp : Routes("signup")
    data object ForgotPassword : Routes("forgot_password")
    data object VerifyEmail : Routes("verify-email/{token}") {
        fun create(token: String) = "verify-email/${Uri.encode(token)}"
    }
    data object ResetPassword : Routes("reset-password/{token}") {
        fun create(token: String) = "reset-password/${Uri.encode(token)}"
    }
    data object MeetingReport : Routes("report/{token}") {
        fun create(token: String) = "report/${Uri.encode(token)}"
    }
    data object Home : Routes("home")
    data object Search : Routes("search")
    data object MeetingsByDate : Routes("meetings_by_date")
    data object Record : Routes("record")
    data object TagSelection : Routes("tag_selection/{draftId}") {
        fun create(draftId: String) = "tag_selection/$draftId"
    }
    data object Tags : Routes("tags")
    data object TagDetail : Routes("tag/{tagId}") {
        fun create(tagId: String) = "tag/$tagId"
    }
    data object TagManage : Routes("tags/manage")
    data object Participants : Routes("participants")
    data object ParticipantDetail : Routes("participant/{participantId}") {
        fun create(id: String) = "participant/$id"
    }
    data object ParticipantsManage : Routes("participants/manage")
    data object MeetingDetail : Routes("meeting/{meetingId}") {
        fun create(id: String) = "meeting/$id"
    }
    data object MeetingOptions : Routes("meeting/{meetingId}/options") {
        fun create(id: String) = "meeting/$id/options"
    }
    data object MeetingConversation : Routes("meeting/{meetingId}/conversation") {
        fun create(id: String) = "meeting/$id/conversation"
    }
    data object MeetingParticipants : Routes("meeting/{meetingId}/participants") {
        fun create(id: String) = "meeting/$id/participants"
    }
    data object MeetingAddParticipants : Routes("meeting/{meetingId}/participants/add") {
        fun create(id: String) = "meeting/$id/participants/add"
    }
    data object MeetingTags : Routes("meeting/{meetingId}/tags") {
        fun create(id: String) = "meeting/$id/tags"
    }
    data object MeetingAddTags : Routes("meeting/{meetingId}/tags/add") {
        fun create(id: String) = "meeting/$id/tags/add"
    }
    data object MeetingBulletPoints : Routes("meeting/{meetingId}/points") {
        fun create(id: String) = "meeting/$id/points"
    }
    data object MeetingMinutes : Routes("meeting/{meetingId}/minutes") {
        fun create(id: String) = "meeting/$id/minutes"
    }
    data object MeetingDelete : Routes("meeting/{meetingId}/delete") {
        fun create(id: String) = "meeting/$id/delete"
    }
    data object Account : Routes("account")
    data object Chat : Routes("chat/{sessionKey}?meetingId={meetingId}") {
        fun create(meetingId: String? = null, sessionId: String? = null): String {
            val key = sessionId?.takeIf { it.isNotBlank() } ?: "new"
            val meeting = meetingId?.takeIf { it.isNotBlank() }.orEmpty()
            return "chat/$key?meetingId=$meeting"
        }
    }
    data object ChatHistory : Routes("chat-history?meetingId={meetingId}") {
        fun create(meetingId: String? = null): String {
            val meeting = meetingId?.takeIf { it.isNotBlank() } ?: ""
            return "chat-history?meetingId=$meeting"
        }
    }
}
