package com.neshastyar.app.data.api

data class LatestAndroidResponse(
    val data: LatestAndroidData? = null,
    val error: String? = null,
    val message: String? = null,
)

data class LatestAndroidData(
    val version: String? = null,
    val major: Int? = null,
    val minor: Int? = null,
    val build: String? = null,
    val filename: String? = null,
    val size: Long? = null,
    val downloadUrl: String? = null,
    val downloadPath: String? = null,
)
