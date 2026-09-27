package com.s2nova.app.ui.screens.recurring

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.RecurrenceInterval
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.todayISO
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.BackHeader
import com.s2nova.app.ui.components.CategoryIcon
import com.s2nova.app.ui.components.CategoryIconSize
import com.s2nova.app.ui.rememberAppLanguage
import com.s2nova.app.ui.shortDateLabel
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch
import kotlin.math.abs
import com.s2nova.app.ui.tr

// Programados, per the Android v2 mockup's "Recurrentes" screen: one card
// per series with Pausar/Reanudar, Editar and, when an occurrence is due,
// "Vence hoy · Confirmar" (confirms directly, as in the mockup) plus
// "Omitir", which skips that occurrence via the backend's skip rule — the
// Web mockup's "Omitir esta vez", added here for parity. It is a list
// only: series are created with "Repetir" in Nuevo movimiento (the + opens
// it) and Editar opens Nuevo movimiento on the series, which also deletes it.
@Composable
fun RecurringScreen(onBack: () -> Unit, onNew: () -> Unit, onEdit: (String) -> Unit) {
    val series by AppContainer.recurringSeriesRepository.series.collectAsStateWithLifecycle()
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val language = rememberAppLanguage()
    val colors = NovaColors.current
    val scope = rememberCoroutineScope()
    val today = todayISO()

    LaunchedEffect(Unit) {
        runCatching { AppContainer.recurringSeriesRepository.refresh() }
        runCatching { AppContainer.walletRepository.refresh() }
    }

    // A due occurrence changes balances (confirm) or the series' date (skip),
    // and either one clears its "vence hoy" alert.
    fun afterOccurrence(block: suspend () -> Unit) {
        scope.launch {
            runCatching { block() }
            runCatching { AppContainer.walletRepository.refresh() }
            runCatching { AppContainer.transactionRepository.refresh() }
            runCatching { AppContainer.alertRepository.refresh() }
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        BackHeader(
            title = t(StringKey.RECURRING_TITLE),
            onBack = onBack,
            action = {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .clickable(onClick = onNew)
                        .semantics { contentDescription = t(StringKey.RECURRING_NEW) },
                    contentAlignment = Alignment.Center,
                ) {
                    Text("+", fontSize = 22.sp, fontWeight = FontWeight.Light, color = MaterialTheme.colorScheme.primary)
                }
            },
        )
        LazyColumn(
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(series, key = { it.id }) { item ->
                val due = item.active && item.isDue
                val overdue = due && item.nextOccurrenceDate < today
                val detail = when {
                    !item.active -> t(StringKey.RECURRING_PAUSED)
                    overdue -> "${intervalLabel(item.interval, t)} · ${t(StringKey.RECURRING_OVERDUE_SINCE)} ${shortDateLabel(item.nextOccurrenceDate, language)}"
                    due -> "${intervalLabel(item.interval, t)} · ${t(StringKey.RECURRING_DUE_TODAY)}"
                    else -> "${intervalLabel(item.interval, t)} · ${t(StringKey.RECURRING_NEXT_DUE)} ${shortDateLabel(item.nextOccurrenceDate, language)}"
                }
                val income = item.type == TransactionType.INCOME
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(18.dp))
                        .background(MaterialTheme.colorScheme.surface)
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(18.dp))
                        .padding(16.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CategoryIcon(category = item.category, size = CategoryIconSize.ROW)
                        Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                            Text(item.name, fontSize = 13.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                            Text(detail, fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp))
                        }
                        Text(
                            (if (income) "+" else "−") + format(abs(item.amount)),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (income) colors.positive else colors.negative,
                            modifier = Modifier.padding(start = 12.dp),
                        )
                    }
                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(
                        modifier = Modifier.padding(top = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        CardAction(if (item.active) t(StringKey.RECURRING_PAUSE) else t(StringKey.RECURRING_RESUME), MaterialTheme.colorScheme.primary) {
                            scope.launch { runCatching { AppContainer.recurringSeriesRepository.setActive(item.id, !item.active) } }
                        }
                        CardAction(t(StringKey.RECURRING_EDIT), colors.accentText) { onEdit(item.id) }
                        if (due) {
                            val label = t(if (overdue) StringKey.RECURRING_OVERDUE else StringKey.RECURRING_DUE_TODAY) + " · " + t(StringKey.RECURRING_CONFIRM)
                            CardAction(label, MaterialTheme.colorScheme.primary) {
                                afterOccurrence { AppContainer.recurringSeriesRepository.confirmOccurrence(item.id) }
                            }
                            CardAction(t(StringKey.RECURRING_SKIP), colors.accentText) {
                                afterOccurrence { AppContainer.recurringSeriesRepository.skipOccurrence(item.id) }
                            }
                        }
                    }
                }
            }
            if (series.isEmpty()) {
                item {
                    Text(
                        t(StringKey.RECURRING_EMPTY),
                        fontSize = 12.sp,
                        lineHeight = 18.sp,
                        color = colors.textDim,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun CardAction(label: String, color: Color, onClick: () -> Unit) {
    Text(label, fontSize = 12.5.sp, fontWeight = FontWeight.Bold, color = color, modifier = Modifier.clickable(onClick = onClick))
}

private fun intervalLabel(interval: RecurrenceInterval, t: (StringKey) -> String) = when (interval) {
    RecurrenceInterval.DAILY -> tr(StringKey.NM_FREQ_DAILY)
    RecurrenceInterval.WEEKLY -> t(StringKey.RECURRENCE_WEEKLY)
    RecurrenceInterval.MONTHLY -> t(StringKey.RECURRENCE_MONTHLY)
    RecurrenceInterval.YEARLY -> t(StringKey.RECURRENCE_YEARLY)
}
