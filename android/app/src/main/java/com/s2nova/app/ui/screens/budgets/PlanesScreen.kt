package com.s2nova.app.ui.screens.budgets

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Tab
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
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.data.mock.expenseCategories
import com.s2nova.app.data.model.BudgetProgress
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.ui.components.CategoryIcon
import com.s2nova.app.ui.components.CategoryIconSize
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaProgressBar
import com.s2nova.app.ui.components.StatusBadge
import com.s2nova.app.ui.components.badgeToneFor
import com.s2nova.app.ui.components.budgetStatusColor
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.ThousandsGroupingVisualTransformation
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.screens.goals.GoalsTab
import com.s2nova.app.ui.screens.loans.LoansTab
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch

@Composable
fun PlanesScreen() {
    val t = rememberStrings()
    var tab by remember { mutableStateOf(0) }
    val snackbarHostState = remember { androidx.compose.material3.SnackbarHostState() }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        snackbarHost = { androidx.compose.material3.SnackbarHost(snackbarHostState) },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            Text(
                t(StringKey.TITLE_PLANS),
                style = MaterialTheme.typography.headlineMedium.copy(fontSize = 21.sp, letterSpacing = (-0.42).sp),
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
            )
            PrimaryTabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text(t(StringKey.TITLE_BUDGETS)) })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text(t(StringKey.GOALS_TITLE)) })
                Tab(selected = tab == 2, onClick = { tab = 2 }, text = { Text(t(StringKey.PLANS_TAB)) })
            }
            when (tab) {
                0 -> BudgetsTab()
                1 -> GoalsTab(snackbarHostState = snackbarHostState)
                else -> LoansTab()
            }
        }
    }
}

@Composable
private fun BudgetsTab() {
    val budgetProgress by AppContainer.budgetRepository.budgetProgress.collectAsStateWithLifecycle()
    val colors = NovaColors.current
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { runCatching { AppContainer.budgetRepository.refresh() } }

    val progressList = budgetProgress.sortedByDescending { it.percentage }

    val totalLimit = progressList.sumOf { it.budget.limit }
    val totalSpent = progressList.sumOf { it.spent }
    val pct = if (totalLimit > 0) ((totalSpent / totalLimit) * 100).toInt() else 0
    val overallStatus = when {
        pct >= 100 -> com.s2nova.app.data.model.BudgetStatus.OVER_BUDGET
        pct >= 80 -> com.s2nova.app.data.model.BudgetStatus.NEAR_LIMIT
        else -> com.s2nova.app.data.model.BudgetStatus.ON_TRACK
    }

    var draft by remember { mutableStateOf<BudgetDraft?>(null) }
    var deleting by remember { mutableStateOf<BudgetProgress?>(null) }
    fun unnamedAvailable() = expenseCategories.filter { c -> progressList.none { it.budget.category == c.id && it.budget.name == null } }

    LazyColumn(
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(20.dp))
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(20.dp))
                        .padding(20.dp),
                ) {
                    Text(t(StringKey.BUDGETS_MONTH_LABEL), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(format(totalSpent), style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(top = 4.dp))
                    Text("${t(StringKey.BUDGETS_OF)} ${format(totalLimit)}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(12.dp))
                    NovaProgressBar(percentage = pct, color = budgetStatusColor(overallStatus, colors), height = 7.dp, cornerRadius = 4.dp)
                    Text("$pct% ${t(StringKey.BUDGETS_UTILIZED)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                }
            }

            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    val available = unnamedAvailable()
                    TextButton(
                        onClick = {
                            draft = BudgetDraft(id = null, name = "", category = available.first().id, userPickedCategory = false, limitText = "")
                        },
                        enabled = available.isNotEmpty(),
                    ) {
                        Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.padding(end = 4.dp))
                        Text(t(StringKey.BUDGETS_NEW))
                    }
                }
            }

            items(progressList) { progress ->
                NovaCard(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = {
                        draft = BudgetDraft(
                            id = progress.budget.id,
                            name = progress.budget.name ?: "",
                            category = progress.budget.category,
                            userPickedCategory = true,
                            limitText = progress.budget.limit.toInt().toString(),
                        )
                    },
                    borderColor = if (progress.percentage >= 90) colors.negativeBorder else MaterialTheme.colorScheme.outline,
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            CategoryIcon(category = progress.budget.category, size = CategoryIconSize.ROW)
                            Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                                Text(
                                    progress.budget.name ?: categoryMap[progress.budget.category]?.let { t(categoryStringKey(it.id)) } ?: "",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onBackground,
                                )
                                Text(
                                    progress.budget.name?.let { t(categoryStringKey(progress.budget.category)) } ?: t(StringKey.BUDGETS_MONTHLY_LIMIT),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            StatusBadge(text = "${progress.percentage}%", tone = badgeToneFor(progress.status))
                        }
                        Spacer(Modifier.height(10.dp))
                        Row {
                            Text(format(progress.spent), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.ExtraBold)
                            Text(" / ${format(progress.budget.limit)}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(Modifier.height(8.dp))
                        NovaProgressBar(percentage = progress.percentage, color = budgetStatusColor(progress.status, colors))
                        Text(
                            if (progress.remaining >= 0) "${format(progress.remaining)} ${t(StringKey.BUDGETS_REMAINING)}" else "${format(-progress.remaining)} ${t(StringKey.BUDGETS_OVER_LIMIT)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 6.dp),
                        )
                    }
                }
            }

            item { Spacer(Modifier.height(72.dp)) }
    }

    val d = draft
    if (d != null) {
        BudgetDraftSheet(
            draft = d,
            onDraftChange = { draft = it },
            onDismiss = { draft = null },
            onSave = {
                val limit = d.limitText.toDoubleOrNull()
                if (limit != null && limit > 0) {
                    val name = d.name.trim().ifBlank { null }
                    scope.launch {
                        if (d.id == null) {
                            AppContainer.budgetRepository.create(name, d.category, limit)
                        } else {
                            AppContainer.budgetRepository.update(d.id, name, limit)
                        }
                    }
                    draft = null
                }
            },
            onRequestDelete = {
                val id = d.id
                if (id != null) {
                    deleting = progressList.firstOrNull { it.budget.id == id }
                    draft = null
                }
            },
        )
    }

    if (deleting != null) {
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text(t(StringKey.BUDGETS_DELETE_CONFIRM_TITLE)) },
            text = { Text(t(StringKey.BUDGETS_DELETE_CONFIRM_BODY)) },
            confirmButton = {
                TextButton(onClick = {
                    val id = deleting!!.budget.id
                    scope.launch { AppContainer.budgetRepository.delete(id) }
                    deleting = null
                }) { Text(t(StringKey.BUDGETS_DELETE), color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text(t(StringKey.COMMON_CANCEL)) } },
        )
    }
}

// Draft state backing the budget create/edit sheet. `id == null` means
// "creating". Category can only be chosen while creating — the backend's
// PATCH /budgets/:id has no categoryId field, so an existing budget's
// category is permanent; the chip row still renders in edit mode (matching
// the mockup) but is non-interactive there.
private data class BudgetDraft(
    val id: String?,
    val name: String,
    val category: CategoryId,
    val userPickedCategory: Boolean,
    val limitText: String,
)

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class, androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
private fun BudgetDraftSheet(
    draft: BudgetDraft,
    onDraftChange: (BudgetDraft) -> Unit,
    onDismiss: () -> Unit,
    onSave: () -> Unit,
    onRequestDelete: () -> Unit,
) {
    val t = rememberStrings()
    val isEdit = draft.id != null
    val guessedCategory = com.s2nova.app.ui.suggestExpenseCategory(draft.name)
    val showAutoNote = !draft.userPickedCategory && guessedCategory != null

    com.s2nova.app.ui.components.NovaDraftSheet(
        onDismiss = onDismiss,
        title = t(if (isEdit) StringKey.BUDGETS_EDIT_TITLE else StringKey.BUDGETS_NEW),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    CategoryIcon(category = draft.category, size = CategoryIconSize.MD)
                    OutlinedTextField(
                        value = draft.name,
                        onValueChange = { newName ->
                            val guessed = if (!draft.userPickedCategory) com.s2nova.app.ui.suggestExpenseCategory(newName) else null
                            onDraftChange(draft.copy(name = newName, category = guessed ?: draft.category))
                        },
                        label = { Text(t(StringKey.BUDGETS_NAME_OPTIONAL)) },
                        placeholder = { Text(t(StringKey.BUDGETS_NAME_PLACEHOLDER)) },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                }
                Text(
                    t(if (showAutoNote) StringKey.BUDGETS_CATEGORY_AUTO_NOTE else StringKey.BUDGETS_CATEGORY_NOTE),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(t(StringKey.ADD_TXN_CATEGORY), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                androidx.compose.foundation.layout.FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    expenseCategories.forEach { c ->
                        com.s2nova.app.ui.components.ColorPill(
                            label = t(categoryStringKey(c.id)),
                            color = Color(c.color),
                            selected = draft.category == c.id,
                            enabled = !isEdit,
                            onClick = { onDraftChange(draft.copy(category = c.id, userPickedCategory = true)) },
                        )
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(t(StringKey.BUDGETS_MONTHLY_LIMIT), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                OutlinedTextField(
                    value = draft.limitText,
                    onValueChange = { onDraftChange(draft.copy(limitText = it.filter { c -> c.isDigit() })) },
                    leadingIcon = { Text("$") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    visualTransformation = ThousandsGroupingVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            com.s2nova.app.ui.components.DraftSheetPrimaryButton(
                label = t(StringKey.COMMON_SAVE),
                enabled = (draft.limitText.toDoubleOrNull() ?: 0.0) > 0,
                onClick = onSave,
            )

            if (isEdit) {
                com.s2nova.app.ui.components.DraftSheetDeleteRow(label = t(StringKey.BUDGETS_DELETE), onClick = onRequestDelete)
            }
        }
    }
}
