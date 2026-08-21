package com.s2nova.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.sessionDataStore by preferencesDataStore(name = "s2nova_session")

// Holds the JWT access token and opaque refresh token this device is using.
// Plain DataStore, not an encrypted store — a reasonable simplification for
// this stage (see ARCHITECTURE.md §14, which calls for an encrypted store
// long-term); noted as a follow-up rather than pretended-away.
class SessionStore private constructor(context: Context) {
    private val context = context.applicationContext

    private object Keys {
        val ACCESS_TOKEN = stringPreferencesKey("access_token")
        val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
    }

    val accessToken: Flow<String?> = this.context.sessionDataStore.data.map { it[Keys.ACCESS_TOKEN] }
    val refreshToken: Flow<String?> = this.context.sessionDataStore.data.map { it[Keys.REFRESH_TOKEN] }

    suspend fun accessTokenOnce(): String? = accessToken.first()
    suspend fun refreshTokenOnce(): String? = refreshToken.first()

    suspend fun saveSession(accessToken: String, refreshToken: String?) {
        this.context.sessionDataStore.edit { prefs ->
            prefs[Keys.ACCESS_TOKEN] = accessToken
            if (refreshToken != null) prefs[Keys.REFRESH_TOKEN] = refreshToken
        }
    }

    suspend fun clear() {
        this.context.sessionDataStore.edit { it.clear() }
    }

    companion object {
        @Volatile private var instance: SessionStore? = null

        fun getInstance(context: Context): SessionStore =
            instance ?: synchronized(this) {
                instance ?: SessionStore(context).also { instance = it }
            }
    }
}
