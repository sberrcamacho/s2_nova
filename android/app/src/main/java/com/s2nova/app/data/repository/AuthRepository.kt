package com.s2nova.app.data.repository

import com.s2nova.app.data.local.IdleTimeoutStore
import com.s2nova.app.data.local.OnboardingStore
import com.s2nova.app.data.local.SessionStore
import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.data.model.Currency
import com.s2nova.app.data.model.User
import com.s2nova.app.data.model.UserPreferences
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ChangePasswordRequest
import com.s2nova.app.data.remote.ForgotPasswordRequest
import com.s2nova.app.data.remote.PasswordConfirmRequest
import com.s2nova.app.data.remote.ResetPasswordRequest
import retrofit2.HttpException
import retrofit2.Response
import com.s2nova.app.data.remote.GoogleLoginRequest
import com.s2nova.app.data.remote.LoginRequest
import com.s2nova.app.data.remote.MeResponse
import com.s2nova.app.data.remote.RefreshRequest
import com.s2nova.app.data.remote.RegisterRequest
import com.s2nova.app.data.remote.UpdatePreferencesRequest
import com.s2nova.app.data.remote.UpdateProfileRequest
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

// How long a sign-out waits on the server before giving up on telling it.
private const val REMOTE_LOGOUT_TIMEOUT_MS = 5_000L

private fun initialsFor(name: String): String =
    name.trim().split(Regex("\\s+")).filter { it.isNotBlank() }.take(2)
        .joinToString("") { it.first().uppercase() }.ifBlank { "US" }

internal fun MeResponse.toUser(): User {
    val prefs = preferences
    return User(
        id = id,
        name = name,
        email = email,
        phone = phone,
        city = city,
        hasPassword = hasPassword,
        avatarInitials = initialsFor(name),
        memberSince = createdAt.take(10),
        preferences = UserPreferences(
            darkTheme = prefs?.theme == "DARK",
            notifications = prefs?.notifications ?: true,
            biometricLogin = prefs?.biometricLogin ?: false,
            blurBalance = prefs?.blurBalance ?: false,
            autoLockMinutes = prefs?.autoLockMinutes ?: 5,
            currency = prefs?.currency?.let { runCatching { Currency.valueOf(it) }.getOrNull() } ?: Currency.COP,
            language = prefs?.language?.let { runCatching { AppLanguage.valueOf(it.uppercase()) }.getOrNull() } ?: AppLanguage.ES,
            guidesSeen = prefs?.guidesSeen?.toSet() ?: emptySet(),
            guidesOff = prefs?.guidesOff ?: false,
        ),
        principalCurrency = principalCurrency,
        onboardingCompleted = prefs?.onboardingCompleted ?: true,
    )
}

// Real backend-backed session — replaces the earlier any-password-accepted
// mock, since Wallets/Transactions/Budgets/Goals now need a real
// authenticated user. Still StateFlow-based like every other repository,
// no ViewModel: screens launch these suspend functions via
// rememberCoroutineScope().launch { ... }.
class AuthRepository(
    private val sessionStore: SessionStore,
    private val onboardingStore: OnboardingStore,
    private val credentialManager: androidx.credentials.CredentialManager,
    private val idleTimeoutStore: IdleTimeoutStore,
    private val biometricStore: com.s2nova.app.data.local.BiometricStore,
) {
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    private val _idleLogouts = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

    // Emitted after "Cierre automático" signed the user out, so the app can
    // go to Login and say why.
    val idleLogouts: SharedFlow<Unit> = _idleLogouts.asSharedFlow()

    // Keeps the local (per-device, offline-checkable) onboarding flag in
    // sync with the backend's — matters when the same account signs in on
    // a second device or reinstall, where the local flag alone would
    // otherwise incorrectly re-trigger onboarding for a returning user.
    private suspend fun fetchAndSyncMe(): User {
        val response = ApiClient.api.me()
        if (response.preferences?.onboardingCompleted == true) onboardingStore.markOnboardingComplete()
        if (response.preferences?.tutorialCompleted == true) onboardingStore.markTutorialComplete()
        val user = response.toUser()
        // This device's biometric credential belongs to one account and
        // only works while that account's preference is on (it is retired
        // server-side otherwise): forget one that can no longer be used.
        if (biometricStore.userId().let { it != null && (it != user.id || !user.preferences.biometricLogin) }) biometricStore.clear()
        return user
    }

    // Whether this device can offer "Ingreso biométrico" on Login.
    val biometricEnrolled: kotlinx.coroutines.flow.Flow<Boolean> = biometricStore.enrolled

    // Ajustes › Ingreso biométrico, on: the server issues this device a
    // credential, its secret is sealed with the cipher the biometric prompt
    // just unlocked, and only then does the preference go on. Any step
    // failing leaves both the device and the account with it off.
    suspend fun enableBiometric(unlocked: javax.crypto.Cipher): Result<Unit> = runCatching {
        if (DemoModeFlag.active) error(com.s2nova.app.ui.tr(com.s2nova.app.ui.StringKey.API_GUEST))
        val user = _currentUser.value ?: error("Not signed in")
        try {
            val credential = ApiClient.api.enrolBiometric()
            biometricStore.save(credential.credentialId, credential.secret, user.id, unlocked)
            ApiClient.api.updatePreferences(UpdatePreferencesRequest(biometricLogin = true))
        } catch (error: Exception) {
            android.util.Log.w("AuthRepository", "Enabling biometric login failed", error)
            biometricStore.clear()
            throw error
        }
        updateUser { it.copy(preferences = it.preferences.copy(biometricLogin = true)) }
    }

    // Off: the device forgets its credential and the server retires every
    // credential of the account (PATCH /me/preferences).
    suspend fun disableBiometric() {
        biometricStore.clear()
        updateUser { it.copy(preferences = it.preferences.copy(biometricLogin = false)) }
        persistPreferences(UpdatePreferencesRequest(biometricLogin = false))
    }

    // Login with the credential the biometric prompt just unlocked. A
    // credential the server no longer accepts is forgotten.
    suspend fun loginWithBiometric(unlocked: javax.crypto.Cipher): Result<Unit> = runCatching {
        val (credentialId, secret) = biometricStore.open(unlocked) ?: error("No biometric credential")
        val session = try {
            ApiClient.authApi.biometricLogin(com.s2nova.app.data.remote.BiometricLoginRequest(credentialId, secret))
        } catch (error: HttpException) {
            if (error.code() == 401) biometricStore.clear()
            throw error
        }
        sessionStore.saveSession(session.accessToken, session.refreshToken)
        idleTimeoutStore.touch()
        _currentUser.value = fetchAndSyncMe()
    }

    // Called once at cold start (splash): if a refresh token is already
    // stored, fetch /me to restore the session without asking the user to
    // log in again. Returns whether a session was restored.
    suspend fun bootstrap(): Boolean {
        if (sessionStore.refreshTokenOnce() == null) return false
        return try {
            val user = fetchAndSyncMe()
            // The app was closed (or killed) longer ago than "Cierre
            // automático" allows: that session is over, not restored.
            val idle = idleTimeoutStore.persistedIdleMillis()
            val minutes = user.preferences.autoLockMinutes
            if (minutes > 0 && idle != null && idle >= minutes * 60_000L) {
                _currentUser.value = user
                logoutForIdle()
                return false
            }
            idleTimeoutStore.touch()
            _currentUser.value = user
            true
        } catch (error: retrofit2.HttpException) {
            // The server itself rejected the token (401/403 etc.) — it's
            // genuinely invalid, so there's nothing to gain by keeping it.
            android.util.Log.w("AuthRepository", "Session restore rejected by server, clearing local session", error)
            sessionStore.clear()
            false
        } catch (error: Exception) {
            // Network-level failure (timeout, no connectivity, backend
            // still cold-starting on Render — see backend/AGENTS.md's
            // "30-60s to wake it back up") — not proof the session is
            // invalid. Leave the stored tokens alone so the next bootstrap
            // (e.g. the user reopening the app once the backend is warm)
            // can restore the session normally instead of forcing a full
            // re-login every time the first request after a while times out.
            android.util.Log.w("AuthRepository", "Session restore failed due to network error, keeping local session", error)
            false
        }
    }

    suspend fun login(email: String, password: String): Result<Unit> = runCatching {
        val session = ApiClient.authApi.login(LoginRequest(email.trim(), password))
        sessionStore.saveSession(session.accessToken, session.refreshToken)
        idleTimeoutStore.touch()
        _currentUser.value = fetchAndSyncMe()
    }

    suspend fun register(name: String, email: String, password: String): Result<Unit> = runCatching {
        val session = ApiClient.authApi.register(RegisterRequest(name.trim(), email.trim(), password))
        sessionStore.saveSession(session.accessToken, session.refreshToken)
        idleTimeoutStore.touch()
        _currentUser.value = fetchAndSyncMe()
    }

    suspend fun loginWithGoogle(idToken: String): Result<Unit> = runCatching {
        val session = ApiClient.authApi.loginWithGoogle(GoogleLoginRequest(idToken))
        sessionStore.saveSession(session.accessToken, session.refreshToken)
        idleTimeoutStore.touch()
        _currentUser.value = fetchAndSyncMe()
    }

    // Editing name/email is gated on the current password server-side (see
    // backend/src/routes/me.ts's PATCH /me) — the caller (SettingsScreen)
    // is responsible for collecting it when changing email.
    suspend fun updateProfile(
        name: String? = null,
        email: String? = null,
        phone: String? = null,
        city: String? = null,
        currentPassword: String? = null,
    ): Result<Unit> =
        runCatching {
            // The Settings screen edits whatever's in `currentUser`, which
            // while demo mode is active is the fictitious local persona, not
            // the signed-in account — never let that write reach the real
            // backend session. See AppContainer.enterDemoMode().
            if (DemoModeFlag.active) error(com.s2nova.app.ui.tr(com.s2nova.app.ui.StringKey.API_GUEST))
            val response = ApiClient.api.updateProfile(UpdateProfileRequest(name, email, phone, city, currentPassword))
            _currentUser.value = response.toUser()
        }

    private fun Response<Unit>.requireOk() {
        if (!isSuccessful) throw HttpException(this)
    }

    // "Olvidaste tu contraseña": the server always answers 204 (it never
    // reveals which emails have an account) and mails a one-time code.
    suspend fun forgotPassword(email: String): Result<Unit> = runCatching {
        ApiClient.authApi.forgotPassword(ForgotPasswordRequest(email.trim())).requireOk()
    }

    suspend fun resetPassword(token: String, newPassword: String): Result<Unit> = runCatching {
        ApiClient.authApi.resetPassword(ResetPasswordRequest(token.trim(), newPassword)).requireOk()
    }

    // Ajustes › Cambiar contraseña: the server keeps this session and closes
    // the others.
    suspend fun changePassword(currentPassword: String, newPassword: String): Result<Unit> = runCatching {
        if (DemoModeFlag.active) error(com.s2nova.app.ui.tr(com.s2nova.app.ui.StringKey.API_GUEST))
        ApiClient.api.changePassword(ChangePasswordRequest(currentPassword, newPassword)).requireOk()
    }

    // Ajustes › Zona de riesgo. Both confirm with the current password.
    suspend fun resetData(password: String): Result<Unit> = runCatching {
        if (DemoModeFlag.active) error(com.s2nova.app.ui.tr(com.s2nova.app.ui.StringKey.API_GUEST))
        ApiClient.api.resetData(PasswordConfirmRequest(password)).requireOk()
    }

    suspend fun deleteAccount(password: String): Result<Unit> = runCatching {
        if (DemoModeFlag.active) error(com.s2nova.app.ui.tr(com.s2nova.app.ui.StringKey.API_GUEST))
        ApiClient.api.deleteMe(PasswordConfirmRequest(password)).requireOk()
        biometricStore.clear()
        logout()
    }

    // "Cierre automático" heartbeat: tells the server the user is still
    // active, so its own idle check leaves the session alone (backend
    // lib/sessions.ts). A missed one only brings that check closer.
    suspend fun reportActivity() {
        if (DemoModeFlag.active || _currentUser.value == null) return
        runCatching { ApiClient.api.activity() }
    }

    // Best-effort remote mirror for a preference toggle already applied
    // locally via updateUser() — every Settings switch/choice needs this so
    // the choice survives a re-login or a second device, not just the
    // current in-memory session.
    suspend fun persistPreferences(request: com.s2nova.app.data.remote.UpdatePreferencesRequest) {
        if (DemoModeFlag.active) return
        runCatching { ApiClient.api.updatePreferences(request) }
    }

    // Signing out is immediate on the device; telling the server (which can
    // be slow or unreachable) happens afterwards on a scope of its own, so
    // neither a timeout nor the screen leaving can hold the user back.
    suspend fun logout() {
        // A stale per-device demo flag must never silently apply to
        // whichever account signs in next on this device.
        val wasGuest = DemoModeFlag.active
        DemoModeFlag.set(false)
        val refreshToken = sessionStore.refreshTokenOnce()
        sessionStore.clear()
        _currentUser.value = null
        if (wasGuest) return
        backgroundScope.launch {
            kotlinx.coroutines.withTimeoutOrNull(REMOTE_LOGOUT_TIMEOUT_MS) {
                runCatching { ApiClient.authApi.logout(RefreshRequest(refreshToken)) }
            }
            kotlinx.coroutines.withTimeoutOrNull(REMOTE_LOGOUT_TIMEOUT_MS) {
                runCatching { credentialManager.clearCredentialState(androidx.credentials.ClearCredentialStateRequest()) }
            }
        }
    }

    private val backgroundScope = kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.SupervisorJob() + kotlinx.coroutines.Dispatchers.IO)

    // "Cierre automático": a real sign-out (the server revokes the session,
    // this device forgets its tokens), then Login explains why.
    suspend fun logoutForIdle() {
        logout()
        _idleLogouts.tryEmit(Unit)
    }

    // The session ended under the user (SessionStore.sessionEnded): the
    // tokens are already gone; forget who was signed in.
    fun onSessionEnded() {
        DemoModeFlag.set(false)
        _currentUser.value = null
    }

    // Swaps in the fictitious local persona (demo mode) or restores a
    // previously signed-in user (exiting it) without any network call —
    // see AppContainer.enterDemoMode()/exitDemoMode().
    fun setCurrentUserLocally(user: User) {
        _currentUser.value = user
    }

    // Onboarding/tutorial completion is gated locally by OnboardingStore
    // (fast, offline splash-time check); these mirror that decision to the
    // backend so it stays the durable cross-device source of truth. Best
    // effort — a failure here never blocks onboarding from completing
    // locally.
    suspend fun markOnboardingCompleted() {
        runCatching { ApiClient.api.updatePreferences(UpdatePreferencesRequest(onboardingCompleted = true)) }
    }

    suspend fun markTutorialCompleted() {
        runCatching { ApiClient.api.updatePreferences(UpdatePreferencesRequest(tutorialCompleted = true)) }
    }

    // Mini-guides (ONBOARDING.md §3): "Entendido" adds the screen, "Omitir
    // guías" turns them all off, Ajustes › "Ver las guías otra vez" resets.
    // Persisted server-side so a guide seen here isn't repeated on Web.
    suspend fun updateGuides(seen: Set<String>, off: Boolean) {
        updateUser { it.copy(preferences = it.preferences.copy(guidesSeen = seen, guidesOff = off)) }
        persistPreferences(UpdatePreferencesRequest(guidesSeen = seen.toList(), guidesOff = off))
    }

    fun updateUser(update: (User) -> User) {
        _currentUser.value = _currentUser.value?.let(update)
    }
}
