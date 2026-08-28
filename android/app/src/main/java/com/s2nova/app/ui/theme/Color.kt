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

// Home "Saldo total" hero's 60%-stop color (dark theme only, per mockup's
// linear-gradient(150deg, #050507 0%, #151041 60%, #211a4d 100%)) — deliberately
// richer/more saturated than a straight lerp between DarkBg and #211A4D would give.
val DarkHeroMid = Color(0xFF151041)

// Home balance hero card border — identical in both themes.
val HeroBorder = Color(0xFF2B2450)

// Budget card border once a budget crosses 90% utilization.
val LightNegativeBorder = Color(0xFFF0D2D2)
val DarkNegativeBorder = Color(0xFF3A2029)

// Permanently-dark surfaces (bottom nav, scanner, sidebar-equivalent chrome)
// independent of the light/dark app theme — matches the web sidebar.
val ScanSurface = Color(0xFF000000)
val NavyPanel = Color(0xFF0B0B14)

// Login-screen tokens from the design handoff (s2-nova-mockup/login_handoff/
// LOGIN.md §1) — kept separate from the values above because several are
// pixel-exact requirements that don't cleanly match an existing near-equivalent.
val LoginSurfaceDark = Color(0xFF0B0B14)
val LoginSurfaceLight = Color(0xFFF6F6FA)
val LoginBorderFocusLight = Color(0xFF7B6FF6)
val LoginTextMutedDark = Color(0x80FFFFFF) // rgba(255,255,255,.50)
val LoginLabelDark = Color(0x8CFFFFFF) // rgba(255,255,255,.55)
val LoginPrimaryFlat = Color(0xFF7B6FF6) // same value in both themes
