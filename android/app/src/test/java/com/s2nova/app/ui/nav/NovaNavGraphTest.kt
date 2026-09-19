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
    fun `logged in but not onboarded routes to onboarding`() {
        assertEquals(NovaDestinations.ONBOARDING_WELCOME, splashDestinationFor(loggedIn = true, onboardingDone = false))
    }

    @Test
    fun `logged in and onboarded routes home`() {
        assertEquals(NovaDestinations.HOME, splashDestinationFor(loggedIn = true, onboardingDone = true))
    }
}
