package com.neshastyar.app.ui.screens.auth

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.MutableContextWrapper
import android.util.Base64
import android.view.View
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import com.neshastyar.app.R
import com.neshastyar.app.ui.theme.CredentialWindowGuard
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import java.security.SecureRandom

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
    val activity = context.findActivity()
    // The picker is a separate window. Edge-to-edge plus RTL leaves it on screen and
    // drops taps, so the account list never returns a token.
    val window = activity.window
    val decor = window.decorView
    val previousDirection = decor.layoutDirection
    CredentialWindowGuard.active = true
    WindowCompat.setDecorFitsSystemWindows(window, true)
    decor.layoutDirection = View.LAYOUT_DIRECTION_LTR
    val credentialManager = CredentialManager.create(activity)
    val host = MutableContextWrapper(activity)
    val nonce = newNonce()
    return try {
        val buttonRequest = GetCredentialRequest.Builder()
            .addCredentialOption(
                GetSignInWithGoogleOption.Builder(webClientId)
                    .setNonce(nonce)
                    .build(),
            )
            .build()
        try {
            extractGoogleIdToken(credentialManager.getCredential(host, buttonRequest))
        } catch (e: GetCredentialCancellationException) {
            throw GoogleSignInCancelledException()
        } catch (e: NoCredentialException) {
            val fallbackRequest = GetCredentialRequest.Builder()
                .addCredentialOption(
                    GetGoogleIdOption.Builder()
                        .setFilterByAuthorizedAccounts(false)
                        .setServerClientId(webClientId)
                        .setAutoSelectEnabled(false)
                        .setNonce(nonce)
                        .build(),
                )
                .build()
            try {
                extractGoogleIdToken(credentialManager.getCredential(host, fallbackRequest))
            } catch (cancelled: GetCredentialCancellationException) {
                throw GoogleSignInCancelledException()
            } catch (fallbackError: NoCredentialException) {
                throw IllegalStateException(
                    "حساب گوگلی روی این دستگاه پیدا نشد. یک حساب گوگل اضافه کنید و دوباره تلاش کنید.",
                )
            }
        }
    } finally {
        runCatching {
            decor.layoutDirection = previousDirection
            WindowCompat.setDecorFitsSystemWindows(window, false)
        }
        CredentialWindowGuard.active = false
    }
}

private fun Context.findActivity(): Activity {
    var current = this
    while (current is ContextWrapper) {
        if (current is Activity) return current
        current = current.baseContext
    }
    error("Google sign-in needs an Activity context")
}

private fun newNonce(): String {
    val bytes = ByteArray(32)
    SecureRandom().nextBytes(bytes)
    return Base64.encodeToString(bytes, Base64.NO_WRAP or Base64.URL_SAFE or Base64.NO_PADDING)
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
