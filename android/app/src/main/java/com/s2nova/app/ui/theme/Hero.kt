package com.s2nova.app.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.dp
import kotlin.math.max

// The balance hero's surface (DESIGN-SYSTEM.md §2.2 "Hero card"), shared by
// Inicio's hero and Nuevo movimiento's amount card, the same way Web uses
// --hero-bg for both: the theme's diagonal gradient, a radial glow toward
// the top-right corner and a hairline border.
@Composable
fun Modifier.heroSurface(shape: Shape): Modifier {
    val colors = NovaColors.current
    return this
        .clip(shape)
        .background(
            Brush.linearGradient(
                0f to colors.heroFrom,
                colors.heroMidStop to colors.heroMid,
                1f to colors.heroTo,
            ),
        )
        // Drawn behind the content so it never takes part in the layout.
        .drawBehind {
            val center = Offset(size.width, 0f)
            val radius = max(size.width, size.height) * 0.75f
            drawCircle(brush = Brush.radialGradient(colors.heroGlow, center = center, radius = radius), radius = radius, center = center)
            // The second aurora, bottom-left (web --hero-bg's second layer).
            val bl = Offset(0f, size.height)
            val r2 = max(size.width, size.height) * 0.9f
            drawCircle(brush = Brush.radialGradient(colors.heroGlow2, center = bl, radius = r2), radius = r2, center = bl)
        }
        .border(1.dp, colors.heroBorder, shape)
}
