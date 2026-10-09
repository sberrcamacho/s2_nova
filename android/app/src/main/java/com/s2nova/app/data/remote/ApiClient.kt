package com.s2nova.app.data.remote

import android.content.Context
import com.s2nova.app.BuildConfig
import com.s2nova.app.data.local.SessionEndReason
import com.s2nova.app.data.local.SessionStore
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.create
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

// Manual DI, matching AppContainer's existing pattern — no Hilt. Call
// ApiClient.init(context) once (from MainActivity.onCreate) before any
// repository touches `api`.
object ApiClient {
    private lateinit var appContext: Context

    fun init(context: Context) {
        appContext = context.applicationContext
    }

    private val json = Json { ignoreUnknownKeys = true }
    private val contentType = "application/json".toMediaType()

    private fun loggingInterceptor() = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
    }

    // OkHttp's 10s defaults are too tight for the deployed backend: Render's
    // free tier sleeps after 15 minutes idle and takes roughly 30-60s to
    // wake on the first request after that (see backend/AGENTS.md's
    // "Production deployment" section). Without this, that first request —
    // often exactly the /me call AuthRepository.bootstrap() makes at cold
    // start — times out well before the backend finishes waking up.
    private fun OkHttpClient.Builder.applyTimeouts(): OkHttpClient.Builder = this
        .connectTimeout(45, TimeUnit.SECONDS)
        .readTimeout(45, TimeUnit.SECONDS)
        .writeTimeout(45, TimeUnit.SECONDS)
        // The whole call, retries and redirects included: nothing waits on
        // a stalled connection for longer than this.
        .callTimeout(90, TimeUnit.SECONDS)

    // Web's Ajustes › Sesiones activas names each session from the User-Agent
    // its login sent; this one reads "S2 Nova app · <model>" there (see
    // backend/src/lib/devices.ts).
    private val userAgent = "S2Nova-Android/${BuildConfig.VERSION_NAME} (${android.os.Build.MODEL})"

    private fun OkHttpClient.Builder.identifyApp(): OkHttpClient.Builder =
        addInterceptor { chain -> chain.proceed(chain.request().newBuilder().header("User-Agent", userAgent).build()) }

    // Unauthenticated — used for register/login (no token exists yet) and
    // for refresh/logout (authorized by the refresh token, not the access
    // token). Also used internally by `api`'s Authenticator to perform the
    // actual refresh call without recursing into the authenticated client.
    val authApi: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(ensureTrailingSlash(BuildConfig.API_BASE_URL))
            .client(OkHttpClient.Builder().identifyApp().addInterceptor(loggingInterceptor()).applyTimeouts().build())
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
            .create()
    }

    // Authenticated — attaches the stored access token to every request and
    // transparently refreshes+retries once on a 401 (see Authenticator
    // below), matching ARCHITECTURE.md §6's rotate-on-refresh design.
    val api: ApiService by lazy {
        val sessionStore = SessionStore.getInstance(appContext)
        val client = OkHttpClient.Builder()
            .identifyApp()
            .applyTimeouts()
            .addInterceptor(loggingInterceptor())
            .addInterceptor { chain ->
                val token = runBlocking { sessionStore.accessTokenOnce() }
                val request = if (token != null) {
                    chain.request().newBuilder().header("Authorization", "Bearer $token").build()
                } else {
                    chain.request()
                }
                chain.proceed(request)
            }
            .authenticator { _, response -> renewAndRetry(sessionStore, response) }
            .build()

        Retrofit.Builder()
            .baseUrl(ensureTrailingSlash(BuildConfig.API_BASE_URL))
            .client(client)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
            .create()
    }

    private val refreshLock = Any()

    // A 401 from the backend's auth layer carries a `code` (see
    // backend/src/plugins/auth.ts): "token_invalid" means renew the access
    // token and retry; "session_ended"/"session_idle" mean the session is
    // over. Any other 401 (a wrong current password, say) is the route's
    // own answer and passes through untouched.
    private fun renewAndRetry(sessionStore: SessionStore, response: Response): okhttp3.Request? {
        val sentToken = response.request.header("Authorization")?.removePrefix("Bearer ") ?: return null
        if (priorResponseCount(response) >= 2) return null
        val code = runCatching { json.parseToJsonElement(response.peekBody(4096).string()) }
            .getOrNull()?.let { (it as? kotlinx.serialization.json.JsonObject)?.get("code") }
            ?.let { (it as? kotlinx.serialization.json.JsonPrimitive)?.content }

        when (code) {
            "session_idle" -> return endSession(sessionStore, SessionEndReason.IDLE)
            "session_ended" -> return endSession(sessionStore, SessionEndReason.EXPIRED)
            "token_invalid" -> Unit
            else -> return null
        }

        // One refresh at a time: requests that failed together wait here,
        // and the ones after the first find the token already renewed —
        // presenting the same refresh token twice would look like reuse.
        synchronized(refreshLock) {
            val current = runBlocking { sessionStore.accessTokenOnce() } ?: return null
            if (current != sentToken) return response.request.withToken(current)

            val refreshToken = runBlocking { sessionStore.refreshTokenOnce() } ?: return null
            val refreshed = try {
                runBlocking { authApi.refresh(RefreshRequest(refreshToken)) }
            } catch (error: retrofit2.HttpException) {
                // The server refused the refresh token: this session is over.
                val idle = error.response()?.errorBody()?.string()?.contains("session_idle") == true
                return endSession(sessionStore, if (idle) SessionEndReason.IDLE else SessionEndReason.EXPIRED)
            } catch (error: Exception) {
                // Offline or the backend is waking up — not proof the session
                // is dead, so keep it and let this request fail on its own.
                return null
            }
            runBlocking { sessionStore.saveSession(refreshed.accessToken, refreshed.refreshToken) }
            return response.request.withToken(refreshed.accessToken)
        }
    }

    private fun endSession(sessionStore: SessionStore, reason: SessionEndReason): okhttp3.Request? {
        runBlocking { sessionStore.expire(reason) }
        return null
    }

    private fun okhttp3.Request.withToken(token: String) = newBuilder().header("Authorization", "Bearer $token").build()

    private fun priorResponseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }

    private fun ensureTrailingSlash(url: String) = if (url.endsWith("/")) url else "$url/"
}
