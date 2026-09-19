package com.neshastyar.app.data.api

import okhttp3.Interceptor
import okhttp3.Response
import com.neshastyar.app.data.local.SessionStore
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val sessionStore: SessionStore,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val token = sessionStore.accessTokenBlocking()
        if (token.isNullOrBlank()) {
            return chain.proceed(original)
        }
        val authenticated = original.newBuilder()
            .header("Authorization", "Bearer $token")
            .build()
        return chain.proceed(authenticated)
    }
}
