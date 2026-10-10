package com.neshastyar.app.data.local

import android.content.Context

/** Temporary tag and participant picks for a recording draft, kept across process death. */
internal object DraftSelectionStore {
    private const val PREFS = "upload_resume"

    fun save(context: Context, draftId: String, tagIds: Set<String>, participantIds: Set<String>) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putStringSet(tagsKey(draftId), HashSet(tagIds))
            .putStringSet(peopleKey(draftId), HashSet(participantIds))
            .commit()
    }

    fun load(context: Context, draftId: String): Pair<Set<String>, Set<String>> {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val tags = prefs.getStringSet(tagsKey(draftId), emptySet()).orEmpty().toSet()
        val people = prefs.getStringSet(peopleKey(draftId), emptySet()).orEmpty().toSet()
        return tags to people
    }

    fun clear(context: Context, draftId: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .remove(tagsKey(draftId))
            .remove(peopleKey(draftId))
            .commit()
    }

    private fun tagsKey(draftId: String) = "tags_$draftId"

    private fun peopleKey(draftId: String) = "participants_$draftId"
}
