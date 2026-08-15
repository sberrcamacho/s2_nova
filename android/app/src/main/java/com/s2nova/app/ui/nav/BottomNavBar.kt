package com.s2nova.app.ui.nav

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

private data class BottomTab(val route: String, val label: String, val icon: ImageVector)

private val TABS = listOf(
    BottomTab(NovaDestinations.HOME, "Inicio", Icons.Filled.Home),
    BottomTab(NovaDestinations.REPORTS, "Reportes", Icons.Filled.BarChart),
    BottomTab(NovaDestinations.BUDGETS, "Presupuesto", Icons.Filled.Wallet),
    BottomTab(NovaDestinations.PROFILE, "Perfil", Icons.Filled.Person),
)

@Composable
fun NovaBottomBar(
    currentRoute: String?,
    onNavigate: (String) -> Unit,
    onFabClick: () -> Unit,
) {
    Column {
        NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 0.dp) {
            TABS.forEachIndexed { index, tab ->
                if (index == 2) {
                    FabSlot(onClick = onFabClick)
                }
                NavigationBarItem(
                    selected = currentRoute == tab.route,
                    onClick = { onNavigate(tab.route) },
                    icon = { Icon(tab.icon, contentDescription = tab.label) },
                    label = { Text(tab.label) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        selectedTextColor = MaterialTheme.colorScheme.primary,
                        unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                    ),
                )
            }
        }
    }
}

@Composable
private fun RowScope.FabSlot(onClick: () -> Unit) {
    NavigationBarItem(
        selected = false,
        onClick = onClick,
        icon = {
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .background(MaterialTheme.colorScheme.primary, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.Add, contentDescription = "Agregar", tint = MaterialTheme.colorScheme.onPrimary)
            }
        },
        label = {},
        colors = NavigationBarItemDefaults.colors(indicatorColor = MaterialTheme.colorScheme.surface),
    )
}

fun bottomBarVisibleFor(route: String?): Boolean = route in setOf(
    NovaDestinations.HOME,
    NovaDestinations.REPORTS,
    NovaDestinations.BUDGETS,
    NovaDestinations.PROFILE,
)
