package com.s2nova.app.ui.screens.recurring

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material3.AlertDialog
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.mock.expenseCategories
import com.s2nova.app.data.mock.incomeCategories
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.RecurrenceInterval
import com.s2nova.app.data.model.RecurringSeries
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.model.Wallet
import com.s2nova.app.data.todayISO
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaTopBar
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
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
    var creating by remember { mutableStateOf(false) }
    var confirmingId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        AppContainer.recurringSeriesRepository.refresh()
        AppContainer.walletRepository.refresh()
    }

    Scaffold(
        topBar = {
            NovaTopBar(
                title = t(StringKey.RECURRING_TITLE),
                onBack = onBack,
                actions = { IconButton(onClick = { creating = true }) { Icon(Icons.Filled.Add, contentDescription = t(StringKey.RECURRING_NEW)) } },
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
                    NovaCard(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier.size(40.dp).clip(CircleShape).background(colors.heroFrom),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(Icons.Filled.Repeat, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                                }
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

        if (creating) {
            CreateRecurringDialog(
                wallets = wallets,
                onDismiss = { creating = false },
                onCreate = { name, type, amount, walletId, category, interval, startDate ->
                    scope.launch {
                        AppContainer.recurringSeriesRepository.create(
                            name = name,
                            type = type,
                            amount = amount,
                            walletId = walletId,
                            category = category,
                            paymentMethod = PaymentMethod.BANK_TRANSFER,
                            interval = interval,
                            startDate = startDate,
                        )
                        creating = false
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
    }
}

@Composable
private fun intervalLabel(interval: RecurrenceInterval, t: (StringKey) -> String) = when (interval) {
    RecurrenceInterval.WEEKLY -> t(StringKey.RECURRENCE_WEEKLY)
    RecurrenceInterval.MONTHLY -> t(StringKey.RECURRENCE_MONTHLY)
    RecurrenceInterval.YEARLY -> t(StringKey.RECURRENCE_YEARLY)
}

@Composable
private fun CreateRecurringDialog(
    wallets: List<Wallet>,
    onDismiss: () -> Unit,
    onCreate: (String, TransactionType, Double, String, CategoryId, RecurrenceInterval, String) -> Unit,
) {
    val t = rememberStrings()
    var name by remember { mutableStateOf("") }
    var type by remember { mutableStateOf(TransactionType.EXPENSE) }
    var amountText by remember { mutableStateOf("") }
    var walletId by remember { mutableStateOf(wallets.firstOrNull()?.id) }
    var category by remember { mutableStateOf(expenseCategories.first().id) }
    var interval by remember { mutableStateOf(RecurrenceInterval.MONTHLY) }
    var startDate by remember { mutableStateOf(todayISO()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(t(StringKey.RECURRING_NEW)) },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text(t(StringKey.RECURRING_NAME)) },
                    placeholder = { Text(t(StringKey.RECURRING_NAME_PLACEHOLDER)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(modifier = Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(TransactionType.EXPENSE to t(StringKey.ADD_TXN_EXPENSE), TransactionType.INCOME to t(StringKey.ADD_TXN_INCOME)).forEach { (value, label) ->
                        RecurringChip(label, selected = type == value) {
                            type = value
                            category = (if (value == TransactionType.INCOME) incomeCategories else expenseCategories).first().id
                        }
                    }
                }
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it.filter { c -> c.isDigit() } },
                    leadingIcon = { Text("$") },
                    label = { Text(t(StringKey.RECURRING_AMOUNT)) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                )
                if (wallets.isNotEmpty()) {
                    Text(t(StringKey.ADD_TXN_WALLET), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 10.dp, bottom = 4.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        wallets.forEach { wallet ->
                            RecurringChip(wallet.name, selected = walletId == wallet.id) { walletId = wallet.id }
                        }
                    }
                }
                Text(t(StringKey.RECURRING_INTERVAL), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 10.dp, bottom = 4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(
                        RecurrenceInterval.WEEKLY to t(StringKey.RECURRENCE_WEEKLY),
                        RecurrenceInterval.MONTHLY to t(StringKey.RECURRENCE_MONTHLY),
                        RecurrenceInterval.YEARLY to t(StringKey.RECURRENCE_YEARLY),
                    ).forEach { (value, label) ->
                        RecurringChip(label, selected = interval == value) { interval = value }
                    }
                }
                OutlinedTextField(
                    value = startDate,
                    onValueChange = { startDate = it.filter { c -> c.isDigit() || c == '-' } },
                    label = { Text(t(StringKey.RECURRING_START_DATE)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val amount = amountText.toDoubleOrNull()
                val wallet = walletId
                if (name.isNotBlank() && amount != null && amount > 0 && wallet != null && startDate.isNotBlank()) {
                    onCreate(name.trim(), type, amount, wallet, category, interval, startDate)
                }
            }) { Text(t(StringKey.RECURRING_CREATE)) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(t(StringKey.COMMON_CANCEL)) } },
    )
}

@Composable
private fun RecurringChip(label: String, selected: Boolean, onClick: () -> Unit) {
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
