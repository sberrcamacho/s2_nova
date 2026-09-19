package com.s2nova.app.data.repository

import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.data.model.Currency
import com.s2nova.app.data.remote.MePreferencesDto
import com.s2nova.app.data.remote.MeResponse
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse

class AuthMappingTest {

    private fun meResponse(preferences: MePreferencesDto?, name: String = "Ada Lovelace") = MeResponse(
        id = "u1",
        name = name,
        email = "ada@example.com",
        createdAt = "2026-01-01T00:00:00.000Z",
        hasPassword = true,
        preferences = preferences,
    )

    @Test
    fun `toUser maps every preference field when present`() {
        val prefs = MePreferencesDto(
            language = "en", currency = "USD", theme = "DARK", notifications = false,
            biometricLogin = true, blurBalance = true, autoLockMinutes = 15,
            onboardingCompleted = true, tutorialCompleted = true,
        )
        val user = meResponse(prefs).toUser()
        assertEquals(true, user.preferences.darkTheme)
        assertEquals(false, user.preferences.notifications)
        assertEquals(true, user.preferences.biometricLogin)
        assertEquals(true, user.preferences.blurBalance)
        assertEquals(15, user.preferences.autoLockMinutes)
        assertEquals(Currency.USD, user.preferences.currency)
        assertEquals(AppLanguage.EN, user.preferences.language)
    }

    // Regression guard: a backend deployed before a preference existed
    // returns preferences = null — this must never crash or silently turn on
    // a password gate (autoLockMinutes) nobody asked for.
    @Test
    fun `toUser defaults sensibly when preferences is entirely absent`() {
        val user = meResponse(preferences = null).toUser()
        assertFalse(user.preferences.darkTheme)
        assertEquals(true, user.preferences.notifications)
        assertEquals(false, user.preferences.biometricLogin)
        assertEquals(0, user.preferences.autoLockMinutes)
        assertEquals(Currency.COP, user.preferences.currency)
        assertEquals(AppLanguage.ES, user.preferences.language)
    }

    @Test
    fun `toUser falls back to COP and ES on an unrecognized currency or language string`() {
        val prefs = MePreferencesDto(
            language = "fr", currency = "EUR", theme = "LIGHT", notifications = true,
            biometricLogin = false, onboardingCompleted = false, tutorialCompleted = false,
        )
        val user = meResponse(prefs).toUser()
        assertEquals(Currency.COP, user.preferences.currency)
        assertEquals(AppLanguage.ES, user.preferences.language)
    }

    @Test
    fun `avatarInitials takes the first letter of up to two words, or falls back to US`() {
        assertEquals("AL", meResponse(null, name = "Ada Lovelace").toUser().avatarInitials)
        assertEquals("A", meResponse(null, name = "Ada").toUser().avatarInitials)
        assertEquals("US", meResponse(null, name = "   ").toUser().avatarInitials)
    }
}
