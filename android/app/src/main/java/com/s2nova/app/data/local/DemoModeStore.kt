package com.s2nova.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.demoModeDataStore by preferencesDataStore(name = "s2nova_demo_mode")

// Whether the device is currently browsing fictitious sample data instead
// of the signed-in user's real wallets/transactions/budgets — see
// AppContainer.enterDemoMode()/exitDemoMode(). Persisted locally via
// DataStore (same mechanism as OnboardingStore) so the toggle survives a
// process restart, but this flag and the fictitious data it gates never
// touch the backend: demo mode is explicitly per-device, not a real
// account any other device could sign into.
class DemoModeStore private constructor(context: Context) {
    private val context = context.applicationContext

    private object Keys {
        val DEMO_MODE_ACTIVE = booleanPreferencesKey("demo_mode_active")
    }

    val demoModeActive: Flow<Boolean> = this.context.demoModeDataStore.data.map { it[Keys.DEMO_MODE_ACTIVE] ?: false }

    suspend fun setDemoModeActive(active: Boolean) {
        context.demoModeDataStore.edit { it[Keys.DEMO_MODE_ACTIVE] = active }
    }

    companion object {
        @Volatile private var instance: DemoModeStore? = null

        fun getInstance(context: Context): DemoModeStore =
            instance ?: synchronized(this) {
                instance ?: DemoModeStore(context).also { instance = it }
            }
    }
}
