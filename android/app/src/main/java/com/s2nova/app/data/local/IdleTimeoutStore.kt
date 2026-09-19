package com.s2nova.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.idleTimeoutDataStore by preferencesDataStore(name = "s2nova_idle_timeout")

// Backs the auto-lock overlay (ui/components/AppLockGate.kt) — persisted
// via DataStore, not an in-memory flag, since the timestamp must survive
// the app being backgrounded past its own process lifetime (the whole
// point is detecting "how long was this app in the background", which an
// in-memory value can't do once the process is gone).
class IdleTimeoutStore private constructor(context: Context) {
    private val context = context.applicationContext

    private object Keys {
        val LAST_INTERACTION_AT = longPreferencesKey("last_interaction_at_millis")
    }

    suspend fun recordInteractionNow() {
        context.idleTimeoutDataStore.edit { it[Keys.LAST_INTERACTION_AT] = System.currentTimeMillis() }
    }

    suspend fun millisSinceLastInteraction(): Long? {
        val last = context.idleTimeoutDataStore.data.first()[Keys.LAST_INTERACTION_AT]
        return last?.let { System.currentTimeMillis() - it }
    }

    companion object {
        @Volatile private var instance: IdleTimeoutStore? = null

        fun getInstance(context: Context): IdleTimeoutStore =
            instance ?: synchronized(this) {
                instance ?: IdleTimeoutStore(context).also { instance = it }
            }
    }
}
