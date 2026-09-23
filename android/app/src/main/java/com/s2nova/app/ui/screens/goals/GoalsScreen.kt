package com.s2nova.app.ui.screens.goals

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.Goal
import com.s2nova.app.data.model.NewTransactionInput
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.model.Wallet
import com.s2nova.app.data.remote.toUserMessage
import com.s2nova.app.data.todayISO
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.ThousandsGroupingVisualTransformation
import com.s2nova.app.ui.components.DashedNewRow
import com.s2nova.app.ui.components.DraftSheetDeleteRow
import com.s2nova.app.ui.components.DraftSheetPrimaryButton
import com.s2nova.app.ui.components.GoalCategoryId
import com.s2nova.app.ui.components.GoalCategoryPicker
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.NovaProgressRing
import com.s2nova.app.ui.components.goalCategories
import com.s2nova.app.ui.components.goalCategoryFor
import com.s2nova.app.ui.components.suggestGoalCategory
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch

// Goals ("Car Payment", etc.) live as a second tab alongside Budgets
// rather than a new bottom-nav destination — both are "plan ahead"
// concepts, and the brief prioritizes keeping Android's navigation
// unchanged over adding a new top-level surface for a single new screen.
@Composable
fun GoalsTab(snackbarHostState: SnackbarHostState) {
    val goals by AppContainer.goalRepository.goals.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val scope = rememberCoroutineScope()
    var draft by remember { mutableStateOf<GoalDraft?>(null) }
    var paying by remember { mutableStateOf<Goal?>(null) }
    var deleting by remember { mutableStateOf<Goal?>(null) }

    LaunchedEffect(Unit) {
        runCatching { AppContainer.goalRepository.refresh() }
        runCatching { AppContainer.walletRepository.refresh() }
    }

    LazyColumn(
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            DashedNewRow(
                label = t(StringKey.GOALS_NEW),
                onClick = { draft = GoalDraft(id = null, name = "", category = GoalCategoryId.OTHER, userPickedCategory = false, targetText = "") },
            )
        }

        if (goals.isEmpty()) {
            item {
                Text(
                    t(StringKey.GOALS_EMPTY),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 24.dp),
                )
            }
        }

        items(goals) { goal ->
            val category = goalCategoryFor(goal.themeIcon) ?: goalCategories.last()
            NovaCard(
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    draft = GoalDraft(
                        id = goal.id,
                        name = goal.name,
                        category = category.id,
                        userPickedCategory = true,
                        targetText = goal.targetAmount.toInt().toString(),
                    )
                },
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    val percentage = goal.percentage.coerceIn(0, 100)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        // The ring's fill sweep is the percentage; its center
                        // shows the goal's category icon instead — see
                        // ANDROID.md's "the ring itself is the percentage".
                        NovaProgressRing(
                            percentage = percentage,
                            color = Color(category.color),
                            centerContent = {
                                Icon(category.icon, contentDescription = null, tint = Color(category.color), modifier = Modifier.size(22.dp))
                            },
                        )
                        Column(modifier = Modifier.weight(1f).padding(start = 16.dp)) {
                            Text(goal.name, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
                            Row(modifier = Modifier.padding(top = 4.dp)) {
                                Text(format(goal.currentAmount), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.ExtraBold)
                                Text(" / ${format(goal.targetAmount)}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                    Button(
                        onClick = { paying = goal },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                    ) { Text(t(StringKey.GOALS_CONTRIBUTE)) }
                }
            }
        }

        item { Spacer(Modifier.height(72.dp)) }
    }

    val d = draft
    if (d != null) {
        GoalDraftSheet(
            draft = d,
            onDraftChange = { draft = it },
            onDismiss = { draft = null },
            onSave = {
                val target = d.targetText.toDoubleOrNull()
                if (d.name.isNotBlank() && target != null && target > 0) {
                    scope.launch {
                        if (d.id == null) {
                            AppContainer.goalRepository.create(d.name.trim(), target, themeIcon = d.category.name)
                        } else {
                            AppContainer.goalRepository.update(d.id, d.name.trim(), target, themeIcon = d.category.name)
                        }
                    }
                    draft = null
                }
            },
            onRequestDelete = {
                val goal = goals.firstOrNull { it.id == d.id }
                if (goal != null) {
                    deleting = goal
                    draft = null
                }
            },
        )
    }

    val goalToDelete = deleting
    if (goalToDelete != null) {
        GoalDeleteSheet(
            goal = goalToDelete,
            wallets = wallets,
            onDismiss = { deleting = null },
            onConfirm = { destinationWalletId ->
                scope.launch {
                    try {
                        AppContainer.goalRepository.delete(goalToDelete.id, destinationWalletId)
                        if (destinationWalletId != null) AppContainer.walletRepository.refresh()
                        deleting = null
                    } catch (error: Exception) {
                        snackbarHostState.showSnackbar(error.toUserMessage(t(StringKey.GOALS_DELETE_ERROR)))
                    }
                }
            },
        )
    }

    val goalToPay = paying
    if (goalToPay != null) {
        GoalPaySheet(
            goal = goalToPay,
            wallets = wallets,
            snackbarHostState = snackbarHostState,
            onDismiss = { paying = null },
        )
    }
}

// Draft state backing the goal create/edit sheet. `id == null` means
// "creating".
private data class GoalDraft(
    val id: String?,
    val name: String,
    val category: GoalCategoryId,
    val userPickedCategory: Boolean,
    val targetText: String,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GoalDraftSheet(
    draft: GoalDraft,
    onDraftChange: (GoalDraft) -> Unit,
    onDismiss: () -> Unit,
    onSave: () -> Unit,
    onRequestDelete: () -> Unit,
) {
    val t = rememberStrings()
    val isEdit = draft.id != null
    val category = goalCategories.first { it.id == draft.category }
    val color = Color(category.color)
    val guessed = suggestGoalCategory(draft.name)
    val showAutoNote = !draft.userPickedCategory && guessed != null

    NovaDraftSheet(
        onDismiss = onDismiss,
        title = t(if (isEdit) StringKey.GOALS_EDIT_TITLE else StringKey.GOALS_NEW),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(
                        modifier = Modifier.size(40.dp).clip(CircleShape).background(color.copy(alpha = 0.29f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(category.icon, contentDescription = null, tint = color, modifier = Modifier.size(18.dp))
                    }
                    OutlinedTextField(
                        value = draft.name,
                        onValueChange = { newName ->
                            val g = if (!draft.userPickedCategory) suggestGoalCategory(newName) else null
                            onDraftChange(draft.copy(name = newName, category = g ?: draft.category))
                        },
                        label = { Text(t(StringKey.GOALS_NAME)) },
                        placeholder = { Text(t(StringKey.GOALS_NAME_PLACEHOLDER)) },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                }
                Text(
                    if (showAutoNote) t(StringKey.BUDGETS_CATEGORY_AUTO_NOTE) else t(StringKey.GOALS_THEME_LABEL),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(t(StringKey.GOALS_THEME_LABEL), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                GoalCategoryPicker(
                    selected = draft.category,
                    onSelect = { onDraftChange(draft.copy(category = it, userPickedCategory = true)) },
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(t(StringKey.GOALS_TARGET_AMOUNT), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                OutlinedTextField(
                    value = draft.targetText,
                    onValueChange = { onDraftChange(draft.copy(targetText = it.filter { c -> c.isDigit() })) },
                    leadingIcon = { Text("$") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    visualTransformation = ThousandsGroupingVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            DraftSheetPrimaryButton(
                label = t(StringKey.COMMON_SAVE),
                enabled = draft.name.isNotBlank() && (draft.targetText.toDoubleOrNull() ?: 0.0) > 0,
                onClick = onSave,
            )

            if (isEdit) {
                DraftSheetDeleteRow(label = t(StringKey.GOALS_DELETE), onClick = onRequestDelete)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GoalDeleteSheet(
    goal: Goal,
    wallets: List<Wallet>,
    onDismiss: () -> Unit,
    onConfirm: (destinationWalletId: String?) -> Unit,
) {
    val t = rememberStrings()
    val format = rememberCurrencyFormatter()
    val colors = NovaColors.current
    val hasBalance = goal.currentAmount > 0
    var selected by remember { mutableStateOf(wallets.firstOrNull()?.id) }

    NovaDraftSheet(
        onDismiss = onDismiss,
        title = t(if (hasBalance) StringKey.GOALS_DELETE_RETURN_FUNDS_TITLE else StringKey.GOALS_DELETE_CONFIRM_TITLE),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(
                t(if (hasBalance) StringKey.GOALS_DELETE_RETURN_FUNDS_BODY else StringKey.GOALS_DELETE_CONFIRM_BODY),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (hasBalance) {
                Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    wallets.forEach { wallet ->
                        val isSelected = selected == wallet.id
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f) else Color.Transparent)
                                .border(1.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(14.dp))
                                .selectable(selected = isSelected, onClick = { selected = wallet.id }, role = androidx.compose.ui.semantics.Role.RadioButton)
                                .padding(horizontal = 14.dp, vertical = 12.dp),
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(16.dp)
                                    .clip(CircleShape)
                                    .border(2.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant, CircleShape)
                                    .background(if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent, CircleShape),
                            )
                            Column(modifier = Modifier.padding(start = 12.dp)) {
                                Text(wallet.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                                Text(format(wallet.currentBalance), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(colors.negativeSoft)
                    .border(1.dp, colors.negative, RoundedCornerShape(14.dp))
                    .then(if (!hasBalance || selected != null) Modifier.selectable(selected = false, onClick = { onConfirm(if (hasBalance) selected else null) }) else Modifier)
                    .padding(vertical = 14.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = if (hasBalance) "${t(StringKey.GOALS_DELETE)} · ${format(goal.currentAmount)}" else t(StringKey.GOALS_DELETE),
                    color = colors.negative,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 13.sp,
                )
            }
            Text(
                t(StringKey.COMMON_CANCEL),
                textAlign = TextAlign.Center,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.fillMaxWidth().selectable(selected = false, onClick = onDismiss).padding(vertical = 6.dp),
            )
        }
    }
}

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
// save", not the only way to reverse it. Presented as a sheet (per the
// mockup's goalPayOpen) rather than the full screen this used to be; the
// SnackbarHostState is hoisted at PlanesScreen so Undo can still show after
// this sheet closes itself on save.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GoalPaySheet(
    goal: Goal,
    wallets: List<Wallet>,
    snackbarHostState: SnackbarHostState,
    onDismiss: () -> Unit,
) {
    val t = rememberStrings()
    val format = rememberCurrencyFormatter()
    val scope = rememberCoroutineScope()
    var amountText by remember { mutableStateOf("") }
    var walletId by remember { mutableStateOf(wallets.firstOrNull()?.id) }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }

    NovaDraftSheet(onDismiss = onDismiss, title = "${t(StringKey.GOAL_CONTRIBUTION_TITLE)} ${goal.name}") {
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Text(
                "${format(goal.currentAmount)} / ${format(goal.targetAmount)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(t(StringKey.GOAL_CONTRIBUTION_AMOUNT), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it.filter { c -> c.isDigit() }; error = null },
                    leadingIcon = { Text("$", fontWeight = FontWeight.Bold) },
                    placeholder = { Text("0") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    visualTransformation = ThousandsGroupingVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            if (wallets.isEmpty()) {
                Text(t(StringKey.ADD_TXN_NO_WALLET_SUBTITLE), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(t(StringKey.GOAL_CONTRIBUTION_WALLET), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        wallets.forEach { wallet ->
                            GoalContributionChip(label = wallet.name, selected = walletId == wallet.id, onClick = { walletId = wallet.id })
                        }
                    }
                }
            }

            if (error != null) {
                Text(error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            DraftSheetPrimaryButton(
                label = if (saving) "…" else t(StringKey.GOAL_CONTRIBUTION_SAVE),
                enabled = !saving && wallets.isNotEmpty(),
                onClick = {
                    val amount = amountText.toDoubleOrNull()
                    val selectedWallet = walletId
                    if (amount == null || amount <= 0) {
                        error = t(StringKey.GOAL_CONTRIBUTION_ERROR_AMOUNT)
                        return@DraftSheetPrimaryButton
                    }
                    if (selectedWallet == null) {
                        error = t(StringKey.GOAL_CONTRIBUTION_ERROR_WALLET)
                        return@DraftSheetPrimaryButton
                    }

                    val input = NewTransactionInput(
                        walletId = selectedWallet,
                        description = t(StringKey.GOAL_CONTRIBUTION_DESCRIPTION_PREFIX) + goal.name,
                        amount = amount,
                        type = TransactionType.EXPENSE,
                        category = CategoryId.OTHER,
                        date = todayISO(),
                        goalId = goal.id,
                    )

                    saving = true
                    scope.launch {
                        val created = AppContainer.transactionRepository.add(input)
                        AppContainer.walletRepository.refresh()
                        AppContainer.goalRepository.refresh()
                        saving = false
                        onDismiss()

                        if (created != null) {
                            val result = snackbarHostState.showSnackbar(
                                message = t(StringKey.GOAL_CONTRIBUTION_SAVED),
                                actionLabel = t(com.s2nova.app.ui.StringKey.COMMON_UNDO),
                                duration = SnackbarDuration.Long,
                            )
                            if (result == SnackbarResult.ActionPerformed) {
                                AppContainer.transactionRepository.delete(created.id)
                                AppContainer.walletRepository.refresh()
                                AppContainer.goalRepository.refresh()
                            }
                        }
                    }
                },
            )
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
            .border(1.dp, if (selected) Color.Transparent else MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(50))
            .selectable(selected = selected, onClick = onClick, role = androidx.compose.ui.semantics.Role.RadioButton)
            .padding(horizontal = 14.dp, vertical = 10.dp),
    )
}
