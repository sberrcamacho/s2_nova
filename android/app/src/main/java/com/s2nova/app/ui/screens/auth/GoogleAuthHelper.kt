package com.s2nova.app.ui.screens.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential

// Wraps Credential Manager's "Sign in with Google" flow — see
// docs/ARCHITECTURE.md §7 and build.gradle.kts's `googleWebClientId` comment for
// why `serverClientId` is the Web OAuth client ID even on Android.
object GoogleAuthHelper {
    suspend fun getIdToken(context: Context, serverClientId: String): Result<String> = runCatching {
        val option = GetGoogleIdOption.Builder()
            .setServerClientId(serverClientId)
            .setFilterByAuthorizedAccounts(false)
            .build()

        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
        val response = CredentialManager.create(context).getCredential(context, request)

        val credential = response.credential
        check(credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            "Unexpected credential type from Credential Manager."
        }

        GoogleIdTokenCredential.createFrom(credential.data).idToken
    }

    // What to tell the user when the flow fails: nothing when they closed
    // the picker, a way out when the phone has no Google account, otherwise
    // `fallback` (the caller's server/generic message).
    fun failureMessage(error: Throwable, fallback: () -> String): String? = when (error) {
        is GetCredentialCancellationException -> null
        is NoCredentialException -> com.s2nova.app.ui.tr(com.s2nova.app.ui.StringKey.AUTH_GOOGLE_NO_ACCOUNT)
        else -> fallback()
    }
}
