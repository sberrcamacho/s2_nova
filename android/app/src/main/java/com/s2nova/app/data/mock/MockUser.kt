package com.s2nova.app.data.mock

import com.s2nova.app.data.model.User
import com.s2nova.app.data.model.UserPreferences

// Mirrors web/src/data/user.ts
val mockUser = User(
    id = "usr_001",
    name = "Mariana Torres",
    email = "mariana.torres@example.com",
    phone = "+57 300 555 1234",
    city = "Bogotá, D.C.",
    avatarInitials = "MT",
    memberSince = "2024-11-02",
    preferences = UserPreferences(darkTheme = false, notifications = true, biometricLogin = false),
)

const val DEMO_EMAIL = "mariana.torres@example.com"
const val DEMO_PASSWORD = "nova2026"
