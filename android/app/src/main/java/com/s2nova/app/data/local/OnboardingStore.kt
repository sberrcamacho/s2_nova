package com.s2nova.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.onboardingDataStore by preferencesDataStore(name = "s2nova_onboarding")

// First-launch onboarding/tutorial completion, persisted locally via
// DataStore per android/AGENTS.md's stated intended mechanism for this
// kind of flag. Read once at cold start (NovaApp's splash step) to decide
// the nav graph's start destination; never re-shown once completed, except
// the tutorial alone can be replayed from Settings (resetTutorial()).
class OnboardingStore private constructor(context: Context) {
    private val context = context.applicationContext

    private object Keys {
        val ONBOARDING_COMPLETED = booleanPreferencesKey("onboarding_completed")
        val TUTORIAL_COMPLETED = booleanPreferencesKey("tutorial_completed")
    }

    val onboardingCompleted: Flow<Boolean> = this.context.onboardingDataStore.data.map { it[Keys.ONBOARDING_COMPLETED] ?: false }
    val tutorialCompleted: Flow<Boolean> = this.context.onboardingDataStore.data.map { it[Keys.TUTORIAL_COMPLETED] ?: false }

    suspend fun markOnboardingComplete() {
        context.onboardingDataStore.edit { it[Keys.ONBOARDING_COMPLETED] = true }
    }

    suspend fun markTutorialComplete() {
        context.onboardingDataStore.edit { it[Keys.TUTORIAL_COMPLETED] = true }
    }

    // Replays only the tutorial carousel, not the whole flow — re-running
    // account/income setup on every replay would be annoying and isn't
    // what "watch the tutorial again" means.
    suspend fun resetTutorial() {
        context.onboardingDataStore.edit { it[Keys.TUTORIAL_COMPLETED] = false }
    }

    companion object {
        @Volatile private var instance: OnboardingStore? = null

        fun getInstance(context: Context): OnboardingStore =
            instance ?: synchronized(this) {
                instance ?: OnboardingStore(context).also { instance = it }
            }
    }
}
