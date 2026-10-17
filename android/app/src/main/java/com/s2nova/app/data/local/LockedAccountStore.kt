package com.s2nova.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.s2nova.app.data.model.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.lockedAccountDataStore by novaPreferencesDataStore(name = "s2nova_locked_account")

// Who was signed in when "Cierre automático" ended the session, so the lock
// screen asks only that account to come back (its password, Google, or the
// fingerprint). Not a credential: the session is already closed on the
// server. Excluded from backups (data_extraction_rules.xml).
data class LockedAccount(
    val userId: String,
    val name: String,
    val email: String,
    val hasPassword: Boolean,
    val hasGoogle: Boolean,
)

class LockedAccountStore private constructor(context: Context) {
    private val context = context.applicationContext

    private object Keys {
        val USER_ID = stringPreferencesKey("user_id")
        val NAME = stringPreferencesKey("name")
        val EMAIL = stringPreferencesKey("email")
        val HAS_PASSWORD = booleanPreferencesKey("has_password")
        val HAS_GOOGLE = booleanPreferencesKey("has_google")
    }

    val account: Flow<LockedAccount?> = context.lockedAccountDataStore.data.map(::read)

    suspend fun current(): LockedAccount? = account.first()

    suspend fun save(user: User) {
        context.lockedAccountDataStore.edit {
            it[Keys.USER_ID] = user.id
            it[Keys.NAME] = user.name
            it[Keys.EMAIL] = user.email
            it[Keys.HAS_PASSWORD] = user.hasPassword
            it[Keys.HAS_GOOGLE] = user.hasGoogle
        }
    }

    suspend fun clear() {
        context.lockedAccountDataStore.edit { it.clear() }
    }

    private fun read(prefs: Preferences): LockedAccount? {
        val id = prefs[Keys.USER_ID] ?: return null
        val email = prefs[Keys.EMAIL] ?: return null
        return LockedAccount(
            userId = id,
            name = prefs[Keys.NAME] ?: email,
            email = email,
            hasPassword = prefs[Keys.HAS_PASSWORD] ?: true,
            hasGoogle = prefs[Keys.HAS_GOOGLE] ?: false,
        )
    }

    companion object {
        @Volatile private var instance: LockedAccountStore? = null

        fun getInstance(context: Context): LockedAccountStore =
            instance ?: synchronized(this) {
                instance ?: LockedAccountStore(context).also { instance = it }
            }
    }
}
