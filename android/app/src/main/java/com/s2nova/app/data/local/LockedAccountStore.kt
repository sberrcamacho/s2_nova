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

// The account signed in on this device (kept on every sign-in) and whether
// it is locked: "Cierre automático" or reopening the app after it was
// closed locks it, so the lock screen asks only that account to come back
// (its password, Google, or the fingerprint). Not a credential: a locked
// session is already closed on the server. A manual sign-out forgets it.
// Excluded from backups (data_extraction_rules.xml).
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
        // Absent in stores written before reopening locked: those were
        // only ever written when locking.
        val LOCKED = booleanPreferencesKey("locked")
    }

    // The locked account, or null when nothing is locked.
    val account: Flow<LockedAccount?> = context.lockedAccountDataStore.data.map { prefs ->
        if (prefs[Keys.LOCKED] != false) read(prefs) else null
    }

    suspend fun current(): LockedAccount? = account.first()

    // The account signed in on this device, locked or not.
    suspend fun known(): LockedAccount? = read(context.lockedAccountDataStore.data.first())

    // On every sign-in: who this device's account is. It leaves the lock
    // as it is (a lock-screen unlock signs in before it unlocks; dropping
    // the lock first would take the lock screen away mid-unlock).
    suspend fun remember(user: User) = write(user, locked = null)

    // Locks the signed-in account.
    suspend fun save(user: User) = write(user, locked = true)

    // Locks the account this device remembers (reopening the app). Returns
    // whether there was one.
    suspend fun lockKnown(): Boolean {
        if (known() == null) return false
        context.lockedAccountDataStore.edit { it[Keys.LOCKED] = true }
        return true
    }

    // Puts a locked account back (another account signed in on the lock
    // screen and was signed straight out).
    suspend fun relock(account: LockedAccount) {
        context.lockedAccountDataStore.edit {
            it[Keys.USER_ID] = account.userId
            it[Keys.NAME] = account.name
            it[Keys.EMAIL] = account.email
            it[Keys.HAS_PASSWORD] = account.hasPassword
            it[Keys.HAS_GOOGLE] = account.hasGoogle
            it[Keys.LOCKED] = true
        }
    }

    // Back in after the lock screen: still remembered, no longer locked.
    suspend fun unlock() {
        context.lockedAccountDataStore.edit { it[Keys.LOCKED] = false }
    }

    // A manual sign-out (or "Cerrar sesión" on the lock screen): forgotten.
    suspend fun clear() {
        context.lockedAccountDataStore.edit { it.clear() }
    }

    // `locked` null: unchanged, or unlocked when nothing was saved yet.
    private suspend fun write(user: User, locked: Boolean?) {
        context.lockedAccountDataStore.edit {
            it[Keys.USER_ID] = user.id
            it[Keys.NAME] = user.name
            it[Keys.EMAIL] = user.email
            it[Keys.HAS_PASSWORD] = user.hasPassword
            it[Keys.HAS_GOOGLE] = user.hasGoogle
            it[Keys.LOCKED] = locked ?: (it[Keys.LOCKED] ?: false)
        }
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
