package com.neshastyar.app.data.repository

import com.squareup.moshi.Moshi
import com.neshastyar.app.data.api.AuthResponse
import com.neshastyar.app.data.api.EmailOnlyRequest
import com.neshastyar.app.data.api.LoginRequest
import com.neshastyar.app.data.api.NeshastyarApi
import com.neshastyar.app.data.api.SessionDto
import com.neshastyar.app.data.api.SignupRequest
import com.neshastyar.app.data.api.UserDto
import com.neshastyar.app.data.local.SessionStore
import retrofit2.Response
import javax.inject.Inject
import javax.inject.Singleton

sealed class AuthResult {
    data class Success(val user: UserDto?, val session: SessionDto?) : AuthResult()
    data class NeedsVerification(val email: String?, val message: String) : AuthResult()
    data class Error(val message: String) : AuthResult()
    data object LoggedOut : AuthResult()
}

@Singleton
class AuthRepository @Inject constructor(
    private val api: NeshastyarApi,
    private val sessionStore: SessionStore,
    moshi: Moshi,
) {
    private val authErrorAdapter = moshi.adapter(AuthResponse::class.java)

    fun hasStoredSession(): Boolean = sessionStore.hasSession()

    fun currentEmail(): String? = sessionStore.email()
    fun currentName(): String? = sessionStore.name()

    suspend fun login(email: String, password: String): AuthResult {
        return try {
            val response = api.login(LoginRequest(email.trim(), password))
            handleAuthResponse(response)
        } catch (e: Exception) {
            AuthResult.Error(e.message ?: "خطا در ارتباط با سرور")
        }
    }

    suspend fun signup(email: String, password: String, name: String?): AuthResult {
        return try {
            val response = api.signup(SignupRequest(email.trim(), password, name?.ifBlank { null }))
            if (response.isSuccessful) {
                val body = response.body()
                AuthResult.NeedsVerification(
                    email = body?.data?.user?.email ?: email,
                    message = body?.data?.message
                        ?: "ثبت‌نام موفق. لطفاً ایمیل خود را برای تأیید حساب بررسی کنید.",
                )
            } else {
                parseError(response)
            }
        } catch (e: Exception) {
            AuthResult.Error(e.message ?: "خطا در ارتباط با سرور")
        }
    }

    suspend fun verifyStoredSession(): AuthResult {
        if (!sessionStore.hasSession()) return AuthResult.LoggedOut
        return try {
            val response = api.verify()
            when {
                response.code() == 429 -> AuthResult.Success(
                    user = UserDto(
                        id = sessionStore.userId(),
                        email = sessionStore.email(),
                        name = sessionStore.name(),
                    ),
                    session = null,
                )
                response.isSuccessful -> {
                    val session = response.body()?.data?.session
                    if (session?.access_token.isNullOrBlank()) {
                        sessionStore.clear()
                        AuthResult.LoggedOut
                    } else {
                        persistSession(session!!)
                        AuthResult.Success(session.user, session)
                    }
                }
                response.code() == 403 -> {
                    sessionStore.clear()
                    AuthResult.NeedsVerification(
                        email = sessionStore.email(),
                        message = "ایمیل تأیید نشده. لطفاً صندوق ورودی خود را بررسی کنید.",
                    )
                }
                else -> {
                    sessionStore.clear()
                    AuthResult.LoggedOut
                }
            }
        } catch (e: Exception) {
            // Offline with cached token: keep session for UX; protected calls will fail later
            if (sessionStore.hasSession()) {
                AuthResult.Success(
                    user = UserDto(
                        id = sessionStore.userId(),
                        email = sessionStore.email(),
                        name = sessionStore.name(),
                    ),
                    session = null,
                )
            } else {
                AuthResult.LoggedOut
            }
        }
    }

    suspend fun logout() {
        try {
            api.logout()
        } catch (_: Exception) {
        } finally {
            sessionStore.clear()
        }
    }

    suspend fun requestPasswordReset(email: String): AuthResult {
        return try {
            val response = api.requestPasswordReset(EmailOnlyRequest(email.trim()))
            if (response.isSuccessful) {
                AuthResult.Success(null, null)
            } else {
                parseError(response)
            }
        } catch (e: Exception) {
            AuthResult.Error(e.message ?: "خطا در ارتباط با سرور")
        }
    }

    suspend fun resendVerification(email: String): AuthResult {
        return try {
            val response = api.resendVerification(EmailOnlyRequest(email.trim()))
            if (response.isSuccessful) {
                AuthResult.Success(null, null)
            } else {
                parseError(response)
            }
        } catch (e: Exception) {
            AuthResult.Error(e.message ?: "خطا در ارتباط با سرور")
        }
    }

    private fun handleAuthResponse(response: Response<AuthResponse>): AuthResult {
        if (response.isSuccessful) {
            val session = response.body()?.data?.session
            val user = response.body()?.data?.user ?: session?.user
            if (session?.access_token.isNullOrBlank()) {
                return AuthResult.Error("ورود ناموفق بود")
            }
            persistSession(session!!)
            return AuthResult.Success(user, session)
        }
        if (response.code() == 403) {
            val err = parseAuthBody(response)
            if (err?.requiresVerification == true ||
                err?.error?.contains("verified", ignoreCase = true) == true
            ) {
                return AuthResult.NeedsVerification(
                    email = err.user?.email,
                    message = "ایمیل تأیید نشده. لطفاً ابتدا ایمیل خود را تأیید کنید.",
                )
            }
        }
        return parseError(response)
    }

    private fun <T> parseError(response: Response<T>): AuthResult {
        val err = parseAuthBody(response)
        val msg = when {
            !err?.message.isNullOrBlank() -> err!!.message!!
            !err?.error.isNullOrBlank() -> err!!.error!!
            response.code() == 401 -> "ایمیل یا رمز عبور نامعتبر است"
            response.code() == 409 -> "این ایمیل قبلاً ثبت شده است"
            response.code() == 429 -> "تعداد تلاش‌ها زیاد است. کمی بعد دوباره امتحان کنید"
            else -> "خطا (${response.code()})"
        }
        return AuthResult.Error(persianize(msg))
    }

    private fun <T> parseAuthBody(response: Response<T>): AuthResponse? {
        val raw = response.errorBody()?.string().orEmpty()
        if (raw.isBlank()) return null
        return try {
            authErrorAdapter.fromJson(raw)
        } catch (_: Exception) {
            null
        }
    }

    private fun persistSession(session: SessionDto) {
        val user = session.user
        sessionStore.saveSession(
            accessToken = session.access_token.orEmpty(),
            userId = user?.id,
            email = user?.email,
            name = user?.name,
            expiresAt = session.expires_at,
        )
    }

    private fun persianize(msg: String): String = when {
        msg.contains("Invalid", ignoreCase = true) -> "ایمیل یا رمز عبور نامعتبر است"
        msg.contains("already exists", ignoreCase = true) -> "این ایمیل قبلاً ثبت شده است"
        msg.contains("required", ignoreCase = true) -> "ایمیل و رمز عبور الزامی است"
        msg.contains("Database unavailable", ignoreCase = true) -> "سرور موقتاً در دسترس نیست"
        else -> msg
    }
}