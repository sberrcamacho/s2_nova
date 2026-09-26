package com.s2nova.app.data.repository

import com.s2nova.app.data.local.OnboardingStore
import com.s2nova.app.data.local.SessionStore
import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.data.model.Currency
import com.s2nova.app.data.model.User
import com.s2nova.app.data.model.UserPreferences
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.GoogleLoginRequest
import com.s2nova.app.data.remote.LoginRequest
import com.s2nova.app.data.remote.MeResponse
import com.s2nova.app.data.remote.RefreshRequest
import com.s2nova.app.data.remote.RegisterRequest
import com.s2nova.app.data.remote.UpdatePreferencesRequest
import com.s2nova.app.data.remote.UpdateProfileRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

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
            autoLockMinutes = prefs?.autoLockMinutes ?: 0,
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
) {
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    // Keeps the local (per-device, offline-checkable) onboarding flag in
    // sync with the backend's — matters when the same account signs in on
    // a second device or reinstall, where the local flag alone would
    // otherwise incorrectly re-trigger onboarding for a returning user.
    private suspend fun fetchAndSyncMe(): User {
        val response = ApiClient.api.me()
        if (response.preferences?.onboardingCompleted == true) onboardingStore.markOnboardingComplete()
        if (response.preferences?.tutorialCompleted == true) onboardingStore.markTutorialComplete()
        return response.toUser()
    }

    // Called once at cold start (splash): if a refresh token is already
    // stored, fetch /me to restore the session without asking the user to
    // log in again. Returns whether a session was restored.
    suspend fun bootstrap(): Boolean {
        if (sessionStore.refreshTokenOnce() == null) return false
        return try {
            _currentUser.value = fetchAndSyncMe()
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
        _currentUser.value = fetchAndSyncMe()
    }

    suspend fun register(name: String, email: String, password: String): Result<Unit> = runCatching {
        val session = ApiClient.authApi.register(RegisterRequest(name.trim(), email.trim(), password))
        sessionStore.saveSession(session.accessToken, session.refreshToken)
        _currentUser.value = fetchAndSyncMe()
    }

    suspend fun loginWithGoogle(idToken: String): Result<Unit> = runCatching {
        val session = ApiClient.authApi.loginWithGoogle(GoogleLoginRequest(idToken))
        sessionStore.saveSession(session.accessToken, session.refreshToken)
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
            if (DemoModeFlag.active) error("No disponible en modo demo.")
            val response = ApiClient.api.updateProfile(UpdateProfileRequest(name, email, phone, city, currentPassword))
            _currentUser.value = response.toUser()
        }

    // "Is this still you?" check for the auto-lock overlay — never rotates
    // tokens, so a wrong guess just re-shows the prompt.
    suspend fun verifyPassword(password: String): Boolean {
        if (DemoModeFlag.active) return true
        val response = ApiClient.api.verifyPassword(com.s2nova.app.data.remote.VerifyPasswordRequest(password))
        return response.isSuccessful
    }

    // Best-effort remote mirror for a preference toggle already applied
    // locally via updateUser() — every Settings switch/choice needs this so
    // the choice survives a re-login or a second device, not just the
    // current in-memory session.
    suspend fun persistPreferences(request: com.s2nova.app.data.remote.UpdatePreferencesRequest) {
        if (DemoModeFlag.active) return
        runCatching { ApiClient.api.updatePreferences(request) }
    }

    suspend fun logout() {
        // A stale per-device demo flag must never silently apply to
        // whichever account signs in next on this device.
        DemoModeFlag.set(false)
        val refreshToken = sessionStore.refreshTokenOnce()
        runCatching { ApiClient.authApi.logout(RefreshRequest(refreshToken)) }
        runCatching { credentialManager.clearCredentialState(androidx.credentials.ClearCredentialStateRequest()) }
        sessionStore.clear()
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
