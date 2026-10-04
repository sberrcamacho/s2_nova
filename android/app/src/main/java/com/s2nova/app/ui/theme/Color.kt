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
val LightBg = Color(0xFFF7F5FD) // mockup --bg
val LightBgSecondary = Color(0xFFFCFBFF)
val LightSurface = Color(0xFFFFFFFF)
val LightSurfaceElevated = Color(0xFFFFFFFF)
val LightBorder = Color(0xFFE8E2F6)
val LightBorderStrong = Color(0xFFD9D0F0)
val LightPrimary = BrandColors.violet600 // white on it 7.60
val LightPrimarySecondary = BrandColors.violet500
val LightAccentSoft = Color(0xFFF0E9FB) // primary-soft
val LightText = Color(0xFF120D24)
val LightTextSecondary = Color(0xFF5D5873)
val LightTextTertiary = Color(0xFF6B6582) // 5.24:1 on surface, 4.90:1 on bg

// Dark — genuinely near-black, not dark gray.
val DarkBg = Color(0xFF060512)
val DarkBgSecondary = Color(0xFF0A0919)
val DarkSurface = Color(0xFF0E0C20)
val DarkSurfaceElevated = Color(0xFF13112D)
val DarkBorder = Color(0xFF221F44)
val DarkBorderStrong = Color(0xFF2D2958)
// Primary stays #6622D6 as a fill in dark too, but it is only 2.5:1 on the
// dark surfaces: text and icons use `link`, boundaries `primaryBorder`.
val DarkPrimary = BrandColors.violet600
val DarkPrimarySecondary = BrandColors.violet500
val DarkAccentSoft = Color(0xFF241046) // primary-soft
val DarkText = Color(0xFFF5F3FF)
val DarkTextSecondary = Color(0xFFB1ABD0)
val DarkTextTertiary = Color(0xFF8F89B3) // 5.98:1 on surface

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
val LightTextDim = Color(0xFF6B6582)
val DarkTextDim = Color(0xFF8F89B3)
val LightAccentText = BrandColors.indigo // link, 9.25
val DarkAccentText = BrandColors.lilac // link, 7.83
val LightDividerSubtle = Color(0xFFF0EBFA)
val DarkDividerSubtle = Color(0xFF181535)

// Track of progress bars and input fills (DESIGN-SYSTEM.md §2.2 surface-sunken).
val LightSurfaceSunken = Color(0xFFECE6F8)
val DarkSurfaceSunken = Color(0xFF1D1A3D)

// Brand-derived tokens with no Material slot (DESIGN-SYSTEM.md §2.2).
val PrimaryPressed = BrandColors.indigo
val LightAccent = BrandColors.blue // 6.52
val DarkAccent = BrandColors.cyan // 9.42
val LightBorderInput = Color(0xFF8C8C9C) // 3.31, inputs and outlines
val DarkBorderInput = Color(0xFF7A72A8) // 3.66
val LightPrimaryBorder = BrandColors.violet600 // selected boundaries
val DarkPrimaryBorder = BrandColors.electric // 3.77 on surface

// Balance hero (§2.2 "Hero card"), the only element with a brand gradient.
// Light: the logo's violet ramp. #9A39F9 sits past the far corner (as on
// Web), so the visible end is #802EE8: white text ≥ 6:1 and white on a hero
// tile ≥ 4.9:1. Income and expense are white there; the tile label carries
// the meaning, never green/red on violet.
val LightHeroFrom = BrandColors.indigo
val LightHeroMid = BrandColors.violet600
val LightHeroTo = Color(0xFF8A2FF0)
// Dark (web rework, aurora): #2A0B6E → #1B1A8F → #0B2A8A with the dark
// mark's cyan glowing top-right and electric violet bottom-left. White text
// stays ≥ 6:1 over the brightest blend (same values as web --hero-bg).
val DarkHeroFrom = Color(0xFF230A5E)
val DarkHeroBase = Color(0xFF17167A)
val DarkHeroTo = Color(0xFF0A2476)

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
val NavyPanel = Color(0xFF09081A)

// Login/signup surfaces and the password-strength meter. The primary,
// focus border and link colors of these screens are the semantic brand
// tokens (Theme.kt maps loginPrimary/loginBorderFocus/loginHighlight onto
// them, DESIGN-SYSTEM.md §10.2).
val LoginSurfaceDark = Color(0xFF09081A)
val LoginSurfaceLight = Color(0xFFF6F6FA)
val LoginTextMutedDark = Color(0x80FFFFFF) // rgba(255,255,255,.50)
val LoginLabelDark = Color(0x8CFFFFFF) // rgba(255,255,255,.55)
val LoginPositiveLight = Color(0xFF12B981)
val LoginPositiveDark = Color(0xFF7CF0BB)
val LoginPositiveBgLight = Color(0xFFE6E6EE)
val LoginPositiveBgDark = Color(0x1FFFFFFF) // rgba(255,255,255,.12)
