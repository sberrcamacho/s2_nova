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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.geometry.Offset
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

// Bottom bar (DESIGN-SYSTEM.md §5.1): a flat `surface` bar with a hairline on
// top, four tabs (icon + label; the active one gets a `primary-soft` pill
// behind the icon and `primary` ink) and the raised "+" — a rounded square in
// `primary` with the FAB glow.
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
            .background(surface)
            .drawBehind { drawLine(line, Offset(0f, 0.5.dp.toPx()), Offset(size.width, 0.5.dp.toPx()), strokeWidth = 1.dp.toPx()) },
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                // Keeps the tabs clear of the system gesture bar / 3-button nav.
                .windowInsetsPadding(WindowInsets.navigationBars)
                .padding(start = 4.dp, top = 10.dp, end = 4.dp, bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TABS.forEachIndexed { index, tab ->
                if (index == 2) Spacer(Modifier.weight(0.45f))
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
        val fabShape = RoundedCornerShape(16.dp)
        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .offset(y = (-20).dp)
                .size(52.dp)
                .shadow(elevation = 16.dp, shape = fabShape, ambientColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.55f), spotColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.55f))
                .clip(fabShape)
                .background(MaterialTheme.colorScheme.primary)
                .clickable(role = Role.Button, onClick = onFabClick)
                .semantics { contentDescription = addLabel },
            contentAlignment = Alignment.Center,
        ) {
            Icon(PlusIcon, contentDescription = null, tint = Color.White, modifier = Modifier.size(22.dp))
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
    Column(
        modifier = modifier
            .heightIn(min = 48.dp)
            .selectable(selected = selected, role = Role.Tab, interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Box(
            Modifier
                .size(width = 56.dp, height = 32.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(if (selected) MaterialTheme.colorScheme.primaryContainer else Color.Transparent),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = if (selected) ink else muted, modifier = Modifier.size(24.dp))
        }
        // Labels keep one size on every tab: the bar caps the system font
        // scale at 1.0 (icon + 12 sp label is a fixed-height control) instead
        // of shrinking only the longest label.
        val density = androidx.compose.ui.platform.LocalDensity.current
        androidx.compose.runtime.CompositionLocalProvider(
            androidx.compose.ui.platform.LocalDensity provides androidx.compose.ui.unit.Density(density.density, fontScale = minOf(density.fontScale, 1f)),
        ) {
            Text(
                label,
                color = if (selected) ink else muted,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                fontSize = 12.sp,
                maxLines = 1,
                softWrap = false,
            )
        }
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
