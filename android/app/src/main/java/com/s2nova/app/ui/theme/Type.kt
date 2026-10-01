package com.s2nova.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.s2nova.app.R

// Plus Jakarta Sans — same family the web dashboard loads as --font-sans,
// bundled locally (res/font) instead of fetched, so both apps render with
// the exact same typeface with no runtime/network dependency.
val NovaFontFamily = FontFamily(
    Font(R.font.plus_jakarta_sans_regular, FontWeight.Normal),
    Font(R.font.plus_jakarta_sans_medium, FontWeight.Medium),
    Font(R.font.plus_jakarta_sans_semibold, FontWeight.SemiBold),
    Font(R.font.plus_jakarta_sans_bold, FontWeight.Bold),
    Font(R.font.plus_jakarta_sans_extrabold, FontWeight.ExtraBold),
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
    // Keeps the descenders of Plus Jakarta Sans ("p", "g") inside the line
    // box: the default trim clipped them under `maxLines` + ellipsis.
    lineHeightStyle = androidx.compose.ui.text.style.LineHeightStyle(
        alignment = androidx.compose.ui.text.style.LineHeightStyle.Alignment.Center,
        trim = androidx.compose.ui.text.style.LineHeightStyle.Trim.None,
    ),
)

object NovaType {
    val display = role(36, FontWeight.Bold, 1.1f, -0.01f, tnum = true)
    val displaySm = role(28, FontWeight.Bold, 1.15f, -0.01f, tnum = true)
    val headline = role(24, FontWeight.Bold, 1.2f, -0.005f)
    val title = role(18, FontWeight.SemiBold, 1.3f)
    val titleSm = role(16, FontWeight.SemiBold, 1.35f)
    val amount = role(16, FontWeight.SemiBold, 1.3f, tnum = true)
    val body = role(16, FontWeight.Normal, 1.5f)
    val bodySm = role(14, FontWeight.Medium, 1.45f)
    val label = role(14, FontWeight.SemiBold, 1.3f)
    val overline = role(12, FontWeight.SemiBold, 1.3f, 0.04f)
    val caption = role(12, FontWeight.Medium, 1.45f)
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
    headlineMedium = role(24, FontWeight.Bold, 1.25f),
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
