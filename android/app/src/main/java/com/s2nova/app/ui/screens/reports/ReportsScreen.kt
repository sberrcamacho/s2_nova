package com.s2nova.app.ui.screens.reports

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AnalyticsHelpers
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.components.CategoryIcon
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.components.NovaProgressBar
import com.s2nova.app.ui.components.NovaSparkline
import com.s2nova.app.ui.components.NovaTopBar
import com.s2nova.app.ui.theme.NovaColors

private enum class RangeOption(val key: StringKey, val months: Int) { WEEK(StringKey.REPORTS_RANGE_WEEK, 1), MONTH(StringKey.REPORTS_RANGE_MONTH, 6), YEAR(StringKey.REPORTS_RANGE_YEAR, 12) }

@Composable
fun ReportsScreen() {
    val transactions by AppContainer.transactionRepository.transactions.collectAsStateWithLifecycle()
    var range by remember { mutableStateOf(RangeOption.MONTH) }
    val colors = NovaColors.current
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()

    val history = AnalyticsHelpers.monthlyHistory(transactions, range.months)
    val totalSpent = history.sumOf { it.expenses }
    val previousHalf = history.take(history.size / 2).sumOf { it.expenses }
    val recentHalf = history.drop(history.size / 2).sumOf { it.expenses }
    val deltaPct = if (previousHalf > 0) (((recentHalf - previousHalf) / previousHalf) * 100).toInt() else 0

    val avgDaily = totalSpent / (history.size * 30.0).coerceAtLeast(1.0)
    val highestMonth = history.maxByOrNull { it.expenses }
    val savingsRate = if (history.sumOf { it.income } > 0) ((history.sumOf { it.savings } / history.sumOf { it.income }) * 100).toInt() else 0

    val topSpending = AnalyticsHelpers.categoryBreakdown(transactions).take(5)

    Scaffold(
        topBar = { NovaTopBar(title = t(StringKey.TITLE_REPORTS)) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                    RangeOption.entries.forEachIndexed { index, opt ->
                        SegmentedButton(
                            selected = range == opt,
                            onClick = { range = opt },
                            shape = SegmentedButtonDefaults.itemShape(index, RangeOption.entries.size),
                        ) { Text(t(opt.key)) }
                    }
                }
            }

            item {
                NovaCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Text(t(StringKey.REPORTS_TOTAL_SPENT), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                            Text(format(totalSpent), style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(top = 4.dp, end = 10.dp))
                            Text(
                                "${if (deltaPct >= 0) "↑" else "↓"} ${kotlin.math.abs(deltaPct)}%",
                                color = if (deltaPct >= 0) colors.negative else colors.positive,
                                style = MaterialTheme.typography.labelLarge,
                            )
                        }
                        Spacer(Modifier.height(14.dp))
                        NovaSparkline(
                            points = history.map { it.expenses.toFloat() },
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.fillMaxWidth().height(80.dp),
                        )
                    }
                }
            }

            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    StatTile(label = t(StringKey.REPORTS_AVG_DAILY), value = format(avgDaily), modifier = Modifier.weight(1f))
                    StatTile(label = t(StringKey.REPORTS_HIGHEST_MONTH), value = highestMonth?.label ?: "—", modifier = Modifier.weight(1f))
                }
            }
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    StatTile(label = t(StringKey.REPORTS_SAVINGS_RATE), value = "$savingsRate%", modifier = Modifier.weight(1f))
                    StatTile(label = t(StringKey.REPORTS_PERIOD), value = t(range.key), modifier = Modifier.weight(1f))
                }
            }

            item {
                Text(t(StringKey.REPORTS_TOP_SPENDING), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(top = 8.dp))
            }

            items(topSpending) { entry ->
                NovaCard(modifier = Modifier.fillMaxWidth()) {
                    Row(modifier = Modifier.padding(14.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                        CategoryIcon(category = entry.category)
                        Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                            Text(categoryMap[entry.category]?.let { t(categoryStringKey(it.id)) } ?: "", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onBackground)
                            Spacer(Modifier.height(6.dp))
                            NovaProgressBar(percentage = entry.percentage, color = categoryMap[entry.category]?.let { androidx.compose.ui.graphics.Color(it.color) } ?: colors.negative)
                        }
                        Column(horizontalAlignment = androidx.compose.ui.Alignment.End, modifier = Modifier.padding(start = 12.dp)) {
                            Text(format(entry.amount), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onBackground)
                            Text("${entry.percentage}%", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }

            item { Spacer(Modifier.height(72.dp)) }
        }
    }
}

@Composable
private fun StatTile(label: String, value: String, modifier: Modifier = Modifier) {
    NovaCard(modifier = modifier) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(top = 4.dp))
        }
    }
}
