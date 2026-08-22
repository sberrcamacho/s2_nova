package com.s2nova.app.data.remote

import java.io.IOException
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import retrofit2.HttpException

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
        parsed?.error ?: fallback
    }
    is IOException -> "No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo."
    else -> fallback
}
