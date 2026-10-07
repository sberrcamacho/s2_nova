package com.s2nova.app.ui.tour

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp

// Where each tour target is on screen, kept current by `tourTarget`, and
// how to scroll it into view.
class TourRegistry {
    internal val bounds = mutableStateMapOf<String, Rect>()
    internal val sizes = mutableMapOf<String, IntSize>()
    internal val corners = mutableMapOf<String, Dp>()
    internal val requesters = mutableMapOf<String, BringIntoViewRequester>()

    fun isPresent(id: String): Boolean = id in requesters
}

val LocalTourRegistry = staticCompositionLocalOf<TourRegistry?> { null }

// Marks an element a tour can highlight. `corner` is its own corner radius,
// so the cut-out around it follows its shape.
@OptIn(ExperimentalFoundationApi::class)
fun Modifier.tourTarget(id: String, corner: Dp = 16.dp): Modifier = composed {
    val registry = LocalTourRegistry.current ?: return@composed Modifier
    val requester = remember { BringIntoViewRequester() }
    DisposableEffect(registry, id) {
        registry.requesters[id] = requester
        registry.corners[id] = corner
        onDispose {
            if (registry.requesters[id] === requester) {
                registry.requesters.remove(id)
                registry.bounds.remove(id)
                registry.sizes.remove(id)
            }
        }
    }
    Modifier
        .bringIntoViewRequester(requester)
        .onGloballyPositioned {
            registry.bounds[id] = it.boundsInRoot()
            registry.sizes[id] = it.size
        }
}
