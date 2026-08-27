package com.s2nova.app.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AnalyticsHelpers
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.RecurringSeries
import com.s2nova.app.data.model.BudgetProgress
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.components.AmountText
import com.s2nova.app.ui.components.NovaProgressBar
import com.s2nova.app.ui.components.TransactionRow
import com.s2nova.app.ui.components.budgetStatusColor
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.data.mock.categoryMap
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

@Composable
fun HomeScreen(
    onOpenNotifications: () -> Unit,
    onOpenProfile: () -> Unit,
    onOpenTransactions: () -> Unit,
    onOpenBudgets: () -> Unit,
    onOpenRecurring: () -> Unit,
) {
    val transactions by AppContainer.transactionRepository.transactions.collectAsStateWithLifecycle()
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val notifications by AppContainer.notificationRepository.notifications.collectAsStateWithLifecycle()
    val budgetProgress by AppContainer.budgetRepository.budgetProgress.collectAsStateWithLifecycle()
    val recurringSeries by AppContainer.recurringSeriesRepository.series.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val colors = NovaColors.current
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()

    LaunchedEffect(Unit) {
        AppContainer.budgetRepository.refresh()
        AppContainer.recurringSeriesRepository.refresh()
    }

    val totalIncome = transactions.filter { it.type == com.s2nova.app.data.model.TransactionType.INCOME }.sumOf { it.amount }
    val totalExpenses = transactions.filter { it.type == com.s2nova.app.data.model.TransactionType.EXPENSE }.sumOf { it.amount }
    val balance = totalIncome - totalExpenses

    val thisMonth = AnalyticsHelpers.monthlyHistory(transactions, 1).last()
    val unreadCount = notifications.count { !it.read }
    val topBudgets = budgetProgress.sortedByDescending { it.percentage }.take(3)
    val upcoming = recurringSeries.filter { it.active }.sortedBy { it.nextOccurrenceDate }.take(2)

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
                    Text(t(StringKey.HOME_GREETING), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        user?.name?.substringBefore(" ") ?: "👋",
                        style = MaterialTheme.typography.headlineMedium,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                }
                Box {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surface)
                            .border(1.dp, MaterialTheme.colorScheme.outline, CircleShape)
                            .clickable(onClick = onOpenNotifications),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Filled.Notifications, contentDescription = t(StringKey.SETTINGS_NOTIFICATIONS), tint = MaterialTheme.colorScheme.onBackground, modifier = Modifier.size(20.dp))
                    }
                    if (unreadCount > 0) {
                        Box(
                            modifier = Modifier
                                .size(11.dp)
                                .align(Alignment.TopEnd)
                                .background(MaterialTheme.colorScheme.surface, CircleShape)
                                .padding(2.dp)
                                .background(colors.negative, CircleShape),
                        )
                    }
                }
                Box(
                    modifier = Modifier
                        .padding(start = 10.dp)
                        .size(38.dp)
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
                    .clip(RoundedCornerShape(24.dp))
                    .background(Brush.linearGradient(listOf(colors.heroFrom, colors.heroTo)))
                    .border(1.dp, colors.heroBorder, RoundedCornerShape(24.dp)),
            ) {
                // Glow toward the top-right corner — minSdk 31 guarantees
                // Modifier.blur() (RenderEffect) is available everywhere.
                Box(
                    modifier = Modifier
                        .size(170.dp)
                        .align(Alignment.TopEnd)
                        .offset(x = 55.dp, y = (-55).dp)
                        .blur(46.dp)
                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.40f), CircleShape),
                )
                Column(modifier = Modifier.padding(22.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                        Text(
                            t(StringKey.HOME_BALANCE),
                            style = MaterialTheme.typography.labelMedium,
                            color = Color(0xFFEAE7FF),
                            modifier = Modifier.weight(1f),
                        )
                        if (wallets.isNotEmpty()) {
                            Text(
                                "${wallets.size} ${t(StringKey.HOME_WALLET_COUNT_SUFFIX)}",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White.copy(alpha = 0.70f),
                                modifier = Modifier
                                    .clip(RoundedCornerShape(50))
                                    .background(Color.White.copy(alpha = 0.10f))
                                    .padding(horizontal = 10.dp, vertical = 4.dp),
                            )
                        }
                    }
                    Text(
                        format(balance),
                        style = MaterialTheme.typography.headlineLarge.copy(fontSize = 34.sp, letterSpacing = (-1.02).sp),
                        color = Color.White,
                        modifier = Modifier.padding(top = 4.dp, bottom = 16.dp),
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        HeroStatTile(label = t(StringKey.HOME_INCOME), value = format(thisMonth.income), valueColor = colors.positive, modifier = Modifier.weight(1f))
                        HeroStatTile(label = t(StringKey.HOME_EXPENSES), value = format(thisMonth.expenses), valueColor = colors.negative, modifier = Modifier.weight(1f))
                    }
                }
            }
        }

        if (topBudgets.isNotEmpty()) {
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(20.dp))
                        .background(MaterialTheme.colorScheme.surface)
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(20.dp))
                        .padding(18.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                        Text(t(StringKey.TITLE_BUDGETS), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
                        Text(
                            t(StringKey.HOME_SEE_ALL),
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.clickable(onClick = onOpenBudgets),
                        )
                    }
                    Spacer(Modifier.height(14.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(13.dp)) {
                        topBudgets.forEach { progress -> HomeBudgetRow(progress = progress, t = t) }
                    }
                }
            }
        }

        if (upcoming.isNotEmpty()) {
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(20.dp))
                        .background(MaterialTheme.colorScheme.surface)
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(20.dp))
                        .padding(18.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                        Text(t(StringKey.HOME_UPCOMING_PAYMENTS), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
                        Text(
                            t(StringKey.RECURRING_TITLE),
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.clickable(onClick = onOpenRecurring),
                        )
                    }
                    Column(modifier = Modifier.padding(top = 10.dp)) {
                        upcoming.forEachIndexed { index, series ->
                            UpcomingPaymentRow(series = series, showDivider = index < upcoming.lastIndex)
                        }
                    }
                }
            }
        }

        item {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text(t(StringKey.HOME_RECENT_TXNS), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable(onClick = onOpenTransactions),
                ) {
                    Text(t(StringKey.HOME_SEE_ALL), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
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
private fun HeroStatTile(label: String, value: String, valueColor: Color, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White.copy(alpha = 0.06f))
            .padding(horizontal = 13.dp, vertical = 11.dp),
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.55f))
        Text(value, style = MaterialTheme.typography.titleMedium, color = valueColor, modifier = Modifier.padding(top = 3.dp))
    }
}

@Composable
private fun HomeBudgetRow(progress: BudgetProgress, t: (StringKey) -> String) {
    val colors = NovaColors.current
    val label = progress.budget.name ?: categoryMap[progress.budget.category]?.let { t(categoryStringKey(it.id)) } ?: ""
    Column {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.Bold)
            Text(
                "${progress.percentage}%",
                style = MaterialTheme.typography.labelLarge,
                color = budgetStatusColor(progress.status, colors),
                fontWeight = FontWeight.Bold,
            )
        }
        Spacer(Modifier.height(6.dp))
        NovaProgressBar(percentage = progress.percentage, color = budgetStatusColor(progress.status, colors), height = 6.dp)
    }
}

@Composable
private fun UpcomingPaymentRow(series: RecurringSeries, showDivider: Boolean) {
    val date = remember(series.nextOccurrenceDate) { runCatching { LocalDate.parse(series.nextOccurrenceDate) }.getOrNull() }
    val locale = Locale.forLanguageTag("es-CO")
    Column {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 10.dp)) {
            Column(modifier = Modifier.width(42.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    date?.month?.getDisplayName(TextStyle.SHORT, locale)?.uppercase(locale)?.trimEnd('.') ?: "",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    date?.dayOfMonth?.toString() ?: "",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                    fontWeight = FontWeight.Bold,
                )
            }
            Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                Text(series.name, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onBackground)
                Text(
                    intervalLabel(series.interval),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            AmountText(amount = series.amount, type = series.type)
        }
        if (showDivider) {
            androidx.compose.material3.HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
        }
    }
}

@Composable
private fun intervalLabel(interval: com.s2nova.app.data.model.RecurrenceInterval): String {
    val t = rememberStrings()
    return when (interval) {
        com.s2nova.app.data.model.RecurrenceInterval.WEEKLY -> t(StringKey.RECURRENCE_WEEKLY)
        com.s2nova.app.data.model.RecurrenceInterval.MONTHLY -> t(StringKey.RECURRENCE_MONTHLY)
        com.s2nova.app.data.model.RecurrenceInterval.YEARLY -> t(StringKey.RECURRENCE_YEARLY)
    }
}
