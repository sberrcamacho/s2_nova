package com.s2nova.app.ui.theme

import androidx.compose.ui.graphics.Color

// Shared with web/src/index.css so both platforms share one visual
// identity; DESIGN-SYSTEM.md §2 is the source for every value. Keep the two
// in sync.

// Brand primitives, sampled from the logo mark. Never recolor them; screens
// use the semantic tokens below, not these.
object BrandColors {
    val lilac = Color(0xFFD485FB)
    val violet400 = Color(0xFFB859FB)
    val violet500 = Color(0xFF9A39F9)
    val violet600 = Color(0xFF6622D6)
    val indigo = Color(0xFF5712C2)
    val electric = Color(0xFFA80FFA)
    val blue = Color(0xFF0047F5)
    val cyan = Color(0xFF00C4FB)
}

// Light
val LightBg = Color(0xFFF7F7FA) // mockup --bg
val LightBgSecondary = Color(0xFFF7F7FA)
val LightSurface = Color(0xFFFFFFFF)
val LightSurfaceElevated = Color(0xFFFFFFFF)
val LightBorder = Color(0xFFEBEBF2)
val LightBorderStrong = Color(0xFFDCDCE6)
val LightPrimary = BrandColors.violet600 // white on it 7.60
val LightPrimarySecondary = BrandColors.violet500
val LightAccentSoft = Color(0xFFF0E9FB) // primary-soft
val LightText = Color(0xFF111118)
val LightTextSecondary = Color(0xFF666673)
val LightTextTertiary = Color(0xFF6B6B7A) // 5.24:1 on surface, 4.90:1 on bg

// Dark — genuinely near-black, not dark gray.
val DarkBg = Color(0xFF050507)
val DarkBgSecondary = Color(0xFF09090E)
val DarkSurface = Color(0xFF0E0E15)
val DarkSurfaceElevated = Color(0xFF13131D)
val DarkBorder = Color(0xFF2E2E40)
val DarkBorderStrong = Color(0xFF3A3A4E)
// Primary stays #6622D6 as a fill in dark too, but it is only 2.5:1 on the
// dark surfaces: text and icons use `link`, boundaries `primaryBorder`.
val DarkPrimary = BrandColors.violet600
val DarkPrimarySecondary = BrandColors.violet500
val DarkAccentSoft = Color(0xFF270E3A) // primary-soft
val DarkText = Color(0xFFFFFFFF)
val DarkTextSecondary = Color(0xFFA8A8B8)
val DarkTextTertiary = Color(0xFF8E8EA0) // 5.98:1 on surface

// Financial semantics (shared meaning across themes, different exact values).
val LightPositive = Color(0xFF0F7A4A) // 5.38:1
val LightNegative = Color(0xFFC0362F) // 5.51:1
val LightWarning = Color(0xFF8F5A00) // 5.78:1
val DarkPositive = Color(0xFF32C98A)
val DarkNegative = Color(0xFFFF6262)
val DarkWarning = Color(0xFFF0B429)

val OnPrimary = Color(0xFFFFFFFF)

// --dim (captions, dates), link (text links like "Ver todos", brand text on
// surfaces) and --subtle (row dividers).
val LightTextDim = Color(0xFF6B6B7A)
val DarkTextDim = Color(0xFF8E8EA0)
val LightAccentText = BrandColors.indigo // link, 9.25
val DarkAccentText = BrandColors.lilac // link, 7.83
val LightDividerSubtle = Color(0xFFF0F0F5)
val DarkDividerSubtle = Color(0xFF16161F)

// Brand-derived tokens with no Material slot (DESIGN-SYSTEM.md §2.2).
val PrimaryPressed = BrandColors.indigo
val LightAccent = BrandColors.blue // 6.52
val DarkAccent = BrandColors.cyan // 9.42
val LightBorderInput = Color(0xFF8C8C9C) // 3.31, inputs and outlines
val DarkBorderInput = Color(0xFF6A6A82) // 3.66
val LightPrimaryBorder = BrandColors.violet600 // selected boundaries
val DarkPrimaryBorder = BrandColors.electric // 3.77 on surface

// Balance hero (§2.2 "Hero card"), the only element with a brand gradient.
// Light: the logo's violet ramp. #9A39F9 sits past the far corner (as on
// Web), so the visible end is #802EE8: white text ≥ 6:1 and white on a hero
// tile ≥ 4.9:1. Income and expense are white there; the tile label carries
// the meaning, never green/red on violet.
val LightHeroFrom = BrandColors.indigo
val LightHeroMid = BrandColors.violet600
val LightHeroTo = Color(0xFF802EE8)
// Dark: deep violet with the dark mark's violet → blue glow top-right.
// Every text color stays ≥ 5:1 over the brightest part of the glow.
val DarkHeroBase = Color(0xFF1A0B3D)

// Budget card border once a budget crosses 90% utilization.
val LightNegativeBorder = Color(0xFFF0D2D2)
val DarkNegativeBorder = Color(0xFF3A2029)

// Bottom-sheet drag handle ("grip" in the design handoff) — distinct from
// every existing border/outline token, so it gets its own pair.
val LightSheetGrip = Color(0xFFC4C4D0)
val DarkSheetGrip = Color(0xFF3A3A4A)

// Permanently-dark surfaces (bottom nav, scanner, sidebar-equivalent chrome)
// independent of the light/dark app theme — matches the web sidebar.
val ScanSurface = Color(0xFF000000)
val NavyPanel = Color(0xFF0B0B14)

// Login/signup surfaces and the password-strength meter. The primary,
// focus border and link colors of these screens are the semantic brand
// tokens (Theme.kt maps loginPrimary/loginBorderFocus/loginHighlight onto
// them, DESIGN-SYSTEM.md §10.2).
val LoginSurfaceDark = Color(0xFF0B0B14)
val LoginSurfaceLight = Color(0xFFF6F6FA)
val LoginTextMutedDark = Color(0x80FFFFFF) // rgba(255,255,255,.50)
val LoginLabelDark = Color(0x8CFFFFFF) // rgba(255,255,255,.55)
val LoginPositiveLight = Color(0xFF12B981)
val LoginPositiveDark = Color(0xFF7CF0BB)
val LoginPositiveBgLight = Color(0xFFE6E6EE)
val LoginPositiveBgDark = Color(0x1FFFFFFF) // rgba(255,255,255,.12)
