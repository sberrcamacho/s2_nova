package com.s2nova.app.ui.nav

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.foundation.text.TextAutoSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
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

// The mockup's bar outline (viewBox 394×72): flat edges with a concave dip
// under the "+" button. Stretched across the width; vertically it keeps the
// mockup's ~67dp bar scale (`unitY` px per viewBox unit) so the system
// gesture inset below doesn't deepen the dip.
private fun barPath(size: Size, unitY: Float, closed: Boolean, inset: Float = 0f): Path {
    val sx = size.width / 394f
    val sy = unitY
    fun x(v: Float) = v * sx
    fun y(v: Float) = v * sy + inset
    return Path().apply {
        moveTo(0f, y(0f))
        lineTo(x(138f), y(0f))
        cubicTo(x(155f), y(0f), x(159f), y(6f), x(163f), y(14f))
        cubicTo(x(171f), y(32f), x(182f), y(43f), x(197f), y(43f))
        cubicTo(x(212f), y(43f), x(223f), y(32f), x(231f), y(14f))
        cubicTo(x(235f), y(6f), x(239f), y(0f), x(256f), y(0f))
        lineTo(size.width, y(0f))
        if (closed) {
            lineTo(size.width, size.height)
            lineTo(0f, size.height)
            close()
        }
    }
}

// The Android v2 mockup's bottom bar: a surface with a curved dip in the
// middle, the raised "+" (60dp, 29dp above the bar) and four tabs — the
// active one with an --accent2 icon and bold --text label, no pill.
@Composable
fun NovaBottomBar(
    currentRoute: String?,
    onNavigate: (String) -> Unit,
    onFabClick: () -> Unit,
) {
    val t = rememberStrings()
    val surface = MaterialTheme.colorScheme.surface
    val line = MaterialTheme.colorScheme.outline
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .drawBehind {
                val unitY = 67.dp.toPx() / 72f
                drawPath(barPath(size, unitY, closed = true), surface)
                drawPath(barPath(size, unitY, closed = false, inset = 0.5.dp.toPx()), line, style = Stroke(width = 1.dp.toPx()))
            },
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                // Keeps the tabs clear of the system gesture bar / 3-button nav.
                .windowInsetsPadding(WindowInsets.navigationBars)
                .padding(start = 8.dp, top = 12.dp, end = 8.dp, bottom = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TABS.forEachIndexed { index, tab ->
                if (index == 2) Spacer(Modifier.weight(1f))
                BottomTabItem(
                    label = t(tab.labelKey),
                    icon = tab.icon,
                    selected = baseRoute(currentRoute) == tab.route,
                    onClick = { onNavigate(tab.route) },
                    modifier = Modifier.weight(1f),
                )
            }
        }
        val addLabel = t(StringKey.NAV_ADD)
        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .offset(y = (-29).dp)
                .size(60.dp)
                .shadow(elevation = 14.dp, shape = CircleShape, ambientColor = Color(0x806C5CE7), spotColor = Color(0x806C5CE7))
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary)
                .clickable(onClick = onFabClick)
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
    Column(
        modifier = modifier
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onClick)
            .padding(vertical = 2.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        Box(Modifier.size(width = 40.dp, height = 30.dp), contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, tint = if (selected) NovaColors.current.accentText else muted, modifier = Modifier.size(24.dp))
        }
        Text(
            label,
            color = if (selected) MaterialTheme.colorScheme.onSurface else muted,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            maxLines = 1,
            softWrap = false,
            // Shrinks instead of clipping ("Moviment…") on narrow screens or
            // large font scales; 11sp whenever it fits.
            autoSize = TextAutoSize.StepBased(minFontSize = 8.sp, maxFontSize = 11.sp),
        )
    }
}

// A destination's route pattern without its optional query arguments
// (e.g. "budgets?tab={tab}&side={side}" -> "budgets").
fun baseRoute(route: String?): String? = route?.substringBefore('?')

fun bottomBarVisibleFor(route: String?): Boolean = baseRoute(route) in setOf(
    NovaDestinations.HOME,
    NovaDestinations.TRANSACTIONS,
    NovaDestinations.BUDGETS,
    NovaDestinations.REPORTS,
)
