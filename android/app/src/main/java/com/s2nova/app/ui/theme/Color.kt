package com.s2nova.app.ui.theme

import androidx.compose.ui.graphics.Color

// Ported 1:1 from web/src/index.css custom properties, so both platforms
// share one visual identity. Keep in sync if the web tokens change.

// Light
val LightBg = Color(0xFFFFFFFF)
val LightBgSecondary = Color(0xFFF7F7FA)
val LightSurface = Color(0xFFFFFFFF)
val LightSurfaceElevated = Color(0xFFFFFFFF)
val LightBorder = Color(0xFFEBEBF2)
val LightBorderStrong = Color(0xFFDCDCE6)
val LightPrimary = Color(0xFF6657E8)
val LightPrimarySecondary = Color(0xFF7B6FF6)
val LightAccentSoft = Color(0xFFEAE7FF)
val LightText = Color(0xFF111118)
val LightTextSecondary = Color(0xFF666673)
val LightTextTertiary = Color(0xFF9C9CAA)

// Dark — genuinely near-black, not dark gray.
val DarkBg = Color(0xFF050507)
val DarkBgSecondary = Color(0xFF09090E)
val DarkSurface = Color(0xFF0E0E15)
val DarkSurfaceElevated = Color(0xFF13131D)
val DarkBorder = Color(0xFF1C1C28)
val DarkBorderStrong = Color(0xFF262635)
val DarkPrimary = Color(0xFF6C5CE7)
val DarkPrimarySecondary = Color(0xFF8578FF)
val DarkAccentSoft = Color(0x296C5CE7) // rgba(108,92,231,0.16)
val DarkText = Color(0xFFFFFFFF)
val DarkTextSecondary = Color(0xFFA8A8B8)
val DarkTextTertiary = Color(0xFF6F6F82)

// Financial semantics (shared meaning across themes, different exact values).
val LightPositive = Color(0xFF22A06B)
val LightNegative = Color(0xFFD64545)
val LightWarning = Color(0xFFB5760F)
val DarkPositive = Color(0xFF32C98A)
val DarkNegative = Color(0xFFFF6262)
val DarkWarning = Color(0xFFF0B429)

val OnPrimary = Color(0xFFFFFFFF)

// Balance hero card gradient (dark navy → bluish-purple), same in both themes.
val HeroFrom = Color(0xFF16123A)
val HeroTo = Color(0xFF241A5E)

// Permanently-dark surfaces (bottom nav, scanner, sidebar-equivalent chrome)
// independent of the light/dark app theme — matches the web sidebar.
val ScanSurface = Color(0xFF000000)
val NavyPanel = Color(0xFF0B0B14)
