package com.s2nova.app.data.repository

import com.s2nova.app.data.local.OnboardingStore
import com.s2nova.app.data.local.SessionStore
import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.data.model.Currency
import com.s2nova.app.data.model.User
import com.s2nova.app.data.model.UserPreferences
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.LoginRequest
import com.s2nova.app.data.remote.MeResponse
import com.s2nova.app.data.remote.RefreshRequest
import com.s2nova.app.data.remote.RegisterRequest
import com.s2nova.app.data.remote.UpdatePreferencesRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

private fun initialsFor(name: String): String =
    name.trim().split(Regex("\\s+")).filter { it.isNotBlank() }.take(2)
        .joinToString("") { it.first().uppercase() }.ifBlank { "US" }

private fun MeResponse.toUser(): User {
    val prefs = preferences
    return User(
        id = id,
        name = name,
        email = email,
        phone = "",
        city = "",
        avatarInitials = initialsFor(name),
        memberSince = createdAt.take(10),
        preferences = UserPreferences(
            darkTheme = prefs?.theme == "DARK",
            notifications = prefs?.notifications ?: true,
            biometricLogin = prefs?.biometricLogin ?: false,
            currency = prefs?.currency?.let { runCatching { Currency.valueOf(it) }.getOrNull() } ?: Currency.COP,
            language = prefs?.language?.let { runCatching { AppLanguage.valueOf(it.uppercase()) }.getOrNull() } ?: AppLanguage.ES,
        ),
    )
}

// Real backend-backed session — replaces the earlier any-password-accepted
// mock, since Wallets/Transactions/Budgets/Goals now need a real
// authenticated user. Still StateFlow-based like every other repository,
// no ViewModel: screens launch these suspend functions via
// rememberCoroutineScope().launch { ... }.
class AuthRepository(private val sessionStore: SessionStore, private val onboardingStore: OnboardingStore) {
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
        } catch (error: Exception) {
            sessionStore.clear()
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

    suspend fun logout() {
        val refreshToken = sessionStore.refreshTokenOnce()
        runCatching { ApiClient.authApi.logout(RefreshRequest(refreshToken)) }
        sessionStore.clear()
        _currentUser.value = null
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

    fun updateUser(update: (User) -> User) {
        _currentUser.value = _currentUser.value?.let(update)
    }
}
