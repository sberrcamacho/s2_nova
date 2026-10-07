package com.s2nova.app.ui.tour

import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.VectorConverter
import androidx.compose.animation.core.tween
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.foundation.focusable
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.traversalIndex
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.OpenSheets
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.NovaMotion
import com.s2nova.app.ui.theme.NovaType
import com.s2nova.app.ui.tr
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private data class TourRun(val key: String, val steps: List<TourStep>, val index: Int)

// Time for a screen's entrance to settle before a tour measures it.
private const val SETTLE_MS = 600L

// The dialogs' scrim (rgba(6,6,12,.62)).
private val Scrim = Color(0x9E06060C)

/**
 * Runs the current screen's tour once: a scrim with a cut-out around the
 * step's element, a 2 dp ring, and a card with Omitir · Anterior ·
 * Siguiente. Taps on the screen behind do nothing while it runs; system
 * back skips it. Finishing or skipping marks it seen (server-side).
 */
@Composable
fun BoxScope.TourHost(route: String?, registry: TourRegistry) {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val confirm by com.s2nova.app.ui.Confirm.current.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val prefs = user?.preferences ?: return
    val sheets by OpenSheets.count.collectAsStateWithLifecycle()
    var run by remember { mutableStateOf<TourRun?>(null) }
    val key = Tours.forRoute(route)

    // Starts once the screen has settled with no sheet or confirmation up
    // (Nuevo movimiento opens on its category sheet).
    LaunchedEffect(key, prefs.guidesSeen, confirm == null, sheets == 0, run == null) {
        if (run != null || key == null || key in prefs.guidesSeen || confirm != null || sheets > 0) return@LaunchedEffect
        delay(SETTLE_MS)
        if (OpenSheets.count.value > 0) return@LaunchedEffect
        val steps = Tours.runnable(key, registry::isPresent)
        if (steps.isNotEmpty()) run = TourRun(key, steps, 0)
    }
    // Leaving the screen another way (a notification) drops the tour
    // without marking it.
    if (run != null && run?.key != key) run = null

    val r = run ?: return
    val complete = {
        run = null
        scope.launch { AppContainer.authRepository.updateGuides(prefs.guidesSeen + r.key, prefs.guidesOff) }
        Unit
    }
    val step = r.steps[r.index]
    BackHandler(onBack = complete)
    val density = LocalDensity.current
    // Scrolls the element into view with room below it for the bottom bar
    // (it floats over the content) and the card, which grows with the
    // font scale.
    LaunchedEffect(r.key, r.index) {
        val id = step.target ?: return@LaunchedEffect
        val size = registry.sizes[id]
        val above = with(density) { 16.dp.toPx() }
        val below = with(density) { (120.dp + 200.dp * density.fontScale.coerceAtMost(2f)).toPx() }
        @OptIn(ExperimentalFoundationApi::class)
        registry.requesters[id]?.bringIntoView(size?.let { Rect(0f, -above, it.width.toFloat(), it.height + below) })
    }

    var origin by remember { mutableStateOf(Offset.Zero) }
    val pad = with(density) { 6.dp.toPx() }
    val hole = step.target
        ?.let { registry.bounds[it] }
        ?.takeIf { it.width > 0f && it.height > 0f }
        ?.translate(-origin)
        ?.let { Rect(it.left - pad, it.top - pad, it.right + pad, it.bottom + pad) }
    val corner = with(density) { ((step.target?.let { registry.corners[it] } ?: 16.dp) + 4.dp).toPx() }
    // The cut-out glides to the next step's element and follows it while it
    // scrolls into view; with animations off it jumps.
    val shown = remember { Animatable(Rect.Zero, Rect.VectorConverter) }
    var shownIndex by remember { mutableIntStateOf(-1) }
    LaunchedEffect(hole, r.index) {
        if (hole == null) return@LaunchedEffect
        if (shownIndex == -1 || shownIndex == r.index) shown.snapTo(hole)
        else shown.animateTo(hole, tween(NovaMotion.BASE, easing = NovaMotion.Standard))
        shownIndex = r.index
    }
    val ring = NovaColors.current.accentText

    Box(
        Modifier
            .fillMaxSize()
            .onGloballyPositioned { origin = it.positionInRoot() }
            // Swallows every touch on the screen behind; it never dismisses.
            .pointerInput(Unit) { awaitPointerEventScope { while (true) awaitPointerEvent().changes.forEach { it.consume() } } },
    ) {
        Canvas(Modifier.fillMaxSize().graphicsLayer(compositingStrategy = CompositingStrategy.Offscreen)) {
            drawRect(Scrim)
            if (hole != null) {
                val h = shown.value
                drawRoundRect(Color.Black, h.topLeft, h.size, CornerRadius(corner), blendMode = BlendMode.Clear)
                drawRoundRect(ring, h.topLeft, h.size, CornerRadius(corner), style = Stroke(2.dp.toPx()))
            }
        }
        TourPlacement(hole) {
            TourCard(
                step = step,
                index = r.index,
                count = r.steps.size,
                onSkip = complete,
                onPrev = { run = r.copy(index = r.index - 1) },
                onNext = { if (r.index == r.steps.lastIndex) complete() else run = r.copy(index = r.index + 1) },
            )
        }
    }
}

// Puts the card under the highlighted element, or above it when there's no
// room, clamped to the 16 dp gutters and the system bars; centred when the
// step has no element.
@Composable
private fun TourPlacement(hole: Rect?, content: @Composable () -> Unit) {
    val insets = WindowInsets.safeDrawing
    Layout(content = content, modifier = Modifier.fillMaxSize()) { measurables, constraints ->
        val margin = 16.dp.roundToPx()
        val gap = 14.dp.roundToPx()
        val width = minOf(constraints.maxWidth - margin * 2, 360.dp.roundToPx())
        val card = measurables.first().measure(Constraints(minWidth = width, maxWidth = width, maxHeight = constraints.maxHeight))
        val top = insets.getTop(this) + margin
        val bottom = constraints.maxHeight - insets.getBottom(this) - margin
        val clampX = { x: Int -> x.coerceIn(margin, constraints.maxWidth - margin - card.width) }
        val clampY = { y: Int -> y.coerceIn(top, maxOf(top, bottom - card.height)) }
        val (x, y) = if (hole == null) {
            clampX((constraints.maxWidth - card.width) / 2) to clampY((constraints.maxHeight - card.height) / 2)
        } else {
            val cx = clampX(hole.center.x.toInt() - card.width / 2)
            val below = hole.bottom.toInt() + gap
            val above = hole.top.toInt() - gap - card.height
            when {
                below + card.height <= bottom -> cx to below
                above >= top -> cx to above
                else -> cx to bottom - card.height
            }
        }
        layout(constraints.maxWidth, constraints.maxHeight) { card.place(x, y) }
    }
}

@Composable
private fun TourCard(step: TourStep, index: Int, count: Int, onSkip: () -> Unit, onPrev: () -> Unit, onNext: () -> Unit) {
    val colors = NovaColors.current
    val shape = RoundedCornerShape(20.dp)
    val title = tr(step.title)
    val focus = remember { FocusRequester() }
    // Each step moves accessibility focus to its title, which is also
    // announced as it changes.
    LaunchedEffect(index) { runCatching { focus.requestFocus() } }
    Column(
        Modifier
            .shadow(16.dp, shape)
            .clip(shape)
            .background(colors.sheetSurface)
            .border(1.dp, MaterialTheme.colorScheme.outline, shape)
            .semantics { paneTitle = title; isTraversalGroup = true; traversalIndex = -1f }
            .padding(start = 16.dp, end = 12.dp, top = 14.dp, bottom = 8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(tr(StringKey.TOUR_STEP_OF, index + 1, count), style = NovaType.caption, color = colors.textDim, modifier = Modifier.weight(1f), maxLines = 1)
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(end = 4.dp)) {
                repeat(count) { i ->
                    Box(Modifier.size(6.dp).background(if (i == index) colors.accentText else MaterialTheme.colorScheme.outline, CircleShape))
                }
            }
        }
        Text(
            title,
            style = NovaType.titleSm,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier
                .padding(top = 8.dp, end = 4.dp)
                .focusRequester(focus)
                .focusable()
                .semantics { heading(); liveRegion = LiveRegionMode.Polite },
        )
        Text(tr(step.body), style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp, end = 4.dp))
        // One line of actions; with very large text Omitir moves above the
        // other two instead of a label wrapping.
        val big = LocalDensity.current.fontScale > 1.3f
        val actions: @Composable () -> Unit = {
            if (index > 0) TourButton(tr(StringKey.TOUR_PREV), primary = false, onClick = onPrev)
            TourButton(tr(if (index == count - 1) StringKey.TOUR_DONE else StringKey.TOUR_NEXT), primary = true, onClick = onNext)
        }
        if (big) {
            Column(Modifier.padding(top = 8.dp)) {
                TourButton(tr(StringKey.TOUR_SKIP), primary = null, onClick = onSkip)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End), modifier = Modifier.padding(top = 4.dp).fillMaxWidth()) { actions() }
            }
        } else {
            Row(Modifier.padding(top = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TourButton(tr(StringKey.TOUR_SKIP), primary = null, onClick = onSkip)
                Spacer(Modifier.weight(1f))
                actions()
            }
        }
    }
}

// primary: the filled button; false: outlined; null: a text button.
@Composable
private fun TourButton(label: String, primary: Boolean?, onClick: () -> Unit) {
    val colors = NovaColors.current
    val shape = RoundedCornerShape(12.dp)
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .heightIn(min = 48.dp)
            .clip(shape)
            .clickable(role = Role.Button, onClick = onClick),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .heightIn(min = 40.dp)
                .then(
                    when (primary) {
                        true -> Modifier.background(MaterialTheme.colorScheme.primary, shape)
                        false -> Modifier.border(1.dp, colors.borderInput, shape)
                        null -> Modifier
                    },
                )
                .padding(horizontal = if (primary == null) 8.dp else 16.dp),
        ) {
            Text(
                label,
                style = NovaType.label,
                color = when (primary) {
                    true -> Color.White
                    false -> MaterialTheme.colorScheme.onSurface
                    null -> MaterialTheme.colorScheme.onSurfaceVariant
                },
                maxLines = 1,
                softWrap = false,
            )
        }
    }
}
