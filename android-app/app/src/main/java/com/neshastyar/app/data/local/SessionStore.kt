package com.neshastyar.app.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionStore @Inject constructor(
    @ApplicationContext context: Context,
) {
    private val prefs: SharedPreferences = run {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        EncryptedSharedPreferences.create(
            "neshastyar_session",
            masterKeyAlias,
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    fun accessTokenBlocking(): String? = prefs.getString(KEY_ACCESS_TOKEN, null)
    fun userId(): String? = prefs.getString(KEY_USER_ID, null)
    fun email(): String? = prefs.getString(KEY_EMAIL, null)
    fun name(): String? = prefs.getString(KEY_NAME, null)
    fun expiresAt(): String? = prefs.getString(KEY_EXPIRES_AT, null)

    fun saveSession(
        accessToken: String,
        userId: String?,
        email: String?,
        name: String?,
        expiresAt: String?,
    ) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_USER_ID, userId)
            .putString(KEY_EMAIL, email)
            .putString(KEY_NAME, name)
            .putString(KEY_EXPIRES_AT, expiresAt)
            .apply()
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    fun hasSession(): Boolean = !accessTokenBlocking().isNullOrBlank()

    companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_EMAIL = "email"
        private const val KEY_NAME = "name"
        private const val KEY_EXPIRES_AT = "expires_at"
    }
}