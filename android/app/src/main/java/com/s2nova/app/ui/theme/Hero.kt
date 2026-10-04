package com.s2nova.app.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.dp

// The balance hero's surface (DESIGN-SYSTEM.md §2.2 "Hero card"): the
// theme's diagonal brand gradient, a 1 px top highlight and a hairline
// border. The hero is the one place the brand gradient appears.
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
        .drawBehind {
            drawRect(Color.White.copy(alpha = 0.14f), size = androidx.compose.ui.geometry.Size(size.width, 1.dp.toPx()))
        }
        .border(1.dp, colors.heroBorder, shape)
}

// The amount field of forms (Nuevo movimiento, the plan sheets): a neutral
// surface with the input boundary, 2 dp primary while its pad is open. The
// figure itself carries the emphasis, so it needs no brand gradient.
@Composable
fun Modifier.amountSurface(shape: Shape, active: Boolean = false): Modifier {
    val colors = NovaColors.current
    return this
        .clip(shape)
        .background(androidx.compose.material3.MaterialTheme.colorScheme.surface)
        .border(if (active) 2.dp else 1.dp, if (active) colors.primaryBorder else colors.borderInput, shape)
}
