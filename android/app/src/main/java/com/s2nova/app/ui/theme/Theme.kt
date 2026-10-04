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
    // Nova brand layer (web rework, 2026-10; same values as web/src/index.css):
    // a second hero glow (bottom-left), the primary-action gradient, the
    // progress-ring stops, the corner auroras of every card and the canvas
    // behind every screen. White on every ctaBrush stop is ≥ 4.85:1.
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
    heroMidStop = 0.45f,
    heroTo = LightHeroTo,
    heroGlow = listOf(BrandColors.lilac.copy(alpha = 0.35f), BrandColors.lilac.copy(alpha = 0f)),
    heroBorder = Color.White.copy(alpha = 0.18f),
    heroTile = Color.White.copy(alpha = 0.14f),
    heroOverline = Color.White.copy(alpha = 0.88f),
    heroLabel = Color.White.copy(alpha = 0.82f),
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
    bgDeep = Color(0xFFECE6F8),
    grip2 = Color(0xFFB3AACC),
    heroGlow2 = listOf(BrandColors.indigo.copy(alpha = 0.55f), BrandColors.indigo.copy(alpha = 0f)),
    cta = listOf(BrandColors.violet500, BrandColors.indigo),
    ring = listOf(BrandColors.lilac, BrandColors.violet500, BrandColors.indigo),
    cardAurora = BrandColors.lilac.copy(alpha = 0.16f),
    cardAurora2 = BrandColors.violet500.copy(alpha = 0.06f),
    appAurora = listOf(BrandColors.lilac.copy(alpha = 0.22f), BrandColors.violet500.copy(alpha = 0.12f)),
    navActiveLine = BrandColors.violet500.copy(alpha = 0.35f),
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
    heroMidStop = 0.5f,
    heroTo = DarkHeroTo,
    heroGlow = listOf(BrandColors.cyan.copy(alpha = 0.42f), BrandColors.cyan.copy(alpha = 0f)),
    heroBorder = Color.White.copy(alpha = 0.14f),
    heroTile = Color.White.copy(alpha = 0.1f),
    heroOverline = Color.White.copy(alpha = 0.85f),
    heroLabel = Color.White.copy(alpha = 0.78f),
    heroPositive = Color(0xFF5FF0B0),
    heroNegative = Color(0xFFFFB4B4),
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
    pillText = Color(0xFFE9E6FA),
    bgDeep = Color(0xFF0A0919),
    grip2 = Color(0xFF4A4478),
    heroGlow2 = listOf(BrandColors.electric.copy(alpha = 0.38f), BrandColors.electric.copy(alpha = 0f)),
    cta = listOf(BrandColors.electric, BrandColors.blue),
    ring = listOf(BrandColors.electric, BrandColors.blue, BrandColors.cyan),
    cardAurora = BrandColors.electric.copy(alpha = 0.09f),
    cardAurora2 = BrandColors.blue.copy(alpha = 0.05f),
    appAurora = listOf(BrandColors.electric.copy(alpha = 0.13f), BrandColors.blue.copy(alpha = 0.1f)),
    navActiveLine = BrandColors.electric.copy(alpha = 0.45f),
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
