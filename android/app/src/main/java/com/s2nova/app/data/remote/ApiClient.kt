package com.s2nova.app.data.remote

import android.content.Context
import com.s2nova.app.BuildConfig
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

    // Unauthenticated — used for register/login (no token exists yet) and
    // for refresh/logout (authorized by the refresh token, not the access
    // token). Also used internally by `api`'s Authenticator to perform the
    // actual refresh call without recursing into the authenticated client.
    val authApi: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(ensureTrailingSlash(BuildConfig.API_BASE_URL))
            .client(OkHttpClient.Builder().addInterceptor(loggingInterceptor()).build())
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
            .authenticator { _, response ->
                if (response.request.header("Authorization") == null) return@authenticator null
                if (priorResponseCount(response) >= 2) return@authenticator null

                val refreshToken = runBlocking { sessionStore.refreshTokenOnce() } ?: return@authenticator null
                val refreshed = try {
                    runBlocking { authApi.refresh(RefreshRequest(refreshToken)) }
                } catch (error: Exception) {
                    null
                }

                if (refreshed == null) {
                    runBlocking { sessionStore.clear() }
                    return@authenticator null
                }

                runBlocking { sessionStore.saveSession(refreshed.accessToken, refreshed.refreshToken) }
                response.request.newBuilder().header("Authorization", "Bearer ${refreshed.accessToken}").build()
            }
            .build()

        Retrofit.Builder()
            .baseUrl(ensureTrailingSlash(BuildConfig.API_BASE_URL))
            .client(client)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
            .create()
    }

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
