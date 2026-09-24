package com.s2nova.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.alertStateDataStore by preferencesDataStore(name = "s2nova_alert_state")

// Which shared alerts (backend GET /alerts ids) this device has read in the
// bell or dismissed from Inicio's alert card. Kept per device on purpose —
// STAGE-2-INICIO §3: dismissing on Android doesn't hide the alert on Web.
// Alert ids are stable per underlying condition, so a new condition (next
// occurrence, next month) comes back unread on its own.
class AlertStateStore private constructor(context: Context) {
    private val context = context.applicationContext

    private object Keys {
        val READ = stringSetPreferencesKey("read_alert_ids")
        val DISMISSED = stringSetPreferencesKey("dismissed_alert_ids")
    }

    suspend fun load(): Pair<Set<String>, Set<String>> {
        val prefs = context.alertStateDataStore.data.first()
        return (prefs[Keys.READ] ?: emptySet()) to (prefs[Keys.DISMISSED] ?: emptySet())
    }

    suspend fun save(read: Set<String>, dismissed: Set<String>) {
        context.alertStateDataStore.edit {
            it[Keys.READ] = read
            it[Keys.DISMISSED] = dismissed
        }
    }

    companion object {
        @Volatile private var instance: AlertStateStore? = null

        fun getInstance(context: Context): AlertStateStore =
            instance ?: synchronized(this) {
                instance ?: AlertStateStore(context).also { instance = it }
            }
    }
}
