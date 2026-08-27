package com.s2nova.app.ui.screens.addtransaction

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.data.mock.expenseCategories
import com.s2nova.app.data.mock.incomeCategories
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.LoanKind
import com.s2nova.app.data.model.NewTransactionInput
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.todayISO
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.components.CategoryIcon
import com.s2nova.app.ui.components.CategoryIconSize
import com.s2nova.app.ui.components.NovaSwitch
import com.s2nova.app.ui.components.NovaTopBar
import com.s2nova.app.ui.components.iconFor
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.screens.wallets.labelFor
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun AddTransactionScreen(
    editTransactionId: String? = null,
    onSaved: () -> Unit,
    onBack: () -> Unit,
    onAddWallet: () -> Unit,
    onOpenRecurring: () -> Unit,
) {
    val editing = editTransactionId?.let { AppContainer.transactionRepository.getById(it) }
    val t = rememberStrings()
    val hero = NovaColors.current
    val scope = rememberCoroutineScope()

    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val budgets by AppContainer.budgetRepository.budgetProgress.collectAsStateWithLifecycle()
    val goals by AppContainer.goalRepository.goals.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        AppContainer.walletRepository.refresh()
        AppContainer.budgetRepository.refresh()
        AppContainer.goalRepository.refresh()
    }

    var type by remember { mutableStateOf(editing?.type ?: TransactionType.EXPENSE) }
    var amountText by remember { mutableStateOf(editing?.amount?.toInt()?.toString() ?: "") }
    var description by remember { mutableStateOf(editing?.description ?: "") }
    var category by remember { mutableStateOf(editing?.category ?: expenseCategories.first().id) }
    var note by remember { mutableStateOf(editing?.note ?: "") }
    var walletId by remember(wallets) { mutableStateOf(editing?.walletId ?: wallets.firstOrNull()?.id) }
    var transferToWalletId by remember { mutableStateOf(editing?.transferToWalletId) }
    var budgetId by remember { mutableStateOf(editing?.budgetId) }
    var goalId by remember { mutableStateOf(editing?.goalId) }
    var isUpcoming by remember { mutableStateOf(editing?.status == TransactionStatus.PLANNED) }
    var isLoan by remember { mutableStateOf(editing?.loanKind != null) }
    var counterpartyName by remember { mutableStateOf(editing?.counterpartyName ?: "") }
    var dueDate by remember { mutableStateOf(editing?.dueDate ?: "") }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    var showCategorySheet by remember { mutableStateOf(false) }
    var showMoreOptions by remember { mutableStateOf(editing?.budgetId != null || editing?.goalId != null || isUpcoming || isLoan) }

    val categoriesForType = if (type == TransactionType.INCOME) incomeCategories else expenseCategories

    if (wallets.isEmpty()) {
        NoWalletState(onAddWallet = onAddWallet, onBack = onBack)
        return
    }

    Scaffold(
        topBar = { NovaTopBar(title = if (editing != null) t(StringKey.ADD_TXN_TITLE_EDIT) else t(StringKey.ADD_TXN_TITLE_NEW), onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
        ) {
            // Hero card: type switch (now Expense/Income/Transfer) + big
            // amount + tappable category preview — unchanged in spirit from
            // the original screen, just a third type option.
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(22.dp))
                    .background(Brush.linearGradient(listOf(hero.heroFrom, hero.heroTo)))
                    .padding(20.dp),
            ) {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(50))
                            .background(Color.White.copy(alpha = 0.08f))
                            .padding(4.dp),
                    ) {
                        listOf(
                            TransactionType.EXPENSE to t(StringKey.ADD_TXN_EXPENSE),
                            TransactionType.INCOME to t(StringKey.ADD_TXN_INCOME),
                            TransactionType.TRANSFER to t(StringKey.ADD_TXN_TRANSFER),
                        ).forEach { (txnType, label) ->
                            val selected = type == txnType
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(50))
                                    .background(if (selected) Color.White else Color.Transparent)
                                    .selectable(selected = selected, role = androidx.compose.ui.semantics.Role.RadioButton) {
                                        type = txnType
                                        if (txnType != TransactionType.TRANSFER) {
                                            val pool = if (txnType == TransactionType.INCOME) incomeCategories else expenseCategories
                                            if (categoryMap[category]?.let { it.isExpense != (txnType == TransactionType.EXPENSE) } != false) {
                                                category = pool.first().id
                                            }
                                        }
                                        if (txnType != TransactionType.EXPENSE && txnType != TransactionType.INCOME) isLoan = false
                                    }
                                    .padding(vertical = 10.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    label,
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (selected) Color(0xFF211A4D) else Color.White.copy(alpha = 0.75f),
                                    maxLines = 1,
                                )
                            }
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = 24.dp),
                    ) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.14f))
                                .clickable(enabled = type != TransactionType.TRANSFER, onClick = { showCategorySheet = true })
                                .semantics { contentDescription = t(StringKey.ADD_TXN_CHANGE_CATEGORY_CD) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(iconFor(category), contentDescription = null, tint = Color.White, modifier = Modifier.size(26.dp))
                        }
                        Column(modifier = Modifier.padding(start = 14.dp).weight(1f)) {
                            Text(
                                if (type == TransactionType.TRANSFER) t(StringKey.ADD_TXN_TRANSFER) else t(categoryStringKey(category)),
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.75f),
                                modifier = Modifier.padding(bottom = 16.dp),
                            )
                            OutlinedTextField(
                                value = amountText,
                                onValueChange = { amountText = it.filter { c -> c.isDigit() } },
                                leadingIcon = { Text("$", fontWeight = FontWeight.Bold, color = Color.White, style = MaterialTheme.typography.headlineSmall.copy(fontSize = 20.sp)) },
                                placeholder = { Text("0", color = Color.White.copy(alpha = 0.4f)) },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                textStyle = MaterialTheme.typography.headlineSmall.copy(color = Color.White, fontSize = 20.sp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedContainerColor = Color.Transparent,
                                    unfocusedContainerColor = Color.Transparent,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                    cursorColor = Color.White,
                                    focusedBorderColor = Color.White.copy(alpha = 0.6f),
                                    unfocusedBorderColor = Color.White.copy(alpha = 0.25f),
                                ),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                    }
                }
            }

            Text(t(StringKey.ADD_TXN_WALLET), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 20.dp, bottom = 6.dp))
            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                wallets.forEach { wallet ->
                    SelectChip(label = wallet.name, selected = walletId == wallet.id, onClick = {
                        walletId = wallet.id
                        if (transferToWalletId == wallet.id) transferToWalletId = null
                    })
                }
            }

            if (type == TransactionType.TRANSFER) {
                Text(t(StringKey.ADD_TXN_TRANSFER_TO), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 20.dp, bottom = 6.dp))
                Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    wallets.filter { it.id != walletId }.forEach { wallet ->
                        SelectChip(label = wallet.name, selected = transferToWalletId == wallet.id, onClick = { transferToWalletId = wallet.id })
                    }
                }
            }

            Text(t(StringKey.ADD_TXN_DESCRIPTION), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 20.dp, bottom = 6.dp))
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                placeholder = { Text(t(StringKey.ADD_TXN_DESCRIPTION_PLACEHOLDER)) },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            )

            Text(t(StringKey.ADD_TXN_NOTE), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 20.dp, bottom = 6.dp))
            OutlinedTextField(
                value = note,
                onValueChange = { note = it },
                placeholder = { Text(t(StringKey.ADD_TXN_NOTE_PLACEHOLDER)) },
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            )

            // Progressive disclosure: Budget/Goal linking, Upcoming,
            // recurrence, and Lent/Borrowed all live behind one "More
            // options" toggle so the default flow stays a 4-field quick-add.
            TextButton(onClick = { showMoreOptions = !showMoreOptions }, modifier = Modifier.padding(top = 16.dp)) {
                Text(t(StringKey.ADD_TXN_MORE_OPTIONS))
                Icon(if (showMoreOptions) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore, contentDescription = null, modifier = Modifier.padding(start = 4.dp))
            }

            if (showMoreOptions) {
                if (budgets.isNotEmpty()) {
                    Text(t(StringKey.ADD_TXN_BUDGET), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp, bottom = 6.dp))
                    Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SelectChip(label = t(StringKey.ADD_TXN_NONE), selected = budgetId == null, onClick = { budgetId = null })
                        budgets.forEach { progress ->
                            val label = progress.budget.name ?: t(categoryStringKey(progress.budget.category))
                            SelectChip(label = label, selected = budgetId == progress.budget.id, onClick = { budgetId = progress.budget.id })
                        }
                    }
                }

                if (goals.isNotEmpty()) {
                    Text(t(StringKey.ADD_TXN_GOAL), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 16.dp, bottom = 6.dp))
                    Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SelectChip(label = t(StringKey.ADD_TXN_NONE), selected = goalId == null, onClick = { goalId = null })
                        goals.forEach { goal ->
                            SelectChip(label = goal.name, selected = goalId == goal.id, onClick = { goalId = goal.id })
                        }
                    }
                }

                if (type != TransactionType.TRANSFER) {
                    ToggleRow(
                        title = t(StringKey.ADD_TXN_UPCOMING),
                        subtitle = t(StringKey.ADD_TXN_UPCOMING_HINT),
                        checked = isUpcoming,
                        onCheckedChange = { isUpcoming = it },
                    )
                }

                // Recurring (Salary, Netflix, Rent...) is a separate
                // RecurringSeries definition, not a per-transaction flag —
                // see data/model/RecurringSeries.kt doc comment. This screen
                // just points to where it's actually managed.
                Text(
                    t(StringKey.ADD_TXN_RECURRING_HINT),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(top = 16.dp).clickable(onClick = onOpenRecurring),
                )

                if (type == TransactionType.EXPENSE || type == TransactionType.INCOME) {
                    ToggleRow(
                        title = if (type == TransactionType.EXPENSE) t(StringKey.ADD_TXN_LENT) else t(StringKey.ADD_TXN_BORROWED),
                        subtitle = t(StringKey.ADD_TXN_LOAN_HINT),
                        checked = isLoan,
                        onCheckedChange = { isLoan = it },
                    )
                    if (isLoan) {
                        OutlinedTextField(
                            value = counterpartyName,
                            onValueChange = { counterpartyName = it },
                            label = { Text(t(StringKey.ADD_TXN_COUNTERPARTY)) },
                            placeholder = { Text(t(StringKey.ADD_TXN_COUNTERPARTY_PLACEHOLDER)) },
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                        )
                        OutlinedTextField(
                            value = dueDate,
                            onValueChange = { dueDate = it.filter { c -> c.isDigit() || c == '-' } },
                            label = { Text(t(StringKey.ADD_TXN_DUE_DATE)) },
                            placeholder = { Text("YYYY-MM-DD") },
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                        )
                    }
                }
            }

            if (error != null) {
                Text(error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 12.dp))
            }

            Button(
                onClick = {
                    val amount = amountText.toDoubleOrNull()
                    val selectedWallet = walletId
                    if (amount == null || amount <= 0) {
                        error = t(StringKey.ADD_TXN_ERROR_AMOUNT)
                        return@Button
                    }
                    if (description.isBlank()) {
                        error = t(StringKey.ADD_TXN_ERROR_DESCRIPTION)
                        return@Button
                    }
                    if (selectedWallet == null) {
                        error = t(StringKey.ADD_TXN_ERROR_WALLET)
                        return@Button
                    }
                    if (type == TransactionType.TRANSFER && transferToWalletId == null) {
                        error = t(StringKey.ADD_TXN_ERROR_TRANSFER_WALLET)
                        return@Button
                    }

                    val input = NewTransactionInput(
                        walletId = selectedWallet,
                        transferToWalletId = if (type == TransactionType.TRANSFER) transferToWalletId else null,
                        description = description.trim(),
                        amount = amount,
                        type = type,
                        status = if (isUpcoming) TransactionStatus.PLANNED else TransactionStatus.COMPLETED,
                        category = category,
                        date = editing?.date ?: todayISO(),
                        note = note.ifBlank { null },
                        budgetId = budgetId,
                        goalId = goalId,
                        loanKind = if (isLoan) (if (type == TransactionType.EXPENSE) LoanKind.LENT else LoanKind.BORROWED) else null,
                        counterpartyName = if (isLoan) counterpartyName.trim().ifBlank { null } else null,
                        dueDate = if (isLoan) dueDate.trim().ifBlank { null } else null,
                    )

                    saving = true
                    scope.launch {
                        if (editing != null) {
                            AppContainer.transactionRepository.update(editing.id, input)
                        } else {
                            AppContainer.transactionRepository.add(input)
                        }
                        AppContainer.walletRepository.refresh()
                        saving = false
                        onSaved()
                    }
                },
                enabled = !saving,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 8.dp),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 28.dp, bottom = 12.dp),
            ) {
                if (saving) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Text(if (editing != null) t(StringKey.ADD_TXN_SAVE_EDIT) else t(StringKey.ADD_TXN_SAVE_NEW), modifier = Modifier.padding(vertical = 6.dp))
                }
            }
        }
    }

    if (showCategorySheet) {
        ModalBottomSheet(onDismissRequest = { showCategorySheet = false }) {
            Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
                Text(
                    t(StringKey.ADD_TXN_SELECT_CATEGORY_TITLE),
                    style = MaterialTheme.typography.titleLarge.copy(fontSize = 15.sp),
                    color = MaterialTheme.colorScheme.onBackground,
                    modifier = Modifier.padding(bottom = 18.dp),
                )
                categoriesForType.chunked(4).forEach { row ->
                    Row(
                        modifier = Modifier.padding(bottom = 18.dp),
                        horizontalArrangement = Arrangement.spacedBy(18.dp),
                    ) {
                        row.forEach { cat ->
                            CategoryGridItem(
                                categoryId = cat.id,
                                label = t(categoryStringKey(cat.id)),
                                selected = category == cat.id,
                                onClick = {
                                    category = cat.id
                                    showCategorySheet = false
                                },
                                modifier = Modifier.width(68.dp),
                            )
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun NoWalletState(onAddWallet: () -> Unit, onBack: () -> Unit) {
    val t = rememberStrings()
    Scaffold(
        topBar = { NovaTopBar(title = t(StringKey.ADD_TXN_TITLE_NEW), onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(t(StringKey.ADD_TXN_NO_WALLET_TITLE), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
            Text(
                t(StringKey.ADD_TXN_NO_WALLET_SUBTITLE),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp),
            )
            Button(onClick = onAddWallet, shape = RoundedCornerShape(14.dp), modifier = Modifier.padding(top = 20.dp)) {
                Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.padding(end = 6.dp))
                Text(t(StringKey.ADD_TXN_NO_WALLET_CTA))
            }
        }
    }
}

@Composable
private fun ToggleRow(title: String, subtitle: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onBackground)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        NovaSwitch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

@Composable
private fun SelectChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        label,
        style = MaterialTheme.typography.bodyMedium,
        color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onBackground,
        maxLines = 1,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
            .border(BorderStroke(1.dp, if (selected) Color.Transparent else MaterialTheme.colorScheme.outlineVariant), RoundedCornerShape(50))
            .selectable(selected = selected, onClick = onClick, role = androidx.compose.ui.semantics.Role.RadioButton)
            .padding(horizontal = 14.dp, vertical = 10.dp),
    )
}

@Composable
private fun CategoryGridItem(
    categoryId: CategoryId,
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val categoryColor = categoryMap[categoryId]?.color?.let { Color(it) } ?: MaterialTheme.colorScheme.primary
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier.selectable(selected = selected, onClick = onClick, role = androidx.compose.ui.semantics.Role.RadioButton),
    ) {
        Box(
            modifier = if (selected) {
                Modifier
                    .border(2.dp, categoryColor, CircleShape)
                    .padding(3.dp)
            } else {
                Modifier.padding(3.dp)
            },
        ) {
            CategoryIcon(category = categoryId, size = CategoryIconSize.GRID, fillAlpha = if (selected) 0.24f else 0.16f)
        }
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onBackground,
            maxLines = 1,
            modifier = Modifier.padding(top = 6.dp),
        )
    }
}
