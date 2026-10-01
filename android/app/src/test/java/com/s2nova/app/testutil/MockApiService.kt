package com.s2nova.app.testutil

import com.s2nova.app.data.Taxonomy
import com.s2nova.app.data.remote.ApiService
import java.io.File
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
    initTaxonomy()
    val json = Json { ignoreUnknownKeys = true }
    return Retrofit.Builder()
        .baseUrl(url("/"))
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create()
}

// The category registry resolves every id through the bundled taxonomy, which
// the app loads from assets; unit tests read the same file from the module.
fun initTaxonomy() {
    val text = listOf("src/main/assets/taxonomy.json", "app/src/main/assets/taxonomy.json")
        .map(::File).first { it.exists() }.readText()
    Taxonomy.initFrom(text)
}
