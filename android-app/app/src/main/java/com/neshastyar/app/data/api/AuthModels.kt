package com.neshastyar.app.data.api

data class LoginRequest(
    val email: String,
    val password: String,
)

data class SignupRequest(
    val email: String,
    val password: String,
    val name: String? = null,
)

data class EmailOnlyRequest(
    val email: String,
)

data class ResetPasswordRequest(
    val token: String,
    val newPassword: String,
)

data class ProfileUpdateRequest(
    val name: String? = null,
    val baleID: String? = null,
)

data class AuthResponse(
    val data: AuthData? = null,
    val error: String? = null,
    val message: String? = null,
    val requiresVerification: Boolean? = null,
    val user: UserDto? = null,
)

data class AuthData(
    val user: UserDto? = null,
    val session: SessionDto? = null,
    val message: String? = null,
)

data class SessionDto(
    val access_token: String? = null,
    val token_type: String? = null,
    val expires_in: Int? = null,
    val expires_at: String? = null,
    val refresh_token: String? = null,
    val user: UserDto? = null,
)

data class UserDto(
    val id: String? = null,
    val email: String? = null,
    val name: String? = null,
    val baleID: String? = null,
    val created_at: String? = null,
    val updated_at: String? = null,
)

data class ProfileResponse(
    val data: ProfileData? = null,
    val error: String? = null,
    val message: String? = null,
)

data class ProfileData(
    val user: UserDto? = null,
)

data class SimpleSuccessResponse(
    val data: SimpleSuccessData? = null,
    val error: String? = null,
    val message: String? = null,
)

data class SimpleSuccessData(
    val success: Boolean? = null,
    val message: String? = null,
)

data class VerifyResponse(
    val data: VerifyData? = null,
    val error: Any? = null,
)

data class VerifyData(
    val session: SessionDto? = null,
)