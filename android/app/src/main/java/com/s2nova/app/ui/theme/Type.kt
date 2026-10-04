package com.s2nova.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.s2nova.app.R

// Inter — the same family the web client loads as --font-sans, bundled
// locally (res/font/inter_variable.ttf, the variable font from Google
// Fonts, OFL) so both apps render the same typeface with no network
// dependency. Inter has tabular figures, so amounts use `tnum`.
@OptIn(ExperimentalTextApi::class)
private fun inter(weight: Int) = Font(
    R.font.inter_variable,
    FontWeight(weight),
    variationSettings = FontVariation.Settings(FontVariation.weight(weight)),
)

val NovaFontFamily = FontFamily(
    inter(300),
    inter(400),
    inter(500),
    inter(600),
    inter(700),
    inter(800),
)

// Type roles (DESIGN-SYSTEM.md §3), the same sizes as Web's `text-*` role
// utilities in index.css. Every role has an explicit line height so wrapped
// text never overlaps its neighbours, and 12 sp is the floor. The numeric
// roles carry tabular figures.
private fun role(size: Int, weight: FontWeight, lineHeight: Float, tracking: Float = 0f, tnum: Boolean = false) = TextStyle(
    fontFamily = NovaFontFamily,
    fontWeight = weight,
    fontSize = size.sp,
    lineHeight = lineHeight.em,
    letterSpacing = (size * tracking).sp,
    fontFeatureSettings = if (tnum) "tnum" else null,
    // Keeps the descenders ("p", "g") inside the line
    // box: the default trim clipped them under `maxLines` + ellipsis.
    lineHeightStyle = androidx.compose.ui.text.style.LineHeightStyle(
        alignment = androidx.compose.ui.text.style.LineHeightStyle.Alignment.Center,
        trim = androidx.compose.ui.text.style.LineHeightStyle.Trim.None,
    ),
)

// Inter's large x-height reads well at the DESIGN-SYSTEM.md §3 sizes: the
// floor is 12 sp and secondary text 14 sp. Large roles take slight negative
// tracking; body text keeps the default.
object NovaType {
    val display = role(36, FontWeight.SemiBold, 1.1f, -0.025f, tnum = true)
    val displaySm = role(28, FontWeight.SemiBold, 1.15f, -0.02f, tnum = true)
    val headline = role(24, FontWeight.SemiBold, 1.2f, -0.015f)
    val title = role(18, FontWeight.SemiBold, 1.3f, -0.005f)
    val titleSm = role(16, FontWeight.SemiBold, 1.35f)
    val amount = role(16, FontWeight.SemiBold, 1.3f, tnum = true)
    val body = role(16, FontWeight.Normal, 1.5f)
    val bodySm = role(14, FontWeight.Normal, 1.45f)
    val label = role(14, FontWeight.SemiBold, 1.3f)
    val overline = role(12, FontWeight.SemiBold, 1.3f, 0.05f)
    val caption = role(12, FontWeight.Normal, 1.45f)
}

// The style a bare Text() inherits. Screens still size much of their text
// ad hoc (moving it onto the roles is part of each screen's redesign), so
// the default carries only the family: an inherited role line height would
// stretch every ad-hoc size with it.
val NovaDefaultTextStyle = TextStyle(fontFamily = NovaFontFamily)

val NovaTypography = Typography(
    displayLarge = NovaType.display,
    displaySmall = NovaType.displaySm,
    headlineLarge = NovaType.headline,
    headlineMedium = role(24, FontWeight.SemiBold, 1.25f, -0.015f),
    headlineSmall = NovaType.title,
    titleLarge = NovaType.title,
    titleMedium = NovaType.titleSm,
    titleSmall = NovaType.label,
    bodyLarge = NovaType.body,
    bodyMedium = NovaType.bodySm,
    bodySmall = NovaType.caption,
    labelLarge = NovaType.label,
    labelMedium = role(12, FontWeight.SemiBold, 1.3f),
    labelSmall = NovaType.overline,
)
