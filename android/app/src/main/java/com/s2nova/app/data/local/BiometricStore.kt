package com.s2nova.app.data.local

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

private val Context.biometricDataStore by novaPreferencesDataStore(name = "s2nova_biometric")

// "Ingreso biométrico": the credential the backend issued to this device
// (POST /auth/biometric), with its secret sealed by an Android Keystore key
// that only a biometric check unlocks. Each use of the key needs a fresh
// check, and enrolling a new fingerprint or face on the phone invalidates
// it — the user then signs in with the password and turns the option on
// again. Stored form of the secret: base64(12-byte IV + ciphertext).
class BiometricStore private constructor(context: Context) {
    private val context = context.applicationContext

    private object Keys {
        val CREDENTIAL_ID = stringPreferencesKey("credential_id")
        val SEALED_SECRET = stringPreferencesKey("sealed_secret")
        val USER_ID = stringPreferencesKey("user_id")
    }

    // Whether this device holds a credential (for someone).
    val enrolled: Flow<Boolean> = this.context.biometricDataStore.data.map { it[Keys.CREDENTIAL_ID] != null && it[Keys.SEALED_SECRET] != null }

    suspend fun userId(): String? = context.biometricDataStore.data.first()[Keys.USER_ID]

    // A cipher for sealing a new secret, under a new key. The biometric
    // prompt has to unlock it before save().
    fun newEncryptCipher(): Cipher {
        val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
        keyStore.deleteEntry(ALIAS)
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE)
        generator.init(
            KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setUserAuthenticationRequired(true)
                .setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG)
                .setInvalidatedByBiometricEnrollment(true)
                .build(),
        )
        return Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.ENCRYPT_MODE, generator.generateKey()) }
    }

    suspend fun save(credentialId: String, secret: String, userId: String, unlocked: Cipher) {
        val sealed = unlocked.iv + unlocked.doFinal(secret.toByteArray(Charsets.UTF_8))
        context.biometricDataStore.edit { prefs ->
            prefs[Keys.CREDENTIAL_ID] = credentialId
            prefs[Keys.SEALED_SECRET] = Base64.encodeToString(sealed, Base64.NO_WRAP)
            prefs[Keys.USER_ID] = userId
        }
    }

    // A cipher for opening the stored secret, or null when there is nothing
    // to open or the key is gone or invalidated (the credential is then
    // forgotten). The biometric prompt has to unlock it before open().
    suspend fun decryptCipher(): Cipher? {
        val sealed = sealedSecret() ?: return null
        return try {
            val key = KeyStore.getInstance(KEYSTORE).apply { load(null) }.getKey(ALIAS, null) as? SecretKey
            if (key == null) {
                clear()
                return null
            }
            Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, sealed, 0, IV_SIZE)) }
        } catch (error: java.security.GeneralSecurityException) {
            clear()
            null
        }
    }

    // The credential id and its secret, once the prompt unlocked the cipher.
    suspend fun open(unlocked: Cipher): Pair<String, String>? {
        val id = context.biometricDataStore.data.first()[Keys.CREDENTIAL_ID] ?: return null
        val sealed = sealedSecret() ?: return null
        val secret = unlocked.doFinal(sealed, IV_SIZE, sealed.size - IV_SIZE).toString(Charsets.UTF_8)
        return id to secret
    }

    suspend fun clear() {
        context.biometricDataStore.edit { it.clear() }
        runCatching { KeyStore.getInstance(KEYSTORE).apply { load(null) }.deleteEntry(ALIAS) }
    }

    private suspend fun sealedSecret(): ByteArray? =
        context.biometricDataStore.data.first()[Keys.SEALED_SECRET]
            ?.let { runCatching { Base64.decode(it, Base64.NO_WRAP) }.getOrNull() }
            ?.takeIf { it.size > IV_SIZE }

    companion object {
        private const val KEYSTORE = "AndroidKeyStore"
        private const val ALIAS = "s2nova_biometric_key"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val IV_SIZE = 12

        @Volatile private var instance: BiometricStore? = null

        fun getInstance(context: Context): BiometricStore =
            instance ?: synchronized(this) {
                instance ?: BiometricStore(context).also { instance = it }
            }
    }
}
