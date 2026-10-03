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
    heroMidStop = 0.5f,
    heroTo = LightHeroTo,
    heroGlow = listOf(BrandColors.lilac.copy(alpha = 0.3f), BrandColors.lilac.copy(alpha = 0f)),
    heroBorder = Color.White.copy(alpha = 0.16f),
    heroTile = Color.White.copy(alpha = 0.12f),
    heroOverline = Color.White.copy(alpha = 0.9f),
    heroLabel = Color.White,
    heroPositive = Color.White,
    heroNegative = Color.White,
    link = LightAccentText,
    accent = LightAccent,
    focus = LightAccent,
    primaryPressed = PrimaryPressed,
    primaryBorder = LightPrimaryBorder,
    borderInput = LightBorderInput,
    negativeBorder = LightNegativeBorder,
    navyPanel = NavyPanel,
    scanSurface = Color(0xFF0B0B12),
    sheetSurface = LightBgSecondary,
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
    pillSurface = LightBgSecondary,
    pillText = Color(0xFF23232C),
    bgDeep = Color(0xFFECECF3),
    grip2 = Color(0xFFB0B0BE),
)

private val DarkExtraColors = NovaExtraColors(
    positive = DarkPositive,
    positiveSoft = DarkPositive.copy(alpha = 0.14f),
    negative = DarkNegative,
    negativeSoft = DarkNegative.copy(alpha = 0.14f),
    warning = DarkWarning,
    warningSoft = DarkWarning.copy(alpha = 0.14f),
    heroFrom = DarkHeroBase,
    heroMid = DarkHeroBase,
    heroMidStop = 0.5f,
    heroTo = DarkHeroBase,
    heroGlow = listOf(
        BrandColors.electric.copy(alpha = 0.35f),
        BrandColors.blue.copy(alpha = 0.22f),
        BrandColors.cyan.copy(alpha = 0f),
    ),
    heroBorder = Color.White.copy(alpha = 0.1f),
    heroTile = Color.White.copy(alpha = 0.06f),
    heroOverline = BrandColors.lilac,
    heroLabel = Color.White.copy(alpha = 0.8f),
    heroPositive = Color(0xFF32C98A),
    heroNegative = Color(0xFFFF7A7A),
    link = DarkAccentText,
    accent = DarkAccent,
    focus = DarkAccent,
    primaryPressed = PrimaryPressed,
    primaryBorder = DarkPrimaryBorder,
    borderInput = DarkBorderInput,
    negativeBorder = DarkNegativeBorder,
    navyPanel = NavyPanel,
    scanSurface = ScanSurface,
    sheetSurface = DarkSurfaceElevated,
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
    pillSurface = DarkSurfaceElevated,
    pillText = Color(0xFFE6E6EE),
    bgDeep = Color(0xFF09090E),
    grip2 = Color(0xFF43434F),
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
