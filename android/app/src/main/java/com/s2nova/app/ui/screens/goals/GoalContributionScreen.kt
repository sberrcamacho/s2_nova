package com.s2nova.app.ui.screens.goals

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.NewTransactionInput
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.todayISO
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaProgressBar
import com.s2nova.app.ui.components.NovaTopBar
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import kotlinx.coroutines.launch

// A dedicated flow for moving money from a wallet straight into a goal's
// progress, separate from the general Add Transaction form — no category
// picker (goal contributions aren't a spending category, so they're
// recorded under CategoryId.OTHER without ever showing that choice), and
// an inline Snackbar "Undo" right after saving. Under the hood this is
// just a normal EXPENSE transaction with `goalId` set — the same
// mechanism AddTransactionScreen's "more options" goal chip already uses
// (backend/src/routes/goals.ts sums COMPLETED transactions by goalId) — so
// it stays editable/deletable from TransactionDetailScreen like any other
// transaction; Undo here is only a fast path for "right after I tapped
// save", not the only way to reverse it.
@Composable
fun GoalContributionScreen(
    goalId: String,
    onDone: () -> Unit,
    onBack: () -> Unit,
) {
    val t = rememberStrings()
    val format = rememberCurrencyFormatter()
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    val goals by AppContainer.goalRepository.goals.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        AppContainer.goalRepository.refresh()
        AppContainer.walletRepository.refresh()
    }

    val goal = goals.find { it.id == goalId }
    var amountText by remember { mutableStateOf("") }
    var walletId by remember(wallets) { mutableStateOf(wallets.firstOrNull()?.id) }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }

    Scaffold(
        topBar = { NovaTopBar(title = t(StringKey.GOAL_CONTRIBUTION_TITLE), onBack = onBack) },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp),
        ) {
            if (goal != null) {
                NovaCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(goal.name, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
                        Spacer(Modifier.height(6.dp))
                        Row {
                            Text(format(goal.currentAmount), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.ExtraBold)
                            Text(" / ${format(goal.targetAmount)}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(Modifier.height(8.dp))
                        val percentage = if (goal.targetAmount > 0) ((goal.currentAmount / goal.targetAmount) * 100).toInt().coerceIn(0, 100) else 0
                        NovaProgressBar(percentage = percentage, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }

            Text(
                t(StringKey.GOAL_CONTRIBUTION_AMOUNT),
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 20.dp, bottom = 6.dp),
            )
            OutlinedTextField(
                value = amountText,
                onValueChange = { amountText = it.filter { c -> c.isDigit() }; error = null },
                leadingIcon = { Text("$", fontWeight = FontWeight.Bold) },
                placeholder = { Text("0") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            )

            if (wallets.isEmpty()) {
                Text(
                    t(StringKey.ADD_TXN_NO_WALLET_SUBTITLE),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 20.dp),
                )
            } else {
                Text(
                    t(StringKey.GOAL_CONTRIBUTION_WALLET),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 20.dp, bottom = 6.dp),
                )
                Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    wallets.forEach { wallet ->
                        GoalContributionChip(label = wallet.name, selected = walletId == wallet.id, onClick = { walletId = wallet.id })
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
                        error = t(StringKey.GOAL_CONTRIBUTION_ERROR_AMOUNT)
                        return@Button
                    }
                    if (selectedWallet == null) {
                        error = t(StringKey.GOAL_CONTRIBUTION_ERROR_WALLET)
                        return@Button
                    }

                    val input = NewTransactionInput(
                        walletId = selectedWallet,
                        description = t(StringKey.GOAL_CONTRIBUTION_DESCRIPTION_PREFIX) + (goal?.name ?: ""),
                        amount = amount,
                        type = TransactionType.EXPENSE,
                        category = CategoryId.OTHER,
                        date = todayISO(),
                        goalId = goalId,
                    )

                    saving = true
                    scope.launch {
                        val created = AppContainer.transactionRepository.add(input)
                        AppContainer.walletRepository.refresh()
                        AppContainer.goalRepository.refresh()
                        saving = false

                        if (created != null) {
                            val result = snackbarHostState.showSnackbar(
                                message = t(StringKey.GOAL_CONTRIBUTION_SAVED),
                                actionLabel = t(StringKey.COMMON_UNDO),
                                duration = SnackbarDuration.Long,
                            )
                            if (result == SnackbarResult.ActionPerformed) {
                                AppContainer.transactionRepository.delete(created.id)
                                AppContainer.walletRepository.refresh()
                                AppContainer.goalRepository.refresh()
                            }
                        }
                        onDone()
                    }
                },
                enabled = !saving && wallets.isNotEmpty(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 28.dp),
            ) {
                if (saving) {
                    CircularProgressIndicator(modifier = Modifier.padding(2.dp), color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Text(t(StringKey.GOAL_CONTRIBUTION_SAVE), modifier = Modifier.padding(vertical = 6.dp))
                }
            }
        }
    }
}

@Composable
private fun GoalContributionChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        label,
        style = MaterialTheme.typography.bodyMedium,
        color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onBackground,
        maxLines = 1,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
            .border(BorderStroke(1.dp, if (selected) Color.Transparent else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)), RoundedCornerShape(50))
            .selectable(selected = selected, onClick = onClick, role = androidx.compose.ui.semantics.Role.RadioButton)
            .padding(horizontal = 14.dp, vertical = 10.dp),
    )
}
