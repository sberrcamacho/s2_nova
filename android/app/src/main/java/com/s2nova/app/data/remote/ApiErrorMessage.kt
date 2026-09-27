package com.s2nova.app.data.remote

import java.io.IOException
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import retrofit2.HttpException
import com.s2nova.app.ui.tr
import com.s2nova.app.ui.StringKey

@Serializable
private data class ErrorBody(val error: String? = null)

private val errorJson = Json { ignoreUnknownKeys = true }

// Auth screens have no ViewModel to normalize errors in, so this turns a
// raw Retrofit/OkHttp failure into a message worth showing the user: the
// backend's specific reason (duplicate email, wrong credentials, ...) when
// there is one, a distinct message when the backend is unreachable (not
// the user's fault), and the caller's fallback otherwise.
fun Throwable.toUserMessage(fallback: String): String = when (this) {
    is HttpException -> {
        val body = response()?.errorBody()?.string()
        val parsed = body?.let { runCatching { errorJson.decodeFromString<ErrorBody>(it) }.getOrNull() }
        parsed?.error?.let { SERVER_MESSAGES[it]?.let(::tr) } ?: fallback
    }
    is IOException -> tr(StringKey.API_OFFLINE)
    else -> fallback
}

// The backend's error sentences a user can meet here, in the app language;
// any other one reads as the caller's fallback.
private val SERVER_MESSAGES = mapOf(
    "Invalid email or password." to StringKey.AUTH_BAD_CREDENTIALS,
    "An account with that email already exists." to StringKey.API_EMAIL_TAKEN,
    "An account with that email already exists. Sign in with your password, or verify this email with Google first." to StringKey.API_EMAIL_TAKEN_GOOGLE,
    "Incorrect password." to StringKey.API_WRONG_PASSWORD,
    "The new password must differ from the current one." to StringKey.API_SAME_PASSWORD,
    "Set a password before changing your email." to StringKey.API_PASSWORD_FIRST_EMAIL,
    "Set a password before deleting your account." to StringKey.API_PASSWORD_FIRST_DELETE,
    "Invalid Google token." to StringKey.AUTH_GOOGLE_ERR,
    "Google Sign-In is not configured on this server." to StringKey.AUTH_GOOGLE_ERR,
)
