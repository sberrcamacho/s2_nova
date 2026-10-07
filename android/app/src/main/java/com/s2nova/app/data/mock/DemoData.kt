package com.s2nova.app.data.mock

import com.s2nova.app.data.model.User
import com.s2nova.app.data.model.UserPreferences
import java.time.LocalDate

// The guest user ("Continuar como invitado", ONBOARDING.md §1). The
// account's data comes from the seed shared with Web (GuestSeed). Never
// sent to the server.
object DemoData {
    fun user(preferences: UserPreferences) = User(
        id = "demo-local-user",
        name = "Invitado",
        email = "invitado@s2nova.local",
        // The example account behaves like a password account (as on Web):
        // Cambiar contraseña asks for the current one.
        hasPassword = true,
        avatarInitials = "IN",
        // The example account starts with the seed's first month.
        memberSince = LocalDate.now().withDayOfMonth(1).minusMonths(11).toString(),
        preferences = preferences.copy(guidesSeen = emptySet(), guidesOff = false),
        principalCurrency = "COP",
    )
}
