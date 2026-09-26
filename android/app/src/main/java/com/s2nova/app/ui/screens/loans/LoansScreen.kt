package com.s2nova.app.ui.screens.loans

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.LoanKind
import com.s2nova.app.data.model.NewTransactionInput
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.model.Wallet
import com.s2nova.app.data.todayISO
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.DashedNewRow
import com.s2nova.app.ui.components.DraftSheetDeleteRow
import com.s2nova.app.ui.components.DraftSheetPrimaryButton
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.NovaProgressBar
import com.s2nova.app.ui.components.SheetAmountBox
import com.s2nova.app.ui.components.SheetBox
import com.s2nova.app.ui.components.SheetDateBox
import com.s2nova.app.ui.components.SheetInput
import com.s2nova.app.ui.components.SheetLabel
import com.s2nova.app.ui.components.SheetPill
import com.s2nova.app.ui.components.shortWalletName
import com.s2nova.app.ui.rememberAppLanguage
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.shortDateLabel
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch

// Planes › Préstamos, per the Android v2 mockup: Prestado/Recibido pills,
// the "Te deben"/"Debes" summary, "+ Registrar préstamo/deuda" and one card
// per loan with "Registrar abono" (or "Saldado") and "Editar". A loan is a
// transaction with loanKind set; abonos go through the backend's
// settle-loan, which records them as opposite-direction movements.
@Composable
fun LoansTab(initialSide: LoanKind = LoanKind.LENT) {
    val transactions by AppContainer.transactionRepository.transactions.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val colors = NovaColors.current
    val scope = rememberCoroutineScope()

    var side by remember(initialSide) { mutableStateOf(initialSide) }
    var draft by remember { mutableStateOf<LoanDraft?>(null) }
    var payingFor by remember { mutableStateOf<Transaction?>(null) }
    var deleting by remember { mutableStateOf<Transaction?>(null) }

    val items = transactions.filter { it.loanKind == side }.sortedByDescending { it.date }
    val outstandingTotal = items.filter { !it.loanSettled }.sumOf { AppContainer.transactionRepository.outstandingFor(it) }
    val settledCount = items.count { it.loanSettled }
    val recordWord = if (items.size == 1) t(StringKey.LOANS_RECORD_ONE) else t(StringKey.LOANS_RECORD_MANY)
    val settledWord = if (settledCount == 1) t(StringKey.LOANS_SETTLED_WORD_ONE) else t(StringKey.LOANS_SETTLED_WORD_MANY)

    LazyColumn(
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(LoanKind.LENT to t(StringKey.LOANS_LENT_TAB), LoanKind.BORROWED to t(StringKey.LOANS_BORROWED_TAB)).forEach { (value, label) ->
                    SheetPill(label, selected = side == value) { side = value }
                }
            }
        }

        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(18.dp))
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(18.dp))
                    .padding(horizontal = 18.dp, vertical = 16.dp),
            ) {
                Text(t(if (side == LoanKind.LENT) StringKey.LOANS_SUMMARY_LENT else StringKey.LOANS_SUMMARY_BORROWED), fontSize = 11.sp, color = colors.textDim)
                Text(
                    format(outstandingTotal),
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = (-0.6).sp,
                    color = MaterialTheme.colorScheme.onBackground,
                    modifier = Modifier.padding(top = 3.dp),
                )
                Text(
                    "${items.size} $recordWord · $settledCount $settledWord",
                    fontSize = 11.sp,
                    color = colors.textDim,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
        }

        item {
            DashedNewRow(
                label = t(if (side == LoanKind.LENT) StringKey.LOANS_NEW_LENT else StringKey.LOANS_NEW_BORROWED),
                onClick = {
                    draft = LoanDraft(id = null, side = side, counterparty = "", amountText = "", walletId = wallets.firstOrNull()?.id, dueDate = null)
                },
            )
        }

        items(items, key = { it.id }) { txn ->
            LoanCard(
                txn = txn,
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

        if (items.isEmpty()) {
            item {
                Text(
                    t(if (side == LoanKind.LENT) StringKey.LOANS_EMPTY_LENT else StringKey.LOANS_EMPTY_BORROWED),
                    fontSize = 12.5.sp,
                    lineHeight = 19.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 24.dp),
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
                if (amount != null && amount > 0 && walletId != null && d.counterparty.isNotBlank()) {
                    val counterparty = d.counterparty.trim()
                    scope.launch {
                        runCatching {
                            if (d.id == null) {
                                AppContainer.transactionRepository.add(
                                    NewTransactionInput(
                                        walletId = walletId,
                                        description = "${if (d.side == LoanKind.LENT) "Préstamo a" else "Deuda con"} $counterparty",
                                        amount = amount,
                                        type = if (d.side == LoanKind.LENT) TransactionType.EXPENSE else TransactionType.INCOME,
                                        category = "exp.other",
                                        date = todayISO(),
                                        loanKind = d.side,
                                        counterpartyName = counterparty,
                                        dueDate = d.dueDate,
                                    ),
                                )
                            } else {
                                AppContainer.transactionRepository.updateLoan(d.id, amount, walletId, d.side, counterparty, d.dueDate)
                            }
                        }
                        runCatching { AppContainer.walletRepository.refresh() }
                        side = d.side
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

    val paying = payingFor
    if (paying != null) {
        LoanPaySheet(
            loan = paying,
            outstanding = AppContainer.transactionRepository.outstandingFor(paying),
            wallets = wallets,
            onDismiss = { payingFor = null },
            onConfirm = { amount, walletId ->
                scope.launch {
                    runCatching { AppContainer.transactionRepository.settleLoan(paying.id, amount, walletId) }
                    runCatching { AppContainer.walletRepository.refresh() }
                }
                payingFor = null
            },
        )
    }

    val toDelete = deleting
    if (toDelete != null) {
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text(t(StringKey.LOANS_DELETE_CONFIRM_TITLE)) },
            text = { Text(t(StringKey.LOANS_DELETE_CONFIRM_BODY)) },
            confirmButton = {
                TextButton(onClick = {
                    scope.launch {
                        runCatching { AppContainer.transactionRepository.delete(toDelete.id) }
                        runCatching { AppContainer.walletRepository.refresh() }
                    }
                    deleting = null
                }) { Text(t(StringKey.LOANS_DELETE), color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text(t(StringKey.COMMON_CANCEL)) } },
        )
    }
}

// Mockup loan card: person and due line, the outstanding amount (the
// principal, dimmed, once settled), a 6dp paid bar, then the actions.
@Composable
private fun LoanCard(txn: Transaction, outstanding: Double, onPay: () -> Unit, onEdit: () -> Unit) {
    val colors = NovaColors.current
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val language = rememberAppLanguage()
    val paid = txn.amount - outstanding
    val due = if (txn.loanSettled) {
        String.format(t(StringKey.LOANS_SETTLED_NOTE), format(txn.amount))
    } else {
        val base = txn.dueDate?.let { "${t(StringKey.LOANS_DUE)} ${shortDateLabel(it, language)}" } ?: t(StringKey.LOANS_NO_DUE_DATE)
        base + if (paid > 0) String.format(t(StringKey.LOANS_PAID_NOTE), format(paid), format(txn.amount)) else ""
    }
    val shape = RoundedCornerShape(18.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, shape)
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(txn.counterpartyName ?: txn.description, fontSize = 13.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                Text(due, fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp))
            }
            Text(
                format(if (txn.loanSettled) txn.amount else outstanding),
                fontSize = 14.5.sp,
                fontWeight = FontWeight.ExtraBold,
                color = if (txn.loanSettled) colors.textDim else MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(start = 12.dp),
            )
        }
        NovaProgressBar(
            percentage = if (txn.amount > 0) ((paid / txn.amount) * 100).toInt().coerceIn(0, 100) else 0,
            color = if (txn.loanSettled) colors.positive else MaterialTheme.colorScheme.primary,
            height = 6.dp,
            cornerRadius = 3.dp,
            modifier = Modifier.padding(top = 12.dp),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.padding(top = 12.dp)) {
            if (txn.loanSettled) {
                Text(t(StringKey.LOANS_SETTLED), fontSize = 12.5.sp, fontWeight = FontWeight.Bold, color = colors.positive)
            } else {
                Text(
                    t(StringKey.LOANS_REGISTER_PAYMENT),
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.clickable(onClick = onPay),
                )
            }
            Text(
                t(StringKey.LOANS_EDIT_ACTION),
                fontSize = 12.5.sp,
                fontWeight = FontWeight.Bold,
                color = colors.accentText,
                modifier = Modifier.clickable(onClick = onEdit),
            )
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

// Mockup loanSheet: Dirección, the counterparty, Monto, the wallet the
// money left or entered, and an optional due date.
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
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

    NovaDraftSheet(
        onDismiss = onDismiss,
        title = t(if (isEdit) StringKey.LOANS_EDIT_TITLE else if (isLent) StringKey.LOANS_NEW_LENT else StringKey.LOANS_NEW_BORROWED),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Column {
                SheetLabel(t(StringKey.LOANS_DIRECTION))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(LoanKind.LENT to t(StringKey.LOANS_LENT_TAB), LoanKind.BORROWED to t(StringKey.LOANS_BORROWED_TAB)).forEach { (value, label) ->
                        SheetPill(label, selected = draft.side == value) { onDraftChange(draft.copy(side = value)) }
                    }
                }
            }
            Column {
                SheetLabel(t(if (isLent) StringKey.LOANS_FORM_PERSON_LENT else StringKey.LOANS_FORM_PERSON_BORROWED))
                SheetBox(padding = PaddingValues(horizontal = 14.dp, vertical = 15.dp)) {
                    SheetInput(
                        value = draft.counterparty,
                        onValueChange = { onDraftChange(draft.copy(counterparty = it)) },
                        placeholder = t(StringKey.LOANS_FORM_COUNTERPARTY_PLACEHOLDER),
                        style = TextStyle(fontSize = 13.5.sp, fontWeight = FontWeight.Bold),
                    )
                }
            }
            Column {
                SheetLabel(t(StringKey.LOANS_FORM_AMOUNT))
                SheetAmountBox(draft.amountText) { onDraftChange(draft.copy(amountText = it)) }
            }
            if (wallets.isNotEmpty()) {
                Column {
                    SheetLabel(t(if (isLent) StringKey.LOANS_FORM_WALLET_LENT else StringKey.LOANS_FORM_WALLET_BORROWED))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        wallets.forEach { wallet ->
                            SheetPill(shortWalletName(wallet.name), selected = draft.walletId == wallet.id) { onDraftChange(draft.copy(walletId = wallet.id)) }
                        }
                    }
                }
            }
            Column {
                SheetLabel(t(StringKey.LOANS_DUE_OPTIONAL))
                SheetDateBox(value = draft.dueDate, placeholder = t(StringKey.LOANS_NO_DATE), allowClear = true) { onDraftChange(draft.copy(dueDate = it)) }
            }

            val amount = draft.amountText.toDoubleOrNull()
            DraftSheetPrimaryButton(
                label = t(StringKey.COMMON_SAVE),
                enabled = draft.counterparty.isNotBlank() && amount != null && amount > 0 && draft.walletId != null,
                onClick = onSave,
            )

            if (isEdit) {
                DraftSheetDeleteRow(label = t(StringKey.LOANS_DELETE), onClick = onRequestDelete)
            }
        }
    }
}

// Mockup loanPay: the amount starts at the outstanding balance ("Saldar
// todo" restores it) and can't exceed it; the wallet receives or pays.
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
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
    val colors = NovaColors.current
    val isLent = loan.loanKind == LoanKind.LENT
    val person = loan.counterpartyName ?: loan.description
    var amountText by remember { mutableStateOf(outstanding.toLong().toString()) }
    var walletId by remember { mutableStateOf(loan.walletId.takeIf { wallets.any { w -> w.id == it } } ?: wallets.firstOrNull()?.id) }

    NovaDraftSheet(
        onDismiss = onDismiss,
        title = String.format(t(if (isLent) StringKey.LOANS_PAY_TITLE_LENT else StringKey.LOANS_PAY_TITLE_BORROWED), person),
        subtitle = buildAnnotatedString { append(String.format(t(StringKey.LOANS_PAY_NOTE), format(outstanding), format(loan.amount))) },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 8.dp)) {
                    Text(
                        t(StringKey.GOAL_CONTRIBUTION_AMOUNT),
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        t(StringKey.LOANS_SETTLE_ALL_SHORTCUT),
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = colors.accentText,
                        modifier = Modifier.clickable { amountText = outstanding.toLong().toString() },
                    )
                }
                SheetAmountBox(amountText) { amountText = it }
            }
            Column {
                SheetLabel(t(if (isLent) StringKey.LOANS_PAYMENT_WALLET_LENT else StringKey.LOANS_PAYMENT_WALLET_BORROWED))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    wallets.forEach { wallet ->
                        SheetPill(shortWalletName(wallet.name), selected = walletId == wallet.id) { walletId = wallet.id }
                    }
                }
            }
            val amount = amountText.toDoubleOrNull()
            DraftSheetPrimaryButton(
                label = t(StringKey.LOANS_REGISTER_PAYMENT),
                enabled = amount != null && amount > 0 && amount <= outstanding && walletId != null,
                onClick = { onConfirm(amount!!, walletId!!) },
            )
        }
    }
}
