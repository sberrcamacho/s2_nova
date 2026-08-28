package com.s2nova.app.ui.nav

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberStrings

private data class BottomTab(val route: String, val labelKey: StringKey, val icon: ImageVector)

private val TABS = listOf(
    BottomTab(NovaDestinations.HOME, StringKey.NAV_HOME, Icons.Filled.Home),
    BottomTab(NovaDestinations.REPORTS, StringKey.NAV_REPORTS, Icons.Filled.BarChart),
    BottomTab(NovaDestinations.BUDGETS, StringKey.NAV_BUDGETS, Icons.Filled.Wallet),
    BottomTab(NovaDestinations.PROFILE, StringKey.NAV_PROFILE, Icons.Filled.Person),
)

@Composable
fun NovaBottomBar(
    currentRoute: String?,
    onNavigate: (String) -> Unit,
    onFabClick: () -> Unit,
) {
    val t = rememberStrings()
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .border(width = 1.dp, color = MaterialTheme.colorScheme.outline)
            // Keeps content clear of the system gesture bar / 3-button nav —
            // without this the row's own 4.dp bottom padding sits behind it,
            // so the gesture pill visually collides with the tab labels.
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(start = 8.dp, top = 8.dp, end = 8.dp, bottom = 4.dp),
        verticalAlignment = Alignment.Top,
    ) {
        TABS.forEachIndexed { index, tab ->
            if (index == 2) {
                FabSlot(onClick = onFabClick, modifier = Modifier.weight(1f))
            }
            BottomTabItem(
                label = t(tab.labelKey),
                icon = tab.icon,
                selected = currentRoute == tab.route,
                onClick = { onNavigate(tab.route) },
                modifier = Modifier.weight(1f),
            )
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
    val color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
    Column(
        modifier = modifier.clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .size(width = 58.dp, height = 30.dp)
                .clip(RoundedCornerShape(50))
                .background(if (selected) MaterialTheme.colorScheme.primaryContainer else Color.Transparent),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = label, tint = color, modifier = Modifier.size(22.dp))
        }
        Text(
            label,
            color = color,
            fontSize = 10.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            maxLines = 1,
            softWrap = false,
            overflow = TextOverflow.Clip,
            modifier = Modifier.padding(top = 3.dp),
        )
    }
}

@Composable
private fun FabSlot(onClick: () -> Unit, modifier: Modifier = Modifier) {
    val t = rememberStrings()
    Box(modifier = modifier, contentAlignment = Alignment.TopCenter) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary)
                .clickable(onClick = onClick),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.Add, contentDescription = t(StringKey.NAV_ADD), tint = MaterialTheme.colorScheme.onPrimary)
        }
    }
}

fun bottomBarVisibleFor(route: String?): Boolean = route in setOf(
    NovaDestinations.HOME,
    NovaDestinations.REPORTS,
    NovaDestinations.BUDGETS,
    NovaDestinations.PROFILE,
)
