package com.s2nova.app.ui.nav

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import com.s2nova.app.ui.theme.pressScale
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.semantics.Role
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.MockupIcons
import com.s2nova.app.ui.components.strokeIcon
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.tr

private data class BottomTab(val route: String, val labelKey: StringKey, val icon: ImageVector)

// Inicio · Movimientos · [+] · Planes · Reportes (architecture v2); Perfil
// opens from Inicio's avatar instead.
private val TABS = listOf(
    BottomTab(NovaDestinations.HOME, StringKey.NAV_HOME, MockupIcons.Inicio),
    BottomTab(NovaDestinations.TRANSACTIONS, StringKey.NAV_TRANSACTIONS, MockupIcons.Movimientos),
    BottomTab(NovaDestinations.BUDGETS, StringKey.NAV_PLANS, MockupIcons.Planes),
    BottomTab(NovaDestinations.REPORTS, StringKey.NAV_REPORTS, MockupIcons.Reportes),
)

private val PlusIcon = strokeIcon("+", "M12 5v14", "M5 12h14", strokeWidth = 2.6f)

// Bottom bar: a flat `surface` bar with a hairline on top and a smooth
// concave notch in the middle that cradles the round "+" FAB (half above the
// bar) with a generous gap around it. Four tabs (icon + label); the active one
// takes the accent ink on both. On narrow screens (< 340 dp) the FAB and its
// notch shrink and a label that still does not fit is ellipsized, so the bar
// never distorts or overlaps.
private val FabClearance = 10.dp
// Transparent strip above the bar that holds the top half of the FAB.
internal val FabTouchTop = 28.dp

// Top edge of the bar, left to right, with the notch centred on `size.width`.
// The notch circle (radius `r`) is centred on the bar's top edge; shoulders
// ease down into it so the cut-out reads as one continuous curve.
private fun barTopEdge(width: Float, r: Float, shoulder: Float): Path = Path().apply {
    val cx = width / 2f
    val ex = 0.8f * r
    val ey = 0.6f * r
    val k = shoulder * 0.7f
    moveTo(0f, 0f)
    lineTo(cx - r - shoulder, 0f)
    cubicTo(cx - r - shoulder * 0.4f, 0f, cx - ex - 0.6f * k, ey - 0.8f * k, cx - ex, ey)
    arcTo(Rect(cx - r, -r, cx + r, r), 143.13f, -106.26f, false)
    cubicTo(cx + ex + 0.6f * k, ey - 0.8f * k, cx + r + shoulder * 0.4f, 0f, cx + r + shoulder, 0f)
    lineTo(width, 0f)
}

private class NotchedBarShape(private val notchRadius: Dp) : Shape {
    override fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density): Outline {
        val path = barTopEdge(size.width, with(density) { notchRadius.toPx() }, with(density) { 14.dp.toPx() })
        path.lineTo(size.width, size.height)
        path.lineTo(0f, size.height)
        path.close()
        return Outline.Generic(path)
    }
}

@Composable
fun NovaBottomBar(
    currentRoute: String?,
    onNavigate: (String) -> Unit,
    onFabClick: () -> Unit,
) {
    val t = rememberStrings()
    val surface = MaterialTheme.colorScheme.surface
    val line = MaterialTheme.colorScheme.outline
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val compact = maxWidth < 340.dp
        val fabSize = if (compact) 48.dp else 56.dp
        val notchRadius = fabSize / 2 + FabClearance
        val shape = remember(notchRadius) { NotchedBarShape(notchRadius) }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = FabTouchTop)
                .background(surface, shape)
                .drawBehind {
                    drawPath(
                        barTopEdge(size.width, notchRadius.toPx(), 14.dp.toPx()),
                        line,
                        style = Stroke(width = 1.dp.toPx()),
                    )
                },
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    // Keeps the tabs clear of the system gesture bar / 3-button nav.
                    .windowInsetsPadding(WindowInsets.navigationBars)
                    .padding(start = 2.dp, top = 8.dp, end = 2.dp, bottom = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TABS.forEachIndexed { index, tab ->
                    // Only the icons sit beside the FAB; labels sit below it, so the gap can be narrower than the FAB.
                    if (index == 2) Spacer(Modifier.width(notchRadius * 1.2f))
                    BottomTabItem(
                        label = t(tab.labelKey),
                        icon = tab.icon,
                        selected = baseRoute(currentRoute) == tab.route,
                        onClick = { onNavigate(tab.route) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
        val addLabel = t(StringKey.NAV_ADD)
        val fabInteraction = remember { MutableInteractionSource() }
        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                // Centre of the FAB sits on the bar's top edge.
                .padding(top = FabTouchTop - fabSize / 2)
                .size(fabSize)
                .pressScale(fabInteraction, pressedScale = 0.92f)
                .shadow(elevation = 10.dp, shape = CircleShape, ambientColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.55f), spotColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.55f))
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary)
                .clickable(interactionSource = fabInteraction, indication = androidx.compose.material3.ripple(color = Color.White), role = Role.Button, onClick = onFabClick)
                .semantics { contentDescription = addLabel },
            contentAlignment = Alignment.Center,
        ) {
            Icon(PlusIcon, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
        }
    }
}

@Composable
private fun BottomTabItem(
    label: String,
    icon: ImageVector,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    val ink = NovaColors.current.accentText
    val colorSpec = androidx.compose.animation.core.tween<Color>(com.s2nova.app.ui.theme.NovaMotion.FAST)
    val tint by androidx.compose.animation.animateColorAsState(if (selected) ink else muted, colorSpec, label = "tabTint")
    val labelColor by androidx.compose.animation.animateColorAsState(if (selected) MaterialTheme.colorScheme.onSurface else muted, colorSpec, label = "tabLabel")
    val interaction = remember { MutableInteractionSource() }
    Column(
        modifier = modifier
            .heightIn(min = 48.dp)
            .selectable(selected = selected, role = Role.Tab, interactionSource = interaction, indication = null, onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.padding(top = 4.dp).size(26.dp).pressScale(interaction, pressedScale = 0.9f))
        // Labels keep one size on every tab: the bar caps the system font
        // scale at 1.0 (icon + 12 sp label is a fixed-height control).
        val density = androidx.compose.ui.platform.LocalDensity.current
        androidx.compose.runtime.CompositionLocalProvider(
            androidx.compose.ui.platform.LocalDensity provides androidx.compose.ui.unit.Density(density.density, fontScale = minOf(density.fontScale, 1f)),
        ) {
            Text(
                label,
                color = labelColor,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                fontSize = 12.sp,
                maxLines = 1,
                softWrap = false,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

// A destination's route pattern without its optional query arguments
// (e.g. "budgets?tab={tab}&side={side}" -> "budgets").
fun baseRoute(route: String?): String? = route?.substringBefore('?')

// A tab's position in the bar (-1 for any other route); route changes
// between tabs slide in the bar's direction.
fun bottomTabIndex(route: String?): Int = TABS.indexOfFirst { it.route == baseRoute(route) }

fun bottomBarVisibleFor(route: String?): Boolean = baseRoute(route) in setOf(
    NovaDestinations.HOME,
    NovaDestinations.TRANSACTIONS,
    NovaDestinations.BUDGETS,
    NovaDestinations.REPORTS,
)
