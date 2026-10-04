package com.s2nova.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// Financial-semantic + hero-gradient colors Material3's ColorScheme has no
// slot for — exposed via CompositionLocal so any screen can reach them the
// same way it reaches MaterialTheme.colorScheme.
data class NovaExtraColors(
    val positive: Color,
    val positiveSoft: Color,
    val negative: Color,
    val negativeSoft: Color,
    val warning: Color,
    val warningSoft: Color,
    // Balance hero (DESIGN-SYSTEM.md §2.2): a three-stop diagonal gradient
    // (heroMid at heroMidStop) plus a radial glow in the top-right corner.
    val heroFrom: Color,
    val heroMid: Color,
    val heroMidStop: Float,
    val heroTo: Color,
    val heroGlow: List<Color>,
    val heroBorder: Color,
    val heroTile: Color,
    val heroOverline: Color,
    val heroLabel: Color,
    val heroPositive: Color,
    val heroNegative: Color,
    // Brand-derived tokens with no Material slot.
    val link: Color,
    val accent: Color,
    val focus: Color,
    val primaryPressed: Color,
    val primaryBorder: Color,
    val borderInput: Color,
    val negativeBorder: Color,
    val navyPanel: Color,
    val scanSurface: Color,
    val sheetSurface: Color,
    val sheetGrip: Color,
    val loginSurface: Color,
    val loginBorderFocus: Color,
    val loginTextMuted: Color,
    val loginLabel: Color,
    val loginPrimary: Color,
    val loginPositive: Color,
    val loginPositiveBg: Color,
    val loginHighlight: Color,
    val textDim: Color,
    val accentText: Color,
    val dividerSubtle: Color,
    val surfaceSunken: Color,
    // `surface-raised` (§2.1): dialogs and menus.
    val surfaceRaised: Color,
    // Unselected filter pill (mockup pill(): --surface2, --chip-text,
    // 1px rgba(111,111,130,.4) border).
    val pillSurface: Color,
    val pillText: Color,
    val pillBorder: Color = Color(0x666F6F82),
    // Mockup --bg-deep (read-only field, segmented control track) and
    // --grip2 (row chevrons).
    val bgDeep: Color,
    val grip2: Color,
    // Nova brand layer (same values as web/src/index.css). Since the 2026-10
    // "brand-signature" direction the brand gradient lives only on the hero:
    // the CTA and rings are solid primary and the auroras are transparent
    // (kept as slots so the layer can be tuned in one place).
    val heroGlow2: List<Color>,
    val cta: List<Color>,
    val ring: List<Color>,
    val cardAurora: Color,
    val cardAurora2: Color,
    val appAurora: List<Color>,
    val navActiveLine: Color,
)

private val LightExtraColors = NovaExtraColors(
    positive = LightPositive,
    positiveSoft = LightPositive.copy(alpha = 0.12f),
    negative = LightNegative,
    negativeSoft = LightNegative.copy(alpha = 0.12f),
    warning = LightWarning,
    warningSoft = LightWarning.copy(alpha = 0.12f),
    heroFrom = LightHeroFrom,
    heroMid = LightHeroMid,
    heroMidStop = 0.58f,
    heroTo = LightHeroTo,
    heroGlow = listOf(Color.Transparent, Color.Transparent),
    heroBorder = Color.White.copy(alpha = 0.10f),
    heroTile = Color.White.copy(alpha = 0.12f),
    heroOverline = Color.White.copy(alpha = 0.88f),
    heroLabel = Color.White.copy(alpha = 0.82f),
    heroPositive = Color.White,
    heroNegative = Color.White,
    link = LightAccentText,
    accent = LightAccent,
    focus = LightPrimary,
    primaryPressed = PrimaryPressed,
    primaryBorder = LightPrimaryBorder,
    borderInput = LightBorderInput,
    negativeBorder = LightNegativeBorder,
    navyPanel = NavyPanel,
    scanSurface = Color(0xFF0B0B12),
    sheetSurface = LightSurface,
    sheetGrip = LightSheetGrip,
    loginSurface = LoginSurfaceLight,
    loginBorderFocus = LightPrimaryBorder,
    loginTextMuted = LightTextTertiary,
    loginLabel = LightTextSecondary,
    loginPrimary = LightPrimary,
    loginPositive = LoginPositiveLight,
    loginPositiveBg = LoginPositiveBgLight,
    loginHighlight = LightAccentText,
    textDim = LightTextDim,
    accentText = LightAccentText,
    dividerSubtle = LightDividerSubtle,
    surfaceSunken = LightSurfaceSunken,
    surfaceRaised = LightSurface,
    pillSurface = LightSurface,
    pillText = LightText,
    bgDeep = LightSurfaceSunken,
    grip2 = Color(0xFFB3B0C2),
    heroGlow2 = listOf(Color.Transparent, Color.Transparent),
    cta = listOf(LightPrimary, LightPrimary),
    ring = listOf(LightPrimary, LightPrimary),
    cardAurora = Color.Transparent,
    cardAurora2 = Color.Transparent,
    appAurora = listOf(Color.Transparent, Color.Transparent),
    navActiveLine = LightPrimary,
)

private val DarkExtraColors = NovaExtraColors(
    positive = DarkPositive,
    positiveSoft = DarkPositive.copy(alpha = 0.14f),
    negative = DarkNegative,
    negativeSoft = DarkNegative.copy(alpha = 0.14f),
    warning = DarkWarning,
    warningSoft = DarkWarning.copy(alpha = 0.14f),
    heroFrom = DarkHeroFrom,
    heroMid = DarkHeroBase,
    heroMidStop = 0.55f,
    heroTo = DarkHeroTo,
    heroGlow = listOf(Color.Transparent, Color.Transparent),
    heroBorder = Color.White.copy(alpha = 0.10f),
    heroTile = Color.White.copy(alpha = 0.1f),
    heroOverline = Color.White.copy(alpha = 0.85f),
    heroLabel = Color.White.copy(alpha = 0.78f),
    heroPositive = Color(0xFF5FF0B0),
    heroNegative = Color(0xFFFFB4B4),
    link = DarkAccentText,
    accent = DarkAccent,
    focus = DarkPrimaryBorder,
    primaryPressed = PrimaryPressed,
    primaryBorder = DarkPrimaryBorder,
    borderInput = DarkBorderInput,
    negativeBorder = DarkNegativeBorder,
    navyPanel = NavyPanel,
    scanSurface = ScanSurface,
    sheetSurface = DarkSurface,
    sheetGrip = DarkSheetGrip,
    loginSurface = LoginSurfaceDark,
    loginBorderFocus = DarkPrimaryBorder,
    loginTextMuted = LoginTextMutedDark,
    loginLabel = LoginLabelDark,
    loginPrimary = DarkPrimary,
    loginPositive = LoginPositiveDark,
    loginPositiveBg = LoginPositiveBgDark,
    loginHighlight = DarkAccentText,
    textDim = DarkTextDim,
    accentText = DarkAccentText,
    dividerSubtle = DarkDividerSubtle,
    surfaceSunken = DarkSurfaceSunken,
    surfaceRaised = DarkSurfaceElevated,
    pillSurface = DarkSurface,
    pillText = DarkText,
    bgDeep = DarkBgSecondary,
    grip2 = Color(0xFF4A4660),
    heroGlow2 = listOf(Color.Transparent, Color.Transparent),
    cta = listOf(DarkPrimary, DarkPrimary),
    ring = listOf(DarkPrimaryBorder, DarkPrimaryBorder),
    cardAurora = Color.Transparent,
    cardAurora2 = Color.Transparent,
    appAurora = listOf(Color.Transparent, Color.Transparent),
    navActiveLine = DarkPrimaryBorder,
)

val LocalNovaExtraColors = staticCompositionLocalOf { LightExtraColors }

private val LightScheme = lightColorScheme(
    primary = LightPrimary,
    onPrimary = OnPrimary,
    secondary = LightPrimarySecondary,
    background = LightBg,
    onBackground = LightText,
    surface = LightSurface,
    onSurface = LightText,
    surfaceVariant = LightBgSecondary,
    onSurfaceVariant = LightTextSecondary,
    outline = LightBorder,
    // Material's outlineVariant carries the boundaries of inputs, radios and
    // option cards across the app, so it is `border-input` (3:1).
    outlineVariant = LightBorderInput,
    error = LightNegative,
    primaryContainer = LightAccentSoft,
    onPrimaryContainer = LightAccentText,
)

private val DarkScheme = darkColorScheme(
    primary = DarkPrimary,
    onPrimary = OnPrimary,
    secondary = DarkPrimarySecondary,
    background = DarkBg,
    onBackground = DarkText,
    surface = DarkSurface,
    onSurface = DarkText,
    surfaceVariant = DarkBgSecondary,
    onSurfaceVariant = DarkTextSecondary,
    outline = DarkBorder,
    outlineVariant = DarkBorderInput,
    error = DarkNegative,
    primaryContainer = DarkAccentSoft,
    onPrimaryContainer = DarkAccentText,
)

@Composable
fun S2NovaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkScheme else LightScheme
    val extraColors = if (darkTheme) DarkExtraColors else LightExtraColors

    CompositionLocalProvider(LocalNovaExtraColors provides extraColors) {
        MaterialTheme(colorScheme = colorScheme, typography = NovaTypography) {
            CompositionLocalProvider(LocalTextStyle provides NovaDefaultTextStyle, content = content)
        }
    }
}

// Shorthand so screens can write `NovaColors.positive` instead of
// `LocalNovaExtraColors.current.positive`.
object NovaColors {
    val current: NovaExtraColors
        @Composable get() = LocalNovaExtraColors.current
}
