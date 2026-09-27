package com.s2nova.app.data.local

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.first
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

private val Context.sessionDataStore by preferencesDataStore(name = "s2nova_session")

// Why the session ended without the user signing out.
enum class SessionEndReason { EXPIRED, IDLE }

// Holds the JWT access token and opaque refresh token this device is using,
// encrypted with an AES-GCM key that lives in the Android Keystore (never
// leaves it), so a copy of the app's files alone can't be replayed as a
// session. Values written before encryption are read once and re-saved
// encrypted.
class SessionStore private constructor(context: Context) {
    private val context = context.applicationContext

    private object Keys {
        val ACCESS_TOKEN = stringPreferencesKey("access_token")
        val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
    }

    // Every authenticated request reads the access token; decrypting it
    // from disk each time would be wasted work.
    @Volatile private var cache: Pair<String?, String?>? = null

    private suspend fun load(): Pair<String?, String?> {
        cache?.let { return it }
        val prefs = context.sessionDataStore.data.first()
        val rawAccess = prefs[Keys.ACCESS_TOKEN]
        val rawRefresh = prefs[Keys.REFRESH_TOKEN]
        val tokens = TokenCipher.decrypt(rawAccess) to TokenCipher.decrypt(rawRefresh)
        val legacy = listOfNotNull(rawAccess, rawRefresh).any { !TokenCipher.isEncrypted(it) }
        if (legacy && tokens.first != null) saveSession(tokens.first!!, tokens.second) else cache = tokens
        return tokens
    }

    suspend fun accessTokenOnce(): String? = load().first
    suspend fun refreshTokenOnce(): String? = load().second

    suspend fun saveSession(accessToken: String, refreshToken: String?) {
        val refresh = refreshToken ?: load().second
        context.sessionDataStore.edit { prefs ->
            prefs[Keys.ACCESS_TOKEN] = TokenCipher.encrypt(accessToken)
            if (refresh != null) prefs[Keys.REFRESH_TOKEN] = TokenCipher.encrypt(refresh)
        }
        cache = accessToken to refresh
    }

    suspend fun clear() {
        context.sessionDataStore.edit { it.clear() }
        cache = null to null
    }

    private val _sessionEnded = MutableSharedFlow<SessionEndReason>(extraBufferCapacity = 1)

    // Emitted when a request finds the session over — the refresh token is
    // dead too, or the server ended it (closed from another device, or its
    // own "Cierre automático" check). Distinct from clear(), which
    // AuthRepository.logout() also calls for an explicit sign-out and
    // handles its own navigation, so logout() must not also fire this.
    val sessionEnded: SharedFlow<SessionEndReason> = _sessionEnded.asSharedFlow()

    suspend fun expire(reason: SessionEndReason = SessionEndReason.EXPIRED) {
        // Several requests can find the session over at once; tell once.
        val hadSession = load().second != null
        clear()
        if (hadSession) _sessionEnded.tryEmit(reason)
    }

    companion object {
        @Volatile private var instance: SessionStore? = null

        fun getInstance(context: Context): SessionStore =
            instance ?: synchronized(this) {
                instance ?: SessionStore(context).also { instance = it }
            }
    }
}

// AES-256-GCM with a non-exportable Android Keystore key. Stored form:
// "v1:" + base64(12-byte IV + ciphertext).
private object TokenCipher {
    private const val ALIAS = "s2nova_session_key"
    private const val PREFIX = "v1:"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"

    fun isEncrypted(value: String) = value.startsWith(PREFIX)

    private fun key(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return generator.generateKey()
    }

    fun encrypt(plain: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.ENCRYPT_MODE, key()) }
        val sealed = cipher.iv + cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
        return PREFIX + Base64.encodeToString(sealed, Base64.NO_WRAP)
    }

    // A legacy plain value is returned as is; one that can't be decrypted
    // (e.g. the key was wiped with the app's data) reads as no session.
    fun decrypt(stored: String?): String? {
        if (stored == null) return null
        if (!isEncrypted(stored)) return stored
        return runCatching {
            val sealed = Base64.decode(stored.removePrefix(PREFIX), Base64.NO_WRAP)
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, sealed, 0, 12))
            String(cipher.doFinal(sealed, 12, sealed.size - 12), Charsets.UTF_8)
        }.getOrNull()
    }
}
