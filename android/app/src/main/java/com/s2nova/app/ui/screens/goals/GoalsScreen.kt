package com.s2nova.app.ui.screens.goals

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import com.s2nova.app.data.model.Goal
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.ThousandsGroupingVisualTransformation
import com.s2nova.app.ui.components.BudgetGoalThemePicker
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaProgressRing
import com.s2nova.app.ui.components.WalletPickerDialog
import com.s2nova.app.ui.components.budgetGoalThemeFor
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import kotlinx.coroutines.launch

// Goals ("Car Payment", etc.) live as a second tab alongside Budgets
// rather than a new bottom-nav destination — both are "plan ahead"
// concepts, and the brief prioritizes keeping Android's navigation
// unchanged over adding a new top-level surface for a single new screen.
@Composable
fun GoalsTab(onContribute: (String) -> Unit) {
    val goals by AppContainer.goalRepository.goals.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val scope = rememberCoroutineScope()
    var creating by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<Goal?>(null) }
    var deleting by remember { mutableStateOf<Goal?>(null) }
    var returningFundsFor by remember { mutableStateOf<Goal?>(null) }

    LaunchedEffect(Unit) {
        runCatching { AppContainer.goalRepository.refresh() }
        runCatching { AppContainer.walletRepository.refresh() }
    }

    LazyColumn(
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = { creating = true }) {
                    Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.padding(end = 4.dp))
                    Text(t(StringKey.GOALS_NEW))
                }
            }
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
            val theme = budgetGoalThemeFor(goal.themeIcon)
            NovaCard(modifier = Modifier.fillMaxWidth(), onClick = { editing = goal }) {
                Column(modifier = Modifier.padding(16.dp)) {
                    val percentage = if (goal.targetAmount > 0) ((goal.currentAmount / goal.targetAmount) * 100).toInt().coerceIn(0, 100) else 0
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box {
                            NovaProgressRing(
                                percentage = percentage,
                                color = if (theme != null) Color(theme.color) else MaterialTheme.colorScheme.primary,
                                centerLabel = "$percentage%",
                            )
                            if (theme != null) {
                                Box(
                                    modifier = Modifier
                                        .align(Alignment.BottomEnd)
                                        .size(20.dp)
                                        .clip(CircleShape)
                                        .background(Color(theme.color)),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(theme.icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(12.dp))
                                }
                            }
                        }
                        Column(modifier = Modifier.weight(1f).padding(start = 16.dp)) {
                            Text(goal.name, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
                            Row(modifier = Modifier.padding(top = 4.dp)) {
                                Text(format(goal.currentAmount), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.ExtraBold)
                                Text(" / ${format(goal.targetAmount)}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (goal.targetDate != null) {
                                Text(goal.targetDate, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp))
                            }
                        }
                    }
                    Button(
                        onClick = { onContribute(goal.id) },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                    ) { Text(t(StringKey.GOALS_CONTRIBUTE)) }
                }
            }
        }

        item { Spacer(Modifier.height(72.dp)) }
    }

    if (creating) {
        GoalFormDialog(
            titleKey = StringKey.GOALS_NEW,
            confirmKey = StringKey.GOALS_CREATE,
            initialName = "",
            initialTarget = "",
            initialTargetDate = null,
            initialThemeIcon = null,
            onDismiss = { creating = false },
            onSave = { name, target, targetDate, themeIcon ->
                scope.launch { AppContainer.goalRepository.create(name, target, targetDate, themeIcon) }
                creating = false
            },
            onDelete = null,
        )
    }

    val editingGoal = editing
    if (editingGoal != null) {
        GoalFormDialog(
            titleKey = StringKey.GOALS_EDIT_TITLE,
            confirmKey = StringKey.GOALS_SAVE,
            initialName = editingGoal.name,
            initialTarget = editingGoal.targetAmount.toInt().toString(),
            initialTargetDate = editingGoal.targetDate,
            initialThemeIcon = editingGoal.themeIcon,
            onDismiss = { editing = null },
            onSave = { name, target, targetDate, themeIcon ->
                scope.launch { AppContainer.goalRepository.update(editingGoal.id, name, target, targetDate, themeIcon) }
                editing = null
            },
            onDelete = {
                editing = null
                if (editingGoal.currentAmount > 0) returningFundsFor = editingGoal else deleting = editingGoal
            },
        )
    }

    if (deleting != null) {
        val goalToDelete = deleting!!
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text(t(StringKey.GOALS_DELETE_CONFIRM_TITLE)) },
            text = { Text(t(StringKey.GOALS_DELETE_CONFIRM_BODY)) },
            confirmButton = {
                TextButton(onClick = {
                    scope.launch { AppContainer.goalRepository.delete(goalToDelete.id) }
                    deleting = null
                }) { Text(t(StringKey.GOALS_DELETE), color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text(t(StringKey.COMMON_CANCEL)) } },
        )
    }

    val goalReturningFunds = returningFundsFor
    if (goalReturningFunds != null) {
        WalletPickerDialog(
            title = t(StringKey.GOALS_DELETE_RETURN_FUNDS_TITLE),
            bodyText = t(StringKey.GOALS_DELETE_RETURN_FUNDS_BODY),
            wallets = wallets,
            confirmLabel = t(StringKey.GOALS_DELETE),
            onDismiss = { returningFundsFor = null },
            onConfirm = { walletId ->
                scope.launch {
                    AppContainer.goalRepository.delete(goalReturningFunds.id, walletId)
                    AppContainer.walletRepository.refresh()
                    returningFundsFor = null
                }
            },
        )
    }
}

@Composable
private fun GoalFormDialog(
    titleKey: StringKey,
    confirmKey: StringKey,
    initialName: String,
    initialTarget: String,
    initialTargetDate: String?,
    initialThemeIcon: String?,
    onDismiss: () -> Unit,
    onSave: (String, Double, String?, String?) -> Unit,
    onDelete: (() -> Unit)?,
) {
    val t = rememberStrings()
    var name by remember { mutableStateOf(initialName) }
    var targetText by remember { mutableStateOf(initialTarget) }
    var targetDate by remember { mutableStateOf(initialTargetDate ?: "") }
    var themeIcon by remember { mutableStateOf(initialThemeIcon) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(t(titleKey)) },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text(t(StringKey.GOALS_NAME)) },
                    placeholder = { Text(t(StringKey.GOALS_NAME_PLACEHOLDER)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = targetText,
                    onValueChange = { targetText = it.filter { c -> c.isDigit() } },
                    leadingIcon = { Text("$") },
                    label = { Text(t(StringKey.GOALS_TARGET_AMOUNT)) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    visualTransformation = ThousandsGroupingVisualTransformation(),
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                )
                OutlinedTextField(
                    value = targetDate,
                    onValueChange = { targetDate = it.filter { c -> c.isDigit() || c == '-' } },
                    label = { Text(t(StringKey.GOALS_TARGET_DATE_OPTIONAL)) },
                    placeholder = { Text("YYYY-MM-DD") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                )
                Text(
                    t(StringKey.GOALS_THEME_LABEL),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 14.dp, bottom = 8.dp),
                )
                BudgetGoalThemePicker(selected = themeIcon, onSelect = { themeIcon = it })
                if (onDelete != null) {
                    TextButton(onClick = onDelete, modifier = Modifier.padding(top = 8.dp)) {
                        Icon(Icons.Filled.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.padding(end = 6.dp).size(18.dp))
                        Text(t(StringKey.GOALS_DELETE), color = MaterialTheme.colorScheme.error)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val target = targetText.toDoubleOrNull()
                if (name.isNotBlank() && target != null && target > 0) {
                    onSave(name.trim(), target, targetDate.trim().ifBlank { null }, themeIcon)
                }
            }) { Text(t(confirmKey)) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(t(StringKey.COMMON_CANCEL)) } },
    )
}
