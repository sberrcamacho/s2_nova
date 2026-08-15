package com.s2nova.app.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AnalyticsHelpers
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.formatCOP
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.ui.components.DonutSlice
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaDonutChart
import com.s2nova.app.ui.components.TransactionRow
import com.s2nova.app.ui.theme.NovaColors

@Composable
fun HomeScreen(
    onOpenNotifications: () -> Unit,
    onOpenProfile: () -> Unit,
    onOpenTransactions: () -> Unit,
) {
    val transactions by AppContainer.transactionRepository.transactions.collectAsStateWithLifecycle()
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val notifications by AppContainer.notificationRepository.notifications.collectAsStateWithLifecycle()
    val colors = NovaColors.current

    val totalIncome = transactions.filter { it.type == com.s2nova.app.data.model.TransactionType.INCOME }.sumOf { it.amount }
    val totalExpenses = transactions.filter { it.type == com.s2nova.app.data.model.TransactionType.EXPENSE }.sumOf { it.amount }
    val balance = totalIncome - totalExpenses

    val thisMonth = AnalyticsHelpers.monthlyHistory(transactions, 1).last()
    val breakdown = AnalyticsHelpers.categoryBreakdown(transactions)
    val unreadCount = notifications.count { !it.read }

    LazyColumn(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("HOLA", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        user?.name?.substringBefore(" ") ?: "👋",
                        style = MaterialTheme.typography.headlineMedium,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                }
                Box {
                    IconButton(onClick = onOpenNotifications) {
                        Icon(Icons.Filled.Notifications, contentDescription = "Notificaciones", tint = MaterialTheme.colorScheme.onBackground)
                    }
                    if (unreadCount > 0) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .align(Alignment.TopEnd)
                                .background(colors.negative, CircleShape),
                        )
                    }
                }
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary)
                        .clickable(onClick = onOpenProfile),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(user?.avatarInitials ?: "US", color = MaterialTheme.colorScheme.onPrimary, style = MaterialTheme.typography.labelLarge)
                }
            }
        }

        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(22.dp))
                    .background(Brush.linearGradient(listOf(colors.heroFrom, colors.heroTo)))
                    .padding(20.dp),
            ) {
                Column {
                    Text("SALDO ACTUAL", style = MaterialTheme.typography.labelMedium, color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.6f))
                    Text(
                        formatCOP(balance),
                        style = MaterialTheme.typography.headlineLarge,
                        color = androidx.compose.ui.graphics.Color.White,
                        modifier = Modifier.padding(top = 4.dp, bottom = 16.dp),
                    )
                    HorizontalDivider(color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.12f))
                    Row(modifier = Modifier.padding(top = 14.dp)) {
                        HeroStat(label = "Ingresos", value = formatCOP(thisMonth.income), valueColor = colors.positive, modifier = Modifier.weight(1f))
                        HeroStat(label = "Gastos", value = formatCOP(thisMonth.expenses), valueColor = colors.negative, modifier = Modifier.weight(1f))
                        HeroStat(label = "Ahorro", value = formatCOP(thisMonth.savings), valueColor = androidx.compose.ui.graphics.Color.White, modifier = Modifier.weight(1f))
                    }
                }
            }
        }

        item {
            NovaCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Resumen de gastos", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(12.dp))
                    if (breakdown.isEmpty()) {
                        Text("Sin gastos este mes.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            NovaDonutChart(
                                slices = breakdown.map { entry ->
                                    val meta = categoryMap[entry.category]
                                    DonutSlice(entry.amount, meta?.let { androidx.compose.ui.graphics.Color(it.color) } ?: colors.negative)
                                },
                                diameter = 110.dp,
                                strokeWidth = 16.dp,
                            )
                            Column(modifier = Modifier.padding(start = 16.dp)) {
                                breakdown.take(4).forEach { entry ->
                                    val meta = categoryMap[entry.category]
                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 3.dp)) {
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .background(meta?.let { androidx.compose.ui.graphics.Color(it.color) } ?: colors.negative, CircleShape),
                                        )
                                        Text(
                                            "${meta?.label} · ${entry.percentage}%",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.padding(start = 6.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        item {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text("Movimientos recientes", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable(onClick = onOpenTransactions),
                ) {
                    Text("Ver todos", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                }
            }
        }

        items(transactions.take(5)) { txn ->
            TransactionRow(transaction = txn)
        }

        item { Spacer(Modifier.height(72.dp)) }
    }
}

@Composable
private fun HeroStat(label: String, value: String, valueColor: androidx.compose.ui.graphics.Color, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.55f))
        Text(value, style = MaterialTheme.typography.titleMedium, color = valueColor, modifier = Modifier.padding(top = 2.dp))
    }
}
