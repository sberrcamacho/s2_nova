package com.s2nova.app.data.repository

import com.s2nova.app.data.mock.DEMO_EMAIL
import com.s2nova.app.data.mock.mockUser
import com.s2nova.app.data.model.User
import com.s2nova.app.data.model.UserPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

// Mock, in-memory session — mirrors web/src/services/authService.ts /
// AuthContext.tsx. Any password is accepted as long as the email matches
// the seeded demo account, same as the web app's mock auth.
class AuthRepository {
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    fun login(email: String, password: String): Boolean {
        if (password.isBlank()) return false
        if (!email.trim().equals(DEMO_EMAIL, ignoreCase = true)) return false
        _currentUser.value = mockUser
        return true
    }

    fun register(name: String, email: String, password: String): Boolean {
        if (name.isBlank() || email.isBlank() || password.length < 6) return false
        val initials = name.trim().split(" ").filter { it.isNotBlank() }
            .take(2).joinToString("") { it.first().uppercase() }
            .ifBlank { "US" }
        _currentUser.value = User(
            id = "usr_${System.currentTimeMillis()}",
            name = name.trim(),
            email = email.trim(),
            phone = "",
            city = "",
            avatarInitials = initials,
            memberSince = com.s2nova.app.data.todayISO(),
            preferences = UserPreferences(darkTheme = false, notifications = true, biometricLogin = false),
        )
        return true
    }

    fun updateUser(update: (User) -> User) {
        _currentUser.value = _currentUser.value?.let(update)
    }

    fun logout() {
        _currentUser.value = null
    }
}
