package com.s2nova.app.ui.theme

import android.database.ContentObserver
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.interaction.InteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext

// Motion tokens (DESIGN-SYSTEM.md §4.4). Short and decelerating: motion
// explains what changed, it never makes anyone wait. Transform and opacity
// only, and every animation is interruptible.
object NovaMotion {
    const val FAST = 150 // press, toggle, chip select
    const val BASE = 250 // sheets, dialogs, route change
    const val EXIT = 160 // dismissals, ≈ 65 % of BASE
    const val VALUE = 450 // a figure or a bar moving to its new value

    val Standard = CubicBezierEasing(0.2f, 0f, 0f, 1f)
    val StandardDecelerate = CubicBezierEasing(0f, 0f, 0f, 1f)
    val EmphasizedDecelerate = CubicBezierEasing(0.05f, 0.7f, 0.1f, 1f)
    val EmphasizedAccelerate = CubicBezierEasing(0.3f, 0f, 0.8f, 0.15f)
}

// "Quitar animaciones" (Android's animator scale at 0). Compose already
// skips durations then; screens use this to cross-fade instead of slide.
// Battery saver (HyperOS/MIUI included) flips the scale while the app is
// open, so the value is observed rather than read once.
@Composable
fun rememberReducedMotion(): Boolean {
    val resolver = LocalContext.current.contentResolver
    fun read() = Settings.Global.getFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    var reduced by remember(resolver) { mutableStateOf(read()) }
    DisposableEffect(resolver) {
        val observer = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean) { reduced = read() }
        }
        resolver.registerContentObserver(Settings.Global.getUriFor(Settings.Global.ANIMATOR_DURATION_SCALE), false, observer)
        reduced = read()
        onDispose { resolver.unregisterContentObserver(observer) }
    }
    return reduced
}

// Press feedback for cards and buttons: a slight scale while held. It is
// drawn in a graphics layer, so neighbours never move.
fun Modifier.pressScale(interactionSource: InteractionSource, pressedScale: Float = 0.97f): Modifier = composed {
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) pressedScale else 1f,
        animationSpec = tween(NovaMotion.FAST, easing = NovaMotion.StandardDecelerate),
        label = "pressScale",
    )
    graphicsLayer { scaleX = scale; scaleY = scale }
}

// A list row that fades in when added, fades out when removed and glides
// to its new place when others come or go (a movement saved, an occurrence
// confirmed). No entrance cascade on first load.
fun androidx.compose.foundation.lazy.LazyItemScope.novaItem(): Modifier = Modifier.animateItem(
    fadeInSpec = tween(NovaMotion.BASE, easing = NovaMotion.StandardDecelerate),
    placementSpec = tween(NovaMotion.BASE, easing = NovaMotion.EmphasizedDecelerate),
    fadeOutSpec = tween(NovaMotion.EXIT, easing = NovaMotion.EmphasizedAccelerate),
)
