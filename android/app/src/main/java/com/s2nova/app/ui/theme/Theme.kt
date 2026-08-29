package com.s2nova.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp

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
    val heroFrom: Color,
    val heroMid: Color,
    val heroTo: Color,
    val heroBorder: Color,
    val negativeBorder: Color,
    val navyPanel: Color,
    val scanSurface: Color,
    val loginSurface: Color,
    val loginBorderFocus: Color,
    val loginTextMuted: Color,
    val loginLabel: Color,
    val loginPrimary: Color,
    val loginPositive: Color,
    val loginPositiveBg: Color,
    val loginHighlight: Color,
)

private val LightExtraColors = NovaExtraColors(
    positive = LightPositive,
    positiveSoft = LightPositive.copy(alpha = 0.12f),
    negative = LightNegative,
    negativeSoft = LightNegative.copy(alpha = 0.12f),
    warning = LightWarning,
    warningSoft = LightWarning.copy(alpha = 0.12f),
    heroFrom = HeroFrom,
    heroMid = lerp(HeroFrom, HeroTo, 0.6f),
    heroTo = HeroTo,
    heroBorder = HeroBorder,
    negativeBorder = LightNegativeBorder,
    navyPanel = NavyPanel,
    scanSurface = Color(0xFF0B0B12),
    loginSurface = LoginSurfaceLight,
    loginBorderFocus = LoginBorderFocusLight,
    loginTextMuted = LightTextTertiary,
    loginLabel = LightTextSecondary,
    loginPrimary = LoginPrimaryFlat,
    loginPositive = LoginPositiveLight,
    loginPositiveBg = LoginPositiveBgLight,
    loginHighlight = LoginHighlightLight,
)

private val DarkExtraColors = NovaExtraColors(
    positive = DarkPositive,
    positiveSoft = DarkPositive.copy(alpha = 0.14f),
    negative = DarkNegative,
    negativeSoft = DarkNegative.copy(alpha = 0.14f),
    warning = DarkWarning,
    warningSoft = DarkWarning.copy(alpha = 0.14f),
    heroFrom = DarkBg,
    heroMid = DarkHeroMid,
    heroTo = Color(0xFF211A4D),
    heroBorder = HeroBorder,
    negativeBorder = DarkNegativeBorder,
    navyPanel = NavyPanel,
    scanSurface = ScanSurface,
    loginSurface = LoginSurfaceDark,
    loginBorderFocus = HeroTo,
    loginTextMuted = LoginTextMutedDark,
    loginLabel = LoginLabelDark,
    loginPrimary = LoginPrimaryFlat,
    loginPositive = LoginPositiveDark,
    loginPositiveBg = LoginPositiveBgDark,
    loginHighlight = LoginHighlightDark,
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
    outlineVariant = LightBorderStrong,
    error = LightNegative,
    primaryContainer = LightAccentSoft,
    onPrimaryContainer = LightPrimary,
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
    outlineVariant = DarkBorderStrong,
    error = DarkNegative,
    primaryContainer = DarkAccentSoft,
    onPrimaryContainer = DarkPrimarySecondary,
)

@Composable
fun S2NovaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkScheme else LightScheme
    val extraColors = if (darkTheme) DarkExtraColors else LightExtraColors

    CompositionLocalProvider(LocalNovaExtraColors provides extraColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = NovaTypography,
            content = content,
        )
    }
}

// Shorthand so screens can write `NovaColors.positive` instead of
// `LocalNovaExtraColors.current.positive`.
object NovaColors {
    val current: NovaExtraColors
        @Composable get() = LocalNovaExtraColors.current
}
