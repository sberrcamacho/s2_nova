package com.s2nova.app.ui.nav

import org.junit.Test
import kotlin.test.assertEquals

class NovaNavGraphTest {
    @Test
    fun `not logged in always routes to login, regardless of onboarding state`() {
        assertEquals(NovaDestinations.LOGIN, splashDestinationFor(loggedIn = false, onboardingDone = false))
        assertEquals(NovaDestinations.LOGIN, splashDestinationFor(loggedIn = false, onboardingDone = true))
    }

    @Test
    fun `logged in but not onboarded routes to the first run`() {
        assertEquals(NovaDestinations.FIRST_RUN, splashDestinationFor(loggedIn = true, onboardingDone = false))
    }

    @Test
    fun `logged in and onboarded routes home`() {
        assertEquals(NovaDestinations.HOME, splashDestinationFor(loggedIn = true, onboardingDone = true))
    }

    @Test
    fun `a guest can't open the password, reset, delete or notification-reading screens`() {
        for (route in listOf(NovaDestinations.SETTINGS_PASSWORD, NovaDestinations.SETTINGS_RESET, NovaDestinations.SETTINGS_DELETE, NovaDestinations.SETTINGS_CAPTURE)) {
            kotlin.test.assertFalse(NovaDestinations.guestMayOpen(route), route)
        }
        kotlin.test.assertTrue(NovaDestinations.guestMayOpen(NovaDestinations.SETTINGS))
    }

    @Test
    fun `the risk confirmation words follow the app language`() {
        assertEquals("RESTABLECER", com.s2nova.app.ui.stringFor(com.s2nova.app.ui.StringKey.SET_RESET_WORD, com.s2nova.app.data.model.AppLanguage.ES))
        assertEquals("ELIMINAR", com.s2nova.app.ui.stringFor(com.s2nova.app.ui.StringKey.SET_DELETE_WORD, com.s2nova.app.data.model.AppLanguage.ES))
        assertEquals("RESET", com.s2nova.app.ui.stringFor(com.s2nova.app.ui.StringKey.SET_RESET_WORD, com.s2nova.app.data.model.AppLanguage.EN))
        assertEquals("DELETE", com.s2nova.app.ui.stringFor(com.s2nova.app.ui.StringKey.SET_DELETE_WORD, com.s2nova.app.data.model.AppLanguage.EN))
    }

    @Test
    fun `a locked account opens the lock screen instead of login`() {
        assertEquals(NovaDestinations.LOCK, splashDestinationFor(loggedIn = false, onboardingDone = true, locked = true))
        assertEquals(NovaDestinations.LOGIN, splashDestinationFor(loggedIn = false, onboardingDone = true, locked = false))
        // A restored session wins over a stale lock.
        assertEquals(NovaDestinations.HOME, splashDestinationFor(loggedIn = true, onboardingDone = true, locked = true))
    }

    @Test
    fun `the lock screen avatar shows up to two initials`() {
        assertEquals("AL", com.s2nova.app.ui.screens.auth.initialsOf("Ada  Lovelace Byron"))
        assertEquals("S2", com.s2nova.app.ui.screens.auth.initialsOf("  "))
    }
}
