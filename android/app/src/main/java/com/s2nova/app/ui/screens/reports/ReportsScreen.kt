package com.s2nova.app.ui.screens.reports

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.graphics.Color
import com.s2nova.app.data.AnalyticsHelpers
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.components.BadgeTone
import com.s2nova.app.ui.components.NovaBarPair
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaProgressBar
import com.s2nova.app.ui.components.StatusBadge
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors

private enum class RangeOption(val key: StringKey, val subtitleKey: StringKey, val months: Int) {
    R3M(StringKey.REPORTS_RANGE_3M, StringKey.REPORTS_SUBTITLE_3M, 3),
    R6M(StringKey.REPORTS_RANGE_6M, StringKey.REPORTS_SUBTITLE_6M, 6),
    R12M(StringKey.REPORTS_RANGE_12M, StringKey.REPORTS_SUBTITLE_12M, 12),
}

@Composable
fun ReportsScreen() {
    val transactions by AppContainer.transactionRepository.transactions.collectAsStateWithLifecycle()
    var range by remember { mutableStateOf(RangeOption.R6M) }
    val colors = NovaColors.current
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()

    val fullHistory = AnalyticsHelpers.monthlyHistory(transactions, range.months * 2)
    val previous = fullHistory.take(range.months)
    val current = fullHistory.drop(range.months)

    val incomeCurrent = current.sumOf { it.income }
    val incomePrevious = previous.sumOf { it.income }
    val expenseCurrent = current.sumOf { it.expenses }
    val expensePrevious = previous.sumOf { it.expenses }
    val savingsCurrent = incomeCurrent - expenseCurrent
    val savingsPrevious = incomePrevious - expensePrevious
    val rateCurrent = if (incomeCurrent > 0) (savingsCurrent / incomeCurrent) * 100 else 0.0
    val ratePrevious = if (incomePrevious > 0) (savingsPrevious / incomePrevious) * 100 else 0.0

    fun pctDelta(curr: Double, prev: Double): Int = if (prev != 0.0) (((curr - prev) / prev) * 100).toInt() else 0

    val topSpending = AnalyticsHelpers.categoryBreakdown(transactions).take(5)

    Scaffold(containerColor = MaterialTheme.colorScheme.background) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            // Title + range chips stay fixed above the scrollable content —
            // mirrors the mockup, where the cards below scroll underneath them.
            Column(modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 16.dp)) {
                Text(
                    t(StringKey.TITLE_REPORTS),
                    style = MaterialTheme.typography.headlineMedium.copy(fontSize = 21.sp, letterSpacing = (-0.42).sp),
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    RangeOption.entries.forEach { opt ->
                        RangeChip(label = t(opt.key), selected = range == opt, onClick = { range = opt })
                    }
                }
            }

            LazyColumn(
                modifier = Modifier.fillMaxWidth().weight(1f),
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 12.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
            item {
                NovaCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Text(t(StringKey.REPORTS_PERIOD_TOTALS), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
                        Spacer(Modifier.height(12.dp))
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            PeriodTotalRow(
                                label = t(StringKey.HOME_INCOME),
                                value = format(incomeCurrent),
                                deltaPct = pctDelta(incomeCurrent, incomePrevious),
                                positiveWhenUp = true,
                            )
                            PeriodTotalRow(
                                label = t(StringKey.HOME_EXPENSES),
                                value = format(expenseCurrent),
                                deltaPct = pctDelta(expenseCurrent, expensePrevious),
                                positiveWhenUp = false,
                            )
                            PeriodTotalRow(
                                label = t(StringKey.HOME_SAVINGS),
                                value = format(savingsCurrent),
                                deltaPct = pctDelta(savingsCurrent, savingsPrevious),
                                positiveWhenUp = true,
                            )
                            PeriodTotalRow(
                                label = t(StringKey.REPORTS_SAVINGS_RATE),
                                value = "${rateCurrent.toInt()}%",
                                deltaPointDelta = (rateCurrent - ratePrevious).toInt(),
                                positiveWhenUp = true,
                            )
                        }
                    }
                }
            }

            item {
                NovaCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Text(
                            t(StringKey.REPORTS_INCOME_VS_EXPENSES),
                            style = MaterialTheme.typography.titleMedium.copy(fontSize = 13.5.sp, fontWeight = FontWeight.ExtraBold),
                            color = MaterialTheme.colorScheme.onBackground,
                        )
                        Text(
                            t(range.subtitleKey),
                            style = MaterialTheme.typography.bodySmall.copy(fontSize = 11.sp),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.height(16.dp))

                        val chartHistory = AnalyticsHelpers.monthlyHistory(transactions, range.months)
                        // Ceiling is fixed to the largest available range (12M) rather
                        // than the currently visible one, so bars don't rescale when
                        // switching between 3M/6M/12M.
                        val ceilingHistory = AnalyticsHelpers.monthlyHistory(transactions, RangeOption.entries.maxOf { it.months })
                        val maxValue = ceilingHistory.maxOfOrNull { maxOf(it.income, it.expenses) }?.toFloat()?.coerceAtLeast(1f) ?: 1f
                        val borderColor = MaterialTheme.colorScheme.outline

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(132.dp)
                                .drawBehind {
                                    drawLine(
                                        color = borderColor,
                                        start = Offset(0f, size.height),
                                        end = Offset(size.width, size.height),
                                        strokeWidth = 1.dp.toPx(),
                                    )
                                },
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            chartHistory.forEach { month ->
                                NovaBarPair(
                                    income = month.income.toFloat(),
                                    expense = month.expenses.toFloat(),
                                    maxValue = maxValue,
                                    positiveColor = colors.positive,
                                    negativeColor = colors.negative,
                                    maxBarHeight = 112.dp,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 7.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            chartHistory.forEach { month ->
                                Text(
                                    month.label,
                                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, fontWeight = FontWeight.SemiBold),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                    }
                }
            }

            item {
                NovaCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Text(t(StringKey.REPORTS_SPEND_BY_CATEGORY), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
                        Spacer(Modifier.height(14.dp))
                        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                            topSpending.forEach { entry ->
                                CategorySpendRow(
                                    label = categoryMap[entry.category]?.let { t(categoryStringKey(it.id)) } ?: "",
                                    amount = format(entry.amount),
                                    percentage = entry.percentage,
                                    color = categoryMap[entry.category]?.let { Color(it.color) } ?: colors.negative,
                                )
                            }
                        }
                    }
                }
            }

            item { Spacer(Modifier.height(72.dp)) }
            }
        }
    }
}

@Composable
private fun RangeChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        label,
        style = MaterialTheme.typography.labelMedium,
        color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onBackground,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
            .selectable(selected = selected, onClick = onClick, role = androidx.compose.ui.semantics.Role.RadioButton)
            .padding(horizontal = 14.dp, vertical = 8.dp),
    )
}

@Composable
private fun PeriodTotalRow(
    label: String,
    value: String,
    positiveWhenUp: Boolean,
    deltaPct: Int? = null,
    deltaPointDelta: Int? = null,
) {
    val rawDelta = deltaPointDelta ?: deltaPct ?: 0
    val isUp = rawDelta >= 0
    val isGood = if (positiveWhenUp) isUp else !isUp
    val deltaText = if (deltaPointDelta != null) {
        "${if (isUp) "+" else ""}$deltaPointDelta pt"
    } else {
        "${if (isUp) "↑" else "↓"} ${kotlin.math.abs(rawDelta)}%"
    }
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(value, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onBackground)
            StatusBadge(text = deltaText, tone = if (isGood) BadgeTone.POSITIVE else BadgeTone.NEGATIVE)
        }
    }
}

@Composable
private fun CategorySpendRow(label: String, amount: String, percentage: Int, color: Color) {
    Column {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onBackground)
            Text(amount, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.height(6.dp))
        NovaProgressBar(percentage = percentage, color = color)
    }
}
