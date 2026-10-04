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
val LightBg = Color(0xFFF6F6F9) // cool off-white with a faint indigo bias
val LightBgSecondary = Color(0xFFFAFAFC)
val LightSurface = Color(0xFFFFFFFF)
val LightSurfaceElevated = Color(0xFFFFFFFF)
val LightBorder = Color(0xFFE4E2EC)
val LightBorderStrong = Color(0xFFD6D3E0)
val LightPrimary = BrandColors.indigo // white on it 9.25
val LightPrimarySecondary = BrandColors.violet600
val LightAccentSoft = Color(0xFFF1EAFC) // primary-soft
val LightText = Color(0xFF15131F)
val LightTextSecondary = Color(0xFF5C5870) // 6.81 on surface
val LightTextTertiary = Color(0xFF686480) // 5.6:1 on surface, 5.2:1 on bg

// Dark — deep indigo ink: near-black with the brand's temperature, not zinc.
val DarkBg = Color(0xFF0C0B14)
val DarkBgSecondary = Color(0xFF100F19)
val DarkSurface = Color(0xFF15131F)
val DarkSurfaceElevated = Color(0xFF1C1A28)
val DarkBorder = Color(0xFF2A2738)
val DarkBorderStrong = Color(0xFF363246)
// Primary stays #6622D6 as a fill in dark too, but it is only 2.5:1 on the
// dark surfaces: text and icons use `link`, boundaries `primaryBorder`.
val DarkPrimary = BrandColors.violet600
val DarkPrimarySecondary = BrandColors.violet500
val DarkAccentSoft = Color(0xFF241A3D) // primary-soft
val DarkText = Color(0xFFEEEDF5)
val DarkTextSecondary = Color(0xFFA8A3BD) // 7.55 on surface
val DarkTextTertiary = Color(0xFF928DA8) // 5.7:1 on surface

// Financial semantics (shared meaning across themes, different exact values).
val LightPositive = Color(0xFF0E7A55) // 5.34:1
val LightNegative = Color(0xFFC02B45) // 5.72:1
val LightWarning = Color(0xFF8F5A00) // 5.78:1
val DarkPositive = Color(0xFF3FD08E)
val DarkNegative = Color(0xFFFF7085)
val DarkWarning = Color(0xFFF0B429)

val OnPrimary = Color(0xFFFFFFFF)

// --dim (captions, dates), link (text links like "Ver todos", brand text on
// surfaces) and --subtle (row dividers).
val LightTextDim = Color(0xFF686480)
val DarkTextDim = Color(0xFF928DA8)
val LightAccentText = BrandColors.indigo // link, 9.25
val DarkAccentText = Color(0xFFC29BFF) // link, 8.23 (the electric violet, lightened)
val LightDividerSubtle = Color(0xFFEFEEF4)
val DarkDividerSubtle = Color(0xFF1F1D2B)

// Track of progress bars and input fills (DESIGN-SYSTEM.md §2.2 surface-sunken).
val LightSurfaceSunken = Color(0xFFF0EFF5)
val DarkSurfaceSunken = Color(0xFF1F1D2C)

// Brand-derived tokens with no Material slot (DESIGN-SYSTEM.md §2.2).
val PrimaryPressed = BrandColors.indigo
val LightAccent = BrandColors.blue // 6.52
val DarkAccent = BrandColors.cyan // 9.42
val LightBorderInput = Color(0xFF8F8AA3) // 3.32, inputs and outlines
val DarkBorderInput = Color(0xFF6C6785) // 3.42
val LightPrimaryBorder = BrandColors.indigo // selected boundaries
val DarkPrimaryBorder = Color(0xFFA77BFF) // 6.0 on surface

// Balance hero (§2.2 "Hero card"), the one element with the brand gradient:
// deep and restrained, no auroras. Light runs the light mark's darker stops,
// dark the dark mark's violet into electric blue. White text is ≥ 7:1 on
// every stop and the hero labels (white .82) ≥ 5.5:1.
val LightHeroFrom = Color(0xFF2A0B66)
val LightHeroMid = Color(0xFF4512A3)
val LightHeroTo = BrandColors.indigo
val DarkHeroFrom = Color(0xFF1B0E4A)
val DarkHeroBase = Color(0xFF2B1A8F)
val DarkHeroTo = Color(0xFF0B3FA8)

// Budget card border once a budget crosses 90% utilization.
val LightNegativeBorder = Color(0xFFF0D2D2)
val DarkNegativeBorder = Color(0xFF3A2029)

// Bottom-sheet drag handle ("grip" in the design handoff) — distinct from
// every existing border/outline token, so it gets its own pair.
val LightSheetGrip = Color(0xFFC4C2D0)
val DarkSheetGrip = Color(0xFF3F3B50)

// Permanently-dark surfaces (bottom nav, scanner, sidebar-equivalent chrome)
// independent of the light/dark app theme — matches the web sidebar.
val ScanSurface = Color(0xFF000000)
val NavyPanel = Color(0xFF0C0B14)

// Login/signup surfaces and the password-strength meter. The primary,
// focus border and link colors of these screens are the semantic brand
// tokens (Theme.kt maps loginPrimary/loginBorderFocus/loginHighlight onto
// them, DESIGN-SYSTEM.md §10.2).
val LoginSurfaceDark = Color(0xFF0C0B14)
val LoginSurfaceLight = Color(0xFFF6F6F9)
val LoginTextMutedDark = Color(0x80FFFFFF) // rgba(255,255,255,.50)
val LoginLabelDark = Color(0x8CFFFFFF) // rgba(255,255,255,.55)
val LoginPositiveLight = Color(0xFF12B981)
val LoginPositiveDark = Color(0xFF7CF0BB)
val LoginPositiveBgLight = Color(0xFFE6E6EE)
val LoginPositiveBgDark = Color(0x1FFFFFFF) // rgba(255,255,255,.12)
