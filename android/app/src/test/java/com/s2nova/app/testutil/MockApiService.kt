package com.s2nova.app.testutil

import com.s2nova.app.data.remote.ApiService
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.mockwebserver.MockWebServer
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.create

// Builds a real Retrofit-backed ApiService pointed at a MockWebServer
// instance instead of ApiClient's singleton — mirrors ApiClient.kt's own
// Json/converter setup exactly, so a test exercises the same wire contract
// (kotlinx.serialization + Retrofit annotations) production code does,
// without needing Android Context or the auth-refresh Authenticator.
fun MockWebServer.apiService(): ApiService {
    val json = Json { ignoreUnknownKeys = true }
    return Retrofit.Builder()
        .baseUrl(url("/"))
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create()
}
