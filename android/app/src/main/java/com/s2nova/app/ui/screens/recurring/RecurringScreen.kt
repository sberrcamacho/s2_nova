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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import com.s2nova.app.ui.theme.NovaType
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
    val dataLoaded by AppContainer.dataLoaded.collectAsStateWithLifecycle()
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
                com.s2nova.app.ui.components.HeaderAddButton(t(StringKey.RECURRING_NEW), onNew)
            },
        )
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
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
                        .clip(RoundedCornerShape(20.dp))
                        .background(MaterialTheme.colorScheme.surface)
                        // A due series carries the `warning` border, plus its text and clock.
                        .border(1.dp, if (due) colors.warning else MaterialTheme.colorScheme.outline, RoundedCornerShape(20.dp))
                        // The actions row is 48 dp tall, so the bottom padding is smaller.
                        .padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 4.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CategoryIcon(category = item.category, size = CategoryIconSize.ROW)
                        Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                            Text(item.name, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                if (due) com.s2nova.app.ui.components.V2Icon(com.s2nova.app.ui.components.V2Icons.clock, colors.warning, 14.dp)
                                // Two lines at most: the next date is the part that matters.
                                Text(detail, style = NovaType.bodySm, color = if (due) colors.warning else MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                            }
                        }
                        Text(
                            (if (income) "+" else "−") + format(abs(item.amount)),
                            style = NovaType.amount,
                            color = if (!item.active) colors.textDim else if (income) colors.positive else colors.negative,
                            maxLines = 1,
                            softWrap = false,
                            modifier = Modifier.padding(start = 12.dp),
                        )
                    }
                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(
                        modifier = Modifier.padding(top = 4.dp).offset(x = (-8).dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        CardAction(if (item.active) t(StringKey.RECURRING_PAUSE) else t(StringKey.RECURRING_RESUME), colors.link) {
                            scope.launch { runCatching { AppContainer.recurringSeriesRepository.setActive(item.id, !item.active) } }
                        }
                        CardAction(t(StringKey.RECURRING_EDIT), colors.link) { onEdit(item.id) }
                        if (due) {
                            CardAction(t(StringKey.RECURRING_CONFIRM), colors.link, tonal = true) {
                                afterOccurrence { AppContainer.recurringSeriesRepository.confirmOccurrence(item.id) }
                            }
                            CardAction(t(StringKey.RECURRING_SKIP), colors.link) {
                                afterOccurrence { AppContainer.recurringSeriesRepository.skipOccurrence(item.id) }
                            }
                        }
                    }
                }
            }
            if (series.isEmpty() && !dataLoaded) {
                item { com.s2nova.app.ui.components.NovaSkeletonRows(count = 3, modifier = Modifier.padding(vertical = 8.dp)) }
            } else if (series.isEmpty()) {
                item {
                    Text(
                        t(StringKey.RECURRING_EMPTY),
                        style = NovaType.bodySm,
                        color = colors.textDim,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
                    )
                }
            }
        }
    }
}

// A text action on a 48 dp target; `tonal` is the card's main action
// (confirming a due occurrence).
@Composable
private fun CardAction(label: String, color: Color, tonal: Boolean = false, onClick: () -> Unit) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier.heightIn(min = 48.dp).clip(RoundedCornerShape(12.dp)).clickable(role = androidx.compose.ui.semantics.Role.Button, onClick = onClick).padding(horizontal = if (tonal) 0.dp else 8.dp),
    ) {
        if (tonal) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.height(40.dp).background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(12.dp)).padding(horizontal = 16.dp),
            ) {
                Text(label, style = NovaType.label, color = MaterialTheme.colorScheme.onPrimaryContainer, maxLines = 1, softWrap = false)
            }
        } else {
            Text(label, style = NovaType.label, color = color, maxLines = 1, softWrap = false)
        }
    }
}

private fun intervalLabel(interval: RecurrenceInterval, t: (StringKey) -> String) = when (interval) {
    RecurrenceInterval.DAILY -> tr(StringKey.NM_FREQ_DAILY)
    RecurrenceInterval.WEEKLY -> t(StringKey.RECURRENCE_WEEKLY)
    RecurrenceInterval.MONTHLY -> t(StringKey.RECURRENCE_MONTHLY)
    RecurrenceInterval.YEARLY -> t(StringKey.RECURRENCE_YEARLY)
}
