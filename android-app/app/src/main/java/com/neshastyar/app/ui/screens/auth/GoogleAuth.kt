package com.neshastyar.app.ui.screens.auth

import android.content.Context
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.neshastyar.app.R
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential

class GoogleSignInCancelledException : Exception()

@Composable
fun GoogleLogo(modifier: Modifier = Modifier) {
    Image(
        painter = painterResource(R.drawable.ic_google),
        contentDescription = null,
        modifier = modifier.size(20.dp),
    )
}

/**
 * Button flow for Sign in / Sign up with Google.
 * [GetGoogleIdOption] only returns accounts that already authorized this app, which
 * surfaces as "No credentials available" for a first-time registration.
 * [GetSignInWithGoogleOption] opens the account picker so a new Google account can register.
 */
suspend fun requestGoogleIdToken(context: Context, webClientId: String): String {
    val credentialManager = CredentialManager.create(context)
    val buttonRequest = GetCredentialRequest.Builder()
        .addCredentialOption(GetSignInWithGoogleOption.Builder(webClientId).build())
        .build()

    return try {
        extractGoogleIdToken(credentialManager.getCredential(context, buttonRequest))
    } catch (e: GetCredentialCancellationException) {
        throw GoogleSignInCancelledException()
    } catch (e: GetCredentialException) {
        val fallbackRequest = GetCredentialRequest.Builder()
            .addCredentialOption(
                GetGoogleIdOption.Builder()
                    .setFilterByAuthorizedAccounts(false)
                    .setServerClientId(webClientId)
                    .setAutoSelectEnabled(false)
                    .build(),
            )
            .build()
        try {
            extractGoogleIdToken(credentialManager.getCredential(context, fallbackRequest))
        } catch (cancelled: GetCredentialCancellationException) {
            throw GoogleSignInCancelledException()
        } catch (fallbackError: NoCredentialException) {
            throw IllegalStateException(
                "حساب گوگلی روی این دستگاه پیدا نشد. یک حساب گوگل اضافه کنید و دوباره تلاش کنید.",
            )
        } catch (fallbackError: GetCredentialException) {
            throw fallbackError
        }
    }
}

private fun extractGoogleIdToken(result: androidx.credentials.GetCredentialResponse): String {
    val credential = result.credential
    if (credential is CustomCredential &&
        credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
    ) {
        return GoogleIdTokenCredential.createFrom(credential.data).idToken
    }
    throw IllegalStateException("نوع ورود گوگل پشتیبانی نمی‌شود")
}

fun googleAuthErrorMessage(error: Throwable, fallback: String): String {
    if (error is GoogleSignInCancelledException) return ""
    val raw = error.message?.trim().orEmpty()
    if (raw.contains("No credentials available", ignoreCase = true)) {
        return "حساب گوگلی روی این دستگاه پیدا نشد. یک حساب گوگل اضافه کنید و دوباره تلاش کنید."
    }
    return raw.ifBlank { fallback }
}
