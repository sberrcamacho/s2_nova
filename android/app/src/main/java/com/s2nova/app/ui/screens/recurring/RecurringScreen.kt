package com.s2nova.app.ui.screens.recurring

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.mock.expenseCategories
import com.s2nova.app.data.mock.incomeCategories
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.RecurrenceInterval
import com.s2nova.app.data.model.RecurringSeries
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.model.Wallet
import com.s2nova.app.data.todayISO
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.ThousandsGroupingVisualTransformation
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.components.CategoryIcon
import com.s2nova.app.ui.components.CategoryIconSize
import com.s2nova.app.ui.components.ColorPill
import com.s2nova.app.ui.components.DraftSheetDeleteRow
import com.s2nova.app.ui.components.DraftSheetPrimaryButton
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaDatePickerField
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.NovaTopBar
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.suggestExpenseCategory
import com.s2nova.app.ui.suggestIncomeCategory
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch

@Composable
fun RecurringScreen(onBack: () -> Unit) {
    val series by AppContainer.recurringSeriesRepository.series.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val colors = NovaColors.current
    val scope = rememberCoroutineScope()
    var draft by remember { mutableStateOf<RecurringDraft?>(null) }
    var confirmingId by remember { mutableStateOf<String?>(null) }
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
            category = expenseCategories.first().id,
            userPickedCategory = false,
            interval = RecurrenceInterval.MONTHLY,
            nextDate = todayISO(),
        )
    }

    Scaffold(
        topBar = {
            NovaTopBar(
                title = t(StringKey.RECURRING_TITLE),
                onBack = onBack,
                actions = { IconButton(onClick = { openCreate() }) { Icon(Icons.Filled.Add, contentDescription = t(StringKey.RECURRING_NEW)) } },
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        if (series.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).padding(32.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(Icons.Filled.Repeat, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(48.dp))
                Text(t(StringKey.RECURRING_EMPTY), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 12.dp))
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(series, key = { it.id }) { item ->
                    NovaCard(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = {
                            draft = RecurringDraft(
                                id = item.id,
                                name = item.name,
                                type = item.type,
                                amountText = item.amount.toInt().toString(),
                                walletId = item.walletId,
                                category = item.category,
                                userPickedCategory = true,
                                interval = item.interval,
                                nextDate = item.nextOccurrenceDate,
                            )
                        },
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                CategoryIcon(category = item.category, size = CategoryIconSize.ROW)
                                Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                                    Text(item.name, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
                                    Text(
                                        if (item.active) "${intervalLabel(item.interval, t)} · ${t(StringKey.RECURRING_NEXT_DUE)} ${item.nextOccurrenceDate}"
                                        else t(StringKey.RECURRING_PAUSED),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                Text(
                                    (if (item.type == TransactionType.EXPENSE) "-" else "+") + format(item.amount),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = if (item.type == TransactionType.EXPENSE) MaterialTheme.colorScheme.error else colors.positive,
                                )
                            }
                            Row(modifier = Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                TextButton(onClick = {
                                    scope.launch { AppContainer.recurringSeriesRepository.setActive(item.id, !item.active) }
                                }) {
                                    Text(if (item.active) t(StringKey.RECURRING_PAUSE) else t(StringKey.RECURRING_RESUME))
                                }
                                if (item.active && item.isDue) {
                                    TextButton(onClick = { confirmingId = item.id }) {
                                        Text(t(StringKey.RECURRING_DUE_TODAY) + " · " + t(StringKey.RECURRING_CONFIRM))
                                    }
                                }
                            }
                        }
                    }
                }
                item { Spacer(Modifier.height(72.dp)) }
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
                    if (d.name.isNotBlank() && amount != null && amount > 0 && walletId != null && d.nextDate.isNotBlank()) {
                        scope.launch {
                            if (d.id == null) {
                                AppContainer.recurringSeriesRepository.create(
                                    name = d.name.trim(),
                                    type = d.type,
                                    amount = amount,
                                    walletId = walletId,
                                    category = d.category,
                                    interval = d.interval,
                                    startDate = d.nextDate,
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
                                    nextOccurrenceDate = d.nextDate,
                                )
                            }
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

        if (confirmingId != null) {
            AlertDialog(
                onDismissRequest = { confirmingId = null },
                title = { Text(t(StringKey.RECURRING_CONFIRM)) },
                text = { Text(t(StringKey.RECURRING_CONFIRMED_TOAST) + "?") },
                confirmButton = {
                    TextButton(onClick = {
                        val id = confirmingId!!
                        scope.launch {
                            AppContainer.recurringSeriesRepository.confirmOccurrence(id)
                            AppContainer.walletRepository.refresh()
                            AppContainer.transactionRepository.refresh()
                            confirmingId = null
                        }
                    }) { Text(t(StringKey.RECURRING_CONFIRM)) }
                },
                dismissButton = { TextButton(onClick = { confirmingId = null }) { Text(t(StringKey.COMMON_CANCEL)) } },
            )
        }

        if (deleting != null) {
            val target = deleting!!
            AlertDialog(
                onDismissRequest = { deleting = null },
                title = { Text(t(StringKey.RECURRING_DELETE_CONFIRM_TITLE)) },
                text = { Text(t(StringKey.RECURRING_DELETE_CONFIRM_BODY)) },
                confirmButton = {
                    TextButton(onClick = {
                        scope.launch { AppContainer.recurringSeriesRepository.delete(target.id) }
                        deleting = null
                    }) { Text(t(StringKey.RECURRING_DELETE), color = MaterialTheme.colorScheme.error) }
                },
                dismissButton = { TextButton(onClick = { deleting = null }) { Text(t(StringKey.COMMON_CANCEL)) } },
            )
        }
    }
}

@Composable
private fun intervalLabel(interval: RecurrenceInterval, t: (StringKey) -> String) = when (interval) {
    RecurrenceInterval.WEEKLY -> t(StringKey.RECURRENCE_WEEKLY)
    RecurrenceInterval.MONTHLY -> t(StringKey.RECURRENCE_MONTHLY)
    RecurrenceInterval.YEARLY -> t(StringKey.RECURRENCE_YEARLY)
}

// Draft state backing the recurring-series create/edit sheet. `id == null`
// means "creating".
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
    val isEdit = draft.id != null
    val pool = if (draft.type == TransactionType.INCOME) incomeCategories else expenseCategories
    val guessed = if (draft.type == TransactionType.INCOME) suggestIncomeCategory(draft.name) else suggestExpenseCategory(draft.name)
    val showAutoNote = !draft.userPickedCategory && guessed != null

    NovaDraftSheet(
        onDismiss = onDismiss,
        title = t(if (isEdit) StringKey.RECURRING_EDIT_TITLE else StringKey.RECURRING_NEW),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = draft.name,
                    onValueChange = { newName ->
                        val g = if (!draft.userPickedCategory) {
                            if (draft.type == TransactionType.INCOME) suggestIncomeCategory(newName) else suggestExpenseCategory(newName)
                        } else null
                        onDraftChange(draft.copy(name = newName, category = g ?: draft.category))
                    },
                    label = { Text(t(StringKey.RECURRING_NAME)) },
                    placeholder = { Text(t(StringKey.RECURRING_NAME_PLACEHOLDER)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text(
                    if (showAutoNote) t(StringKey.RECURRING_CATEGORY_AUTO_NOTE) else "",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(t(StringKey.RECURRING_TYPE), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(TransactionType.EXPENSE to t(StringKey.ADD_TXN_EXPENSE), TransactionType.INCOME to t(StringKey.ADD_TXN_INCOME)).forEach { (value, label) ->
                        RecurringTypePill(label, selected = draft.type == value) {
                            val newPool = if (value == TransactionType.INCOME) incomeCategories else expenseCategories
                            onDraftChange(draft.copy(type = value, category = newPool.first().id, userPickedCategory = false))
                        }
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(t(StringKey.ADD_TXN_CATEGORY), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    pool.forEach { c ->
                        ColorPill(
                            label = t(categoryStringKey(c.id)),
                            color = androidx.compose.ui.graphics.Color(c.color),
                            selected = draft.category == c.id,
                            onClick = { onDraftChange(draft.copy(category = c.id, userPickedCategory = true)) },
                        )
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(t(StringKey.RECURRING_AMOUNT), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                OutlinedTextField(
                    value = draft.amountText,
                    onValueChange = { onDraftChange(draft.copy(amountText = it.filter { c -> c.isDigit() })) },
                    leadingIcon = { Text("$") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    visualTransformation = ThousandsGroupingVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            if (wallets.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(t(StringKey.ADD_TXN_WALLET), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        wallets.forEach { wallet ->
                            RecurringTypePill(wallet.name, selected = draft.walletId == wallet.id) { onDraftChange(draft.copy(walletId = wallet.id)) }
                        }
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(t(StringKey.RECURRING_INTERVAL), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(
                        RecurrenceInterval.WEEKLY to t(StringKey.RECURRENCE_WEEKLY),
                        RecurrenceInterval.MONTHLY to t(StringKey.RECURRENCE_MONTHLY),
                        RecurrenceInterval.YEARLY to t(StringKey.RECURRENCE_YEARLY),
                    ).forEach { (value, label) ->
                        RecurringTypePill(label, selected = draft.interval == value) { onDraftChange(draft.copy(interval = value)) }
                    }
                }
            }

            NovaDatePickerField(
                label = t(StringKey.RECURRING_START_DATE),
                value = draft.nextDate,
                onValueChange = { onDraftChange(draft.copy(nextDate = it ?: draft.nextDate)) },
                allowClear = false,
            )

            val amount = draft.amountText.toDoubleOrNull()
            DraftSheetPrimaryButton(
                label = t(StringKey.COMMON_SAVE),
                enabled = draft.name.isNotBlank() && amount != null && amount > 0 && draft.walletId != null && draft.nextDate.isNotBlank(),
                onClick = onSave,
            )

            if (isEdit) {
                DraftSheetDeleteRow(label = t(StringKey.RECURRING_DELETE), onClick = onRequestDelete)
            }
        }
    }
}

@Composable
private fun RecurringTypePill(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        label,
        style = MaterialTheme.typography.bodySmall,
        color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onBackground,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp),
    )
}
