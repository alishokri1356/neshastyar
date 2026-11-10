package com.neshastyar.app.data.local

import android.content.Context

/** Temporary tag, participant, and model picks for a recording draft, kept across process death. */
internal object DraftSelectionStore {
    private const val PREFS = "upload_resume"

    data class Selection(
        val tagIds: Set<String>,
        val participantIds: Set<String>,
        val analyzeModel: String?,
    )

    fun save(
        context: Context,
        draftId: String,
        tagIds: Set<String>,
        participantIds: Set<String>,
        analyzeModel: String? = null,
    ) {
        val editor = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putStringSet(tagsKey(draftId), HashSet(tagIds))
            .putStringSet(peopleKey(draftId), HashSet(participantIds))
        if (analyzeModel != null) {
            editor.putString(modelKey(draftId), analyzeModel)
        }
        editor.commit()
    }

    fun load(context: Context, draftId: String): Selection {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val tags = prefs.getStringSet(tagsKey(draftId), emptySet()).orEmpty().toSet()
        val people = prefs.getStringSet(peopleKey(draftId), emptySet()).orEmpty().toSet()
        val model = prefs.getString(modelKey(draftId), null)
        return Selection(tags, people, model)
    }

    fun clear(context: Context, draftId: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .remove(tagsKey(draftId))
            .remove(peopleKey(draftId))
            .remove(modelKey(draftId))
            .commit()
    }

    private fun tagsKey(draftId: String) = "tags_$draftId"

    private fun peopleKey(draftId: String) = "participants_$draftId"

    private fun modelKey(draftId: String) = "analyze_model_$draftId"
}
