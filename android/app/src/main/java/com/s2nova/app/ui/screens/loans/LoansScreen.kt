package com.s2nova.app.ui.screens.loans

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.LoanKind
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.Wallet
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.ThousandsGroupingVisualTransformation
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaDatePickerField
import com.s2nova.app.ui.components.NovaProgressBar
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch

// The third tab of Planes (see PlanesScreen.kt) — absorbs what used to be a
// standalone stacked screen reachable from Profile. Prestado/Recibido is a
// segmented control, not another underlined tab row, so it visually reads
// as a sub-filter of this tab rather than a sibling of Presupuestos/Metas/
// Préstamos (see design_handoff_s2_nova_overview/ANDROID.md).
@Composable
fun LoansTab() {
    val transactions by AppContainer.transactionRepository.transactions.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val colors = NovaColors.current
    val scope = rememberCoroutineScope()

    var side by remember { mutableStateOf(LoanKind.LENT) }
    var draft by remember { mutableStateOf<LoanDraft?>(null) }
    var payingFor by remember { mutableStateOf<Transaction?>(null) }
    var deleting by remember { mutableStateOf<Transaction?>(null) }

    val items = transactions.filter { it.loanKind == side }.sortedByDescending { it.date }
    val outstandingTotal = items.filter { !it.loanSettled }.sumOf { AppContainer.transactionRepository.outstandingFor(it) }
    val settledCount = items.count { it.loanSettled }
    val recordWord = if (items.size == 1) t(StringKey.LOANS_RECORD_ONE) else t(StringKey.LOANS_RECORD_MANY)
    val settledWord = if (settledCount == 1) t(StringKey.LOANS_SETTLED_WORD_ONE) else t(StringKey.LOANS_SETTLED_WORD_MANY)

    LazyColumn(
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SegmentedPills(
                options = listOf(LoanKind.LENT to t(StringKey.LOANS_LENT_TAB), LoanKind.BORROWED to t(StringKey.LOANS_BORROWED_TAB)),
                selected = side,
                onSelect = { side = it },
            )
        }

        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(20.dp))
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(20.dp))
                    .padding(20.dp),
            ) {
                Text(
                    if (side == LoanKind.LENT) t(StringKey.LOANS_SUMMARY_LENT) else t(StringKey.LOANS_SUMMARY_BORROWED),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(format(outstandingTotal), style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(top = 4.dp))
                Text(
                    "${items.size} $recordWord · $settledCount $settledWord",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }

        item {
            DashedNewRow(
                label = if (side == LoanKind.LENT) t(StringKey.LOANS_NEW_LENT) else t(StringKey.LOANS_NEW_BORROWED),
                onClick = {
                    draft = LoanDraft(id = null, side = side, counterparty = "", amountText = "", walletId = wallets.firstOrNull()?.id, dueDate = null)
                },
            )
        }

        if (items.isEmpty()) {
            item {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(Icons.Filled.MonetizationOn, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(t(StringKey.LOANS_EMPTY), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 12.dp))
                }
            }
        } else {
            items(items, key = { it.id }) { txn ->
                LoanCard(
                    txn = txn,
                    format = format,
                    t = t,
                    colors = colors,
                    outstanding = AppContainer.transactionRepository.outstandingFor(txn),
                    onPay = { payingFor = txn },
                    onEdit = {
                        draft = LoanDraft(
                            id = txn.id,
                            side = txn.loanKind ?: side,
                            counterparty = txn.counterpartyName ?: "",
                            amountText = txn.amount.toLong().toString(),
                            walletId = txn.walletId,
                            dueDate = txn.dueDate,
                        )
                    },
                )
            }
        }

        item { Spacer(Modifier.height(72.dp)) }
    }

    val d = draft
    if (d != null) {
        LoanDraftSheet(
            draft = d,
            wallets = wallets,
            onDraftChange = { draft = it },
            onDismiss = { draft = null },
            onSave = {
                val amount = d.amountText.toDoubleOrNull()
                val walletId = d.walletId
                if (amount != null && amount > 0 && walletId != null) {
                    val counterparty = d.counterparty.trim().ifBlank { null }
                    if (d.id == null) {
                        scope.launch {
                            AppContainer.transactionRepository.add(
                                com.s2nova.app.data.model.NewTransactionInput(
                                    walletId = walletId,
                                    description = counterparty?.let { "${if (d.side == LoanKind.LENT) "Préstamo a" else "Deuda con"} $it" } ?: t(StringKey.LOANS_TITLE),
                                    amount = amount,
                                    type = if (d.side == LoanKind.LENT) com.s2nova.app.data.model.TransactionType.EXPENSE else com.s2nova.app.data.model.TransactionType.INCOME,
                                    category = com.s2nova.app.data.model.CategoryId.OTHER,
                                    date = com.s2nova.app.data.todayISO(),
                                    loanKind = d.side,
                                    counterpartyName = counterparty,
                                    dueDate = d.dueDate,
                                ),
                            )
                            AppContainer.walletRepository.refresh()
                            side = d.side
                        }
                    } else {
                        scope.launch {
                            AppContainer.transactionRepository.updateLoan(d.id, amount, walletId, d.side, counterparty, d.dueDate)
                            AppContainer.walletRepository.refresh()
                            side = d.side
                        }
                    }
                    draft = null
                }
            },
            onRequestDelete = {
                val target = items.firstOrNull { it.id == d.id }
                if (target != null) {
                    deleting = target
                    draft = null
                }
            },
        )
    }

    if (payingFor != null) {
        val target = payingFor!!
        LoanPaySheet(
            loan = target,
            outstanding = AppContainer.transactionRepository.outstandingFor(target),
            wallets = wallets,
            onDismiss = { payingFor = null },
            onConfirm = { amount, walletId ->
                scope.launch {
                    AppContainer.transactionRepository.settleLoan(target.id, amount, walletId)
                    AppContainer.walletRepository.refresh()
                }
                payingFor = null
            },
        )
    }

    if (deleting != null) {
        val target = deleting!!
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text(t(StringKey.LOANS_DELETE_CONFIRM_TITLE)) },
            text = { Text(t(StringKey.LOANS_DELETE_CONFIRM_BODY)) },
            confirmButton = {
                TextButton(onClick = {
                    scope.launch { AppContainer.transactionRepository.delete(target.id) }
                    deleting = null
                }) { Text(t(StringKey.LOANS_DELETE), color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text(t(StringKey.COMMON_CANCEL)) } },
        )
    }
}

@Composable
private fun <T> SegmentedPills(options: List<Pair<T, String>>, selected: T, onSelect: (T) -> Unit) {
    Row(
        modifier = Modifier
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(999.dp))
            .padding(3.dp),
    ) {
        options.forEach { (value, label) ->
            val isSelected = value == selected
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent)
                    .clickable { onSelect(value) }
                    .padding(horizontal = 16.dp, vertical = 8.dp),
            ) {
                Text(
                    label,
                    color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                )
            }
        }
    }
}

@Composable
private fun DashedNewRow(label: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .dashedBorder(MaterialTheme.colorScheme.primary)
            .clickable(onClick = onClick)
            .padding(16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.Add, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(end = 6.dp))
            Text(label, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun LoanCard(
    txn: Transaction,
    format: com.s2nova.app.ui.CurrencyFormatter,
    t: (StringKey) -> String,
    colors: com.s2nova.app.ui.theme.NovaExtraColors,
    outstanding: Double,
    onPay: () -> Unit,
    onEdit: () -> Unit,
) {
    NovaCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(txn.counterpartyName ?: txn.description, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
                    Text(
                        if (txn.dueDate != null) "${t(StringKey.LOANS_DUE)} ${txn.dueDate}" else t(StringKey.LOANS_NO_DUE_DATE),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(format(outstanding), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
            }
            Spacer(Modifier.height(10.dp))
            val paid = txn.amount - outstanding
            NovaProgressBar(
                percentage = if (txn.amount > 0) ((paid / txn.amount) * 100).toInt().coerceIn(0, 100) else 0,
                color = if (txn.loanSettled) colors.positive else MaterialTheme.colorScheme.primary,
            )
            Text(
                "${t(StringKey.LOANS_PAID_PREFIX)} ${format(paid)} de ${format(txn.amount)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 6.dp),
            )
            Spacer(Modifier.height(8.dp))
            if (txn.loanSettled) {
                Text(t(StringKey.LOANS_SETTLED), style = MaterialTheme.typography.labelMedium, color = colors.positive, fontWeight = FontWeight.Bold)
            } else {
                Row {
                    TextButton(onClick = onPay) { Text(t(StringKey.LOANS_REGISTER_PAYMENT)) }
                    TextButton(onClick = onEdit) { Text(t(StringKey.LOANS_EDIT_ACTION)) }
                }
            }
        }
    }
}

// Draft state backing the loan create/edit sheet. `id == null` means
// "creating" (id is the underlying Transaction's id, since a loan is just
// a transaction with loanKind set — see TransactionRepository).
private data class LoanDraft(
    val id: String?,
    val side: LoanKind,
    val counterparty: String,
    val amountText: String,
    val walletId: String?,
    val dueDate: String?,
)

@Composable
private fun LoanChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        label,
        style = MaterialTheme.typography.bodyMedium,
        color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onBackground,
        maxLines = 1,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
            .border(1.dp, if (selected) Color.Transparent else MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(50))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 10.dp),
    )
}

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
private fun LoanDraftSheet(
    draft: LoanDraft,
    wallets: List<Wallet>,
    onDraftChange: (LoanDraft) -> Unit,
    onDismiss: () -> Unit,
    onSave: () -> Unit,
    onRequestDelete: () -> Unit,
) {
    val t = rememberStrings()
    val isEdit = draft.id != null
    val isLent = draft.side == LoanKind.LENT

    com.s2nova.app.ui.components.NovaDraftSheet(
        onDismiss = onDismiss,
        title = t(if (isEdit) StringKey.LOANS_EDIT_TITLE else if (isLent) StringKey.LOANS_NEW_LENT else StringKey.LOANS_NEW_BORROWED),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            SegmentedPills(
                options = listOf(LoanKind.LENT to t(StringKey.LOANS_LENT_TAB), LoanKind.BORROWED to t(StringKey.LOANS_BORROWED_TAB)),
                selected = draft.side,
                onSelect = { onDraftChange(draft.copy(side = it)) },
            )
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    t(if (isLent) StringKey.LOANS_FORM_PERSON_LENT else StringKey.LOANS_FORM_PERSON_BORROWED),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                OutlinedTextField(
                    value = draft.counterparty,
                    onValueChange = { onDraftChange(draft.copy(counterparty = it)) },
                    placeholder = { Text(t(StringKey.LOANS_FORM_COUNTERPARTY_PLACEHOLDER)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(t(StringKey.LOANS_FORM_AMOUNT), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                    Text(
                        t(if (isLent) StringKey.LOANS_FORM_WALLET_LENT else StringKey.LOANS_FORM_WALLET_BORROWED),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    androidx.compose.foundation.layout.FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        wallets.forEach { wallet ->
                            LoanChip(label = wallet.name, selected = draft.walletId == wallet.id, onClick = { onDraftChange(draft.copy(walletId = wallet.id)) })
                        }
                    }
                }
            }
            NovaDatePickerField(
                label = t(StringKey.LOANS_FORM_DUE_DATE),
                value = draft.dueDate,
                onValueChange = { onDraftChange(draft.copy(dueDate = it)) },
                allowClear = true,
            )

            val amount = draft.amountText.toDoubleOrNull()
            com.s2nova.app.ui.components.DraftSheetPrimaryButton(
                label = t(StringKey.COMMON_SAVE),
                enabled = amount != null && amount > 0 && draft.walletId != null,
                onClick = onSave,
            )

            if (isEdit) {
                com.s2nova.app.ui.components.DraftSheetDeleteRow(label = t(StringKey.LOANS_DELETE), onClick = onRequestDelete)
            }
        }
    }
}

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
private fun LoanPaySheet(
    loan: Transaction,
    outstanding: Double,
    wallets: List<Wallet>,
    onDismiss: () -> Unit,
    onConfirm: (amount: Double, walletId: String) -> Unit,
) {
    val t = rememberStrings()
    val format = rememberCurrencyFormatter()
    var amountText by remember { mutableStateOf(outstanding.toLong().toString()) }
    var walletId by remember { mutableStateOf(loan.walletId.takeIf { wallets.any { w -> w.id == it } } ?: wallets.firstOrNull()?.id) }

    com.s2nova.app.ui.components.NovaDraftSheet(onDismiss = onDismiss, title = t(StringKey.LOANS_PAYMENT_TITLE)) {
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Text(
                "${t(StringKey.LOANS_OUTSTANDING)}: ${format(outstanding)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(t(StringKey.LOANS_FORM_AMOUNT), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                    Text(
                        t(StringKey.LOANS_SETTLE_ALL_SHORTCUT),
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.clickable { amountText = outstanding.toLong().toString() },
                    )
                }
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it.filter { c -> c.isDigit() } },
                    leadingIcon = { Text("$") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    visualTransformation = ThousandsGroupingVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    if (loan.loanKind == LoanKind.LENT) t(StringKey.LOANS_PAYMENT_WALLET_LENT) else t(StringKey.LOANS_PAYMENT_WALLET_BORROWED),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                androidx.compose.foundation.layout.FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    wallets.forEach { wallet ->
                        LoanChip(label = wallet.name, selected = walletId == wallet.id, onClick = { walletId = wallet.id })
                    }
                }
            }
            val amount = amountText.toDoubleOrNull()
            com.s2nova.app.ui.components.DraftSheetPrimaryButton(
                label = t(StringKey.LOANS_REGISTER_PAYMENT),
                enabled = amount != null && amount > 0 && amount <= outstanding && walletId != null,
                onClick = { onConfirm(amount!!, walletId!!) },
            )
        }
    }
}

private fun Modifier.dashedBorder(color: Color): Modifier = this.drawBehind {
    val strokeWidth = 1.5.dp.toPx()
    val cornerRadius = 16.dp.toPx()
    drawRoundRect(
        color = color,
        style = androidx.compose.ui.graphics.drawscope.Stroke(
            width = strokeWidth,
            pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(8f, 6f), 0f),
        ),
        cornerRadius = androidx.compose.ui.geometry.CornerRadius(cornerRadius, cornerRadius),
    )
}
