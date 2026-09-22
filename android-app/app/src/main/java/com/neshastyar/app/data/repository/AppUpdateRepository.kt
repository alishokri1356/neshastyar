package com.neshastyar.app.data.repository

import com.neshastyar.app.BuildConfig
import com.neshastyar.app.data.api.LatestAndroidData
import com.neshastyar.app.data.api.NeshastyarApi
import javax.inject.Inject
import javax.inject.Singleton

data class AppUpdateInfo(
    val currentVersion: String,
    val latestVersion: String,
    val downloadUrl: String,
)

@Singleton
class AppUpdateRepository @Inject constructor(
    private val api: NeshastyarApi,
) {
    suspend fun findAvailableUpdate(): AppUpdateInfo? {
        return try {
            val response = api.getLatestAndroidApp()
            val latest = response.body()?.data.takeIf { response.isSuccessful } ?: return null
            toUpdateInfo(latest)
        } catch (_: Exception) {
            null
        }
    }

    private fun toUpdateInfo(latest: LatestAndroidData): AppUpdateInfo? {
        val latestVersion = latest.version?.trim().orEmpty()
        if (latestVersion.isBlank()) return null

        val currentVersion = BuildConfig.VERSION_NAME
        val currentKey = versionSortKey(currentVersion) ?: return null
        val latestKey = versionSortKey(latestVersion) ?: return null
        if (latestKey <= currentKey) return null

        val downloadUrl = latest.downloadUrl?.trim().orEmpty().ifBlank {
            latest.filename
                ?.takeIf { it.isNotBlank() }
                ?.let { "${BuildConfig.API_BASE_URL.trimEnd('/')}/android/latest/download/$it" }
                .orEmpty()
        }
        if (downloadUrl.isBlank()) return null

        return AppUpdateInfo(
            currentVersion = currentVersion,
            latestVersion = latestVersion,
            downloadUrl = downloadUrl,
        )
    }

    companion object {
        fun versionSortKey(version: String): Long? {
            val parts = version.trim().split('.')
            if (parts.size < 3) return null
            val major = parts[0].toLongOrNull() ?: return null
            val minor = parts[1].toLongOrNull() ?: return null
            val build = parts[2].toLongOrNull() ?: return null
            return major * 1_000_000L + minor * 1_000L + build
        }
    }
}
