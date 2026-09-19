package com.neshastyar.app.navigation

/** Mirrors web routes from src/App.tsx */
sealed class Routes(val route: String) {
    data object Splash : Routes("splash")
    data object Login : Routes("login")
    data object SignUp : Routes("signup")
    data object ForgotPassword : Routes("forgot_password")
    data object Home : Routes("home")
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
    data object MeetingDelete : Routes("meeting/{meetingId}/delete") {
        fun create(id: String) = "meeting/$id/delete"
    }
    data object Account : Routes("account")
}
