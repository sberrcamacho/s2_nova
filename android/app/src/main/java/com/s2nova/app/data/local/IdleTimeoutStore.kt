package com.s2nova.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.idleTimeoutDataStore by preferencesDataStore(name = "s2nova_idle_timeout")

// "Cierre automático": when the user last touched the app. Kept in memory
// for the running process (MainActivity.onUserInteraction updates it) and
// persisted whenever the app goes to the background, so a restart after
// the process was killed still knows how long the app sat unused.
class IdleTimeoutStore private constructor(context: Context) {
    private val context = context.applicationContext

    private object Keys {
        val LAST_INTERACTION_AT = longPreferencesKey("last_interaction_at_millis")
    }

    @Volatile var lastInteractionAt: Long = System.currentTimeMillis()
        private set

    fun touch(now: Long = System.currentTimeMillis()) {
        lastInteractionAt = now
    }

    fun idleMillis(now: Long = System.currentTimeMillis()): Long = now - lastInteractionAt

    suspend fun persist() {
        val at = lastInteractionAt
        context.idleTimeoutDataStore.edit { it[Keys.LAST_INTERACTION_AT] = at }
    }

    suspend fun persistedIdleMillis(now: Long = System.currentTimeMillis()): Long? =
        context.idleTimeoutDataStore.data.first()[Keys.LAST_INTERACTION_AT]?.let { now - it }

    companion object {
        @Volatile private var instance: IdleTimeoutStore? = null

        fun getInstance(context: Context): IdleTimeoutStore =
            instance ?: synchronized(this) {
                instance ?: IdleTimeoutStore(context).also { instance = it }
            }
    }
}
