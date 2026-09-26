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
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.RecurrenceInterval
import com.s2nova.app.data.model.RecurringSeries
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.model.Wallet
import com.s2nova.app.data.todayISO
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.ThousandsGroupingVisualTransformation
import com.s2nova.app.ui.components.categoryName
import com.s2nova.app.ui.components.BackHeader
import com.s2nova.app.ui.components.CategoryIcon
import com.s2nova.app.ui.components.CategoryIconSize
import com.s2nova.app.ui.components.ColorPill
import com.s2nova.app.ui.components.SheetAmountBox
import com.s2nova.app.ui.components.SheetBox
import com.s2nova.app.ui.components.SheetInput
import com.s2nova.app.ui.components.SheetLabel
import com.s2nova.app.ui.components.SheetPill
import com.s2nova.app.ui.components.DraftSheetDeleteRow
import com.s2nova.app.ui.components.DraftSheetPrimaryButton
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.MockupIcons
import com.s2nova.app.ui.longDateLabel
import com.s2nova.app.ui.rememberAppLanguage
import com.s2nova.app.ui.shortDateLabel
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.suggestExpenseCategory
import com.s2nova.app.ui.suggestIncomeCategory
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import kotlin.math.abs

// Programados, per the Android v2 mockup's "Recurrentes" screen: one card
// per series with Pausar/Reanudar, Editar and, when an occurrence is due,
// "Vence hoy · Confirmar" (confirms directly, as in the mockup) plus
// "Omitir", which skips that occurrence via the backend's skip rule — the
// Web mockup's "Omitir esta vez", added here for parity.
@Composable
fun RecurringScreen(onBack: () -> Unit) {
    val series by AppContainer.recurringSeriesRepository.series.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val language = rememberAppLanguage()
    val colors = NovaColors.current
    val scope = rememberCoroutineScope()
    val today = todayISO()
    var draft by remember { mutableStateOf<RecurringDraft?>(null) }
    var deleting by remember { mutableStateOf<RecurringSeries?>(null) }

    LaunchedEffect(Unit) {
        runCatching { AppContainer.recurringSeriesRepository.refresh() }
        runCatching { AppContainer.walletRepository.refresh() }
    }

    fun openCreate() {
        draft = RecurringDraft(
            id = null,
            name = "",
            type = TransactionType.EXPENSE,
            amountText = "",
            walletId = wallets.firstOrNull()?.id,
            category = "exp.utilities",
            userPickedCategory = false,
            interval = RecurrenceInterval.MONTHLY,
            nextDate = "",
        )
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
                        .clickable { openCreate() }
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
                        CardAction(t(StringKey.RECURRING_EDIT), colors.accentText) {
                            draft = RecurringDraft(
                                id = item.id,
                                name = item.name,
                                type = item.type,
                                amountText = item.amount.toLong().toString(),
                                walletId = item.walletId,
                                category = item.category,
                                userPickedCategory = true,
                                interval = item.interval,
                                nextDate = item.nextOccurrenceDate,
                            )
                        }
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

    val d = draft
    if (d != null) {
        RecurringDraftSheet(
            draft = d,
            wallets = wallets,
            onDraftChange = { draft = it },
            onDismiss = { draft = null },
            onSave = {
                val amount = d.amountText.toDoubleOrNull()
                val walletId = d.walletId
                if (d.name.isNotBlank() && amount != null && amount > 0 && walletId != null) {
                    val next = d.nextDate.ifBlank { today }
                    scope.launch {
                        runCatching {
                            if (d.id == null) {
                                AppContainer.recurringSeriesRepository.create(
                                    name = d.name.trim(),
                                    type = d.type,
                                    amount = amount,
                                    walletId = walletId,
                                    category = d.category,
                                    interval = d.interval,
                                    startDate = next,
                                )
                            } else {
                                AppContainer.recurringSeriesRepository.update(
                                    id = d.id,
                                    name = d.name.trim(),
                                    type = d.type,
                                    amount = amount,
                                    walletId = walletId,
                                    category = d.category,
                                    interval = d.interval,
                                    nextOccurrenceDate = next,
                                )
                            }
                        }
                        runCatching { AppContainer.alertRepository.refresh() }
                    }
                    draft = null
                }
            },
            onRequestDelete = {
                val target = series.firstOrNull { it.id == d.id }
                if (target != null) {
                    deleting = target
                    draft = null
                }
            },
        )
    }

    val target = deleting
    if (target != null) {
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text(t(StringKey.RECURRING_DELETE_CONFIRM_TITLE)) },
            text = { Text(t(StringKey.RECURRING_DELETE_CONFIRM_BODY)) },
            confirmButton = {
                TextButton(onClick = {
                    scope.launch { runCatching { AppContainer.recurringSeriesRepository.delete(target.id) } }
                    deleting = null
                }) { Text(t(StringKey.RECURRING_DELETE), color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text(t(StringKey.COMMON_CANCEL)) } },
        )
    }
}

@Composable
private fun CardAction(label: String, color: Color, onClick: () -> Unit) {
    Text(label, fontSize = 12.5.sp, fontWeight = FontWeight.Bold, color = color, modifier = Modifier.clickable(onClick = onClick))
}

private fun intervalLabel(interval: RecurrenceInterval, t: (StringKey) -> String) = when (interval) {
    RecurrenceInterval.DAILY -> "Diario"
    RecurrenceInterval.WEEKLY -> t(StringKey.RECURRENCE_WEEKLY)
    RecurrenceInterval.MONTHLY -> t(StringKey.RECURRENCE_MONTHLY)
    RecurrenceInterval.YEARLY -> t(StringKey.RECURRENCE_YEARLY)
}

// Draft state backing the series create/edit sheet. `id == null` means
// "creating"; an empty nextDate reads "Elegir fecha" and saves as today.
private data class RecurringDraft(
    val id: String?,
    val name: String,
    val type: TransactionType,
    val amountText: String,
    val walletId: String?,
    val category: CategoryId,
    val userPickedCategory: Boolean,
    val interval: RecurrenceInterval,
    val nextDate: String,
)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun RecurringDraftSheet(
    draft: RecurringDraft,
    wallets: List<Wallet>,
    onDraftChange: (RecurringDraft) -> Unit,
    onDismiss: () -> Unit,
    onSave: () -> Unit,
    onRequestDelete: () -> Unit,
) {
    val t = rememberStrings()
    val language = rememberAppLanguage()
    val colors = NovaColors.current
    val isEdit = draft.id != null
    val pool = AppContainer.categoryRepository.parents(draft.type == TransactionType.INCOME, includeHidden = false)
    val guessed = if (draft.type == TransactionType.INCOME) suggestIncomeCategory(draft.name) else suggestExpenseCategory(draft.name)
    val showAutoNote = !draft.userPickedCategory && guessed != null
    var picking by remember { mutableStateOf(false) }

    NovaDraftSheet(
        onDismiss = onDismiss,
        title = t(if (isEdit) StringKey.RECURRING_EDIT_TITLE else StringKey.RECURRING_NEW),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Column {
                SheetLabel(t(StringKey.RECURRING_NAME))
                SheetBox(padding = PaddingValues(horizontal = 14.dp, vertical = 15.dp)) {
                    SheetInput(
                        value = draft.name,
                        onValueChange = { newName ->
                            val g = if (!draft.userPickedCategory) {
                                if (draft.type == TransactionType.INCOME) suggestIncomeCategory(newName) else suggestExpenseCategory(newName)
                            } else null
                            onDraftChange(draft.copy(name = newName, category = g ?: draft.category))
                        },
                        placeholder = t(StringKey.RECURRING_NAME_PLACEHOLDER),
                        style = TextStyle(fontSize = 13.5.sp, fontWeight = FontWeight.Bold),
                    )
                }
                Text(
                    t(if (showAutoNote) StringKey.RECURRING_CATEGORY_AUTO_NOTE else StringKey.RECURRING_NOTE),
                    fontSize = 11.sp,
                    color = colors.textDim,
                    modifier = Modifier.padding(top = 9.dp),
                )
            }

            Column {
                SheetLabel(t(StringKey.RECURRING_TYPE))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(TransactionType.EXPENSE to t(StringKey.ADD_TXN_EXPENSE), TransactionType.INCOME to t(StringKey.ADD_TXN_INCOME)).forEach { (value, label) ->
                        SheetPill(label, selected = draft.type == value) {
                            val category = if (value == TransactionType.INCOME) "inc.work" else "exp.utilities"
                            onDraftChange(draft.copy(type = value, category = category, userPickedCategory = false))
                        }
                    }
                }
            }

            Column {
                SheetLabel(t(StringKey.ADD_TXN_CATEGORY))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    pool.forEach { c ->
                        ColorPill(
                            label = categoryName(c.id),
                            color = Color(c.color),
                            selected = draft.category == c.id,
                            onClick = { onDraftChange(draft.copy(category = c.id, userPickedCategory = true)) },
                        )
                    }
                }
            }

            Column {
                SheetLabel(t(StringKey.RECURRING_AMOUNT))
                SheetAmountBox(draft.amountText) { onDraftChange(draft.copy(amountText = it)) }
            }

            // Not in the mockup, whose series have no wallet: the backend
            // needs one to know which balance a confirmed occurrence moves.
            if (wallets.size > 1) {
                Column {
                    SheetLabel(t(StringKey.ADD_TXN_WALLET))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        wallets.forEach { wallet ->
                            SheetPill(wallet.name, selected = draft.walletId == wallet.id) { onDraftChange(draft.copy(walletId = wallet.id)) }
                        }
                    }
                }
            }

            Column {
                SheetLabel(t(StringKey.RECURRING_INTERVAL))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(
                        RecurrenceInterval.WEEKLY to t(StringKey.RECURRENCE_WEEKLY),
                        RecurrenceInterval.MONTHLY to t(StringKey.RECURRENCE_MONTHLY),
                        RecurrenceInterval.YEARLY to t(StringKey.RECURRENCE_YEARLY),
                    ).forEach { (value, label) ->
                        SheetPill(label, selected = draft.interval == value) { onDraftChange(draft.copy(interval = value)) }
                    }
                }
            }

            Column {
                SheetLabel(t(StringKey.RECURRING_START_DATE))
                SheetBox(padding = PaddingValues(horizontal = 14.dp, vertical = 14.dp), onClick = { picking = true }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(MockupIcons.Calendar, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                        Text(
                            if (draft.nextDate.isNotBlank()) longDateLabel(draft.nextDate, language) else t(StringKey.DATE_PICKER_CHOOSE),
                            fontSize = 13.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (draft.nextDate.isNotBlank()) MaterialTheme.colorScheme.onBackground else colors.textDim,
                            modifier = Modifier.padding(start = 10.dp),
                        )
                    }
                }
            }

            val amount = draft.amountText.toDoubleOrNull()
            DraftSheetPrimaryButton(
                label = t(StringKey.COMMON_SAVE),
                enabled = draft.name.isNotBlank() && amount != null && amount > 0 && draft.walletId != null,
                onClick = onSave,
            )

            if (isEdit) {
                DraftSheetDeleteRow(label = t(StringKey.RECURRING_DELETE), onClick = onRequestDelete)
            }
        }
    }

    if (picking) {
        val initial = draft.nextDate.ifBlank { todayISO() }
        val state = rememberDatePickerState(
            initialSelectedDateMillis = LocalDate.parse(initial).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli(),
        )
        DatePickerDialog(
            onDismissRequest = { picking = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let {
                        onDraftChange(draft.copy(nextDate = Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate().toString()))
                    }
                    picking = false
                }) { Text(t(StringKey.DATE_PICKER_USE_DATE)) }
            },
            dismissButton = {
                TextButton(onClick = { onDraftChange(draft.copy(nextDate = todayISO())); picking = false }) { Text(t(StringKey.DATE_PICKER_TODAY)) }
            },
        ) {
            DatePicker(state = state)
        }
    }
}
