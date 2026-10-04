package com.s2nova.app.ui.theme

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.composed
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import kotlin.math.max

// The Nova brand layer (web rework, 2026-10), the Compose side of web's
// .nova-card, .nova-canvas and .btn-cta so both clients read as one product.

// The primary-action gradient (web --cta-bg), left to right.
@Composable
fun ctaBrush(): Brush = Brush.horizontalGradient(NovaColors.current.cta)

// The brand gradient used by rings and active markers (the logo's stops).
@Composable
fun ringBrushColors(): List<Color> = NovaColors.current.ring

// A card's corner auroras: brand glow top-right, a softer one bottom-left,
// drawn behind the content (web .nova-card).
@Composable
fun Modifier.cardAurora(): Modifier {
    val c = NovaColors.current
    return drawBehind {
        val r1 = max(size.width, size.height) * 0.9f
        val tr = Offset(size.width, 0f)
        drawCircle(Brush.radialGradient(listOf(c.cardAurora, Color.Transparent), center = tr, radius = r1), radius = r1, center = tr)
        val r2 = max(size.width, size.height) * 0.7f
        val bl = Offset(0f, size.height)
        drawCircle(Brush.radialGradient(listOf(c.cardAurora2, Color.Transparent), center = bl, radius = r2), radius = r2, center = bl)
    }
}

// The canvas behind every screen: the theme background with two brand
// auroras at the top (web .nova-canvas).
@Composable
fun Modifier.appCanvas(background: Color): Modifier {
    val glows = NovaColors.current.appAurora
    return background(background).drawBehind {
        val w = size.width
        val c1 = Offset(w * 0.1f, -w * 0.15f)
        val r1 = w * 1.0f
        drawCircle(Brush.radialGradient(listOf(glows[0], Color.Transparent), center = c1, radius = r1), radius = r1, center = c1)
        val c2 = Offset(w, w * 0.1f)
        val r2 = w * 0.8f
        drawCircle(Brush.radialGradient(listOf(glows[1], Color.Transparent), center = c2, radius = r2), radius = r2, center = c2)
    }
}

// ── Nova motion (web's .nova-card rise, .nova-fill/.nova-grow) ─────────────
// Quick and noticeable, never looping. Under "Quitar animaciones" everything
// is already at its final state.

// A card rising into place when a screen opens: 380 ms, 45 ms per index
// (capped like web's nth-child stagger). `enabled = false` (the screen's
// intro already played) leaves it static, so scrolling back never replays.
fun Modifier.novaRise(index: Int, enabled: Boolean = true): Modifier = composed {
    val reduced = rememberReducedMotion()
    if (!enabled || reduced) return@composed this
    val progress = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        progress.animateTo(1f, tween(380, delayMillis = 45 * index.coerceAtMost(6), easing = NovaMotion.EmphasizedDecelerate))
    }
    graphicsLayer {
        val p = progress.value
        alpha = p
        translationY = (1f - p) * 14.dp.toPx()
        scaleX = 0.985f + 0.015f * p
        scaleY = 0.985f + 0.015f * p
    }
}

// 0 → 1 once, for bars that fill or grow on first show (700 ms after a
// 150 ms beat, as web's .nova-fill). Reduced motion starts at 1.
@Composable
fun rememberIntroProgress(delayMillis: Int = 150, durationMillis: Int = 700): Float {
    val reduced = rememberReducedMotion()
    val progress = remember { Animatable(if (reduced) 1f else 0f) }
    LaunchedEffect(reduced) {
        if (reduced) progress.snapTo(1f)
        else progress.animateTo(1f, tween(durationMillis, delayMillis = delayMillis, easing = NovaMotion.EmphasizedDecelerate))
    }
    return progress.value
}
