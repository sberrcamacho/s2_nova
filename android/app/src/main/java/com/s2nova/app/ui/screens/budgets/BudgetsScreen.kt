package com.s2nova.app.ui.screens.budgets

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.data.mock.expenseCategories
import com.s2nova.app.data.model.BudgetProgress
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.ui.components.CategoryIcon
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaProgressBar
import com.s2nova.app.ui.components.NovaTopBar
import com.s2nova.app.ui.components.StatusBadge
import com.s2nova.app.ui.components.badgeToneFor
import com.s2nova.app.ui.components.budgetStatusColor
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.budgetStatusStringKey
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.screens.goals.GoalsTab
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch

@Composable
fun BudgetsScreen() {
    val t = rememberStrings()
    var tab by remember { mutableStateOf(0) }

    Scaffold(
        topBar = { NovaTopBar(title = t(StringKey.TITLE_BUDGETS)) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            PrimaryTabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text(t(StringKey.TITLE_BUDGETS)) })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text(t(StringKey.GOALS_TITLE)) })
            }
            if (tab == 0) BudgetsTab() else GoalsTab()
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

    LaunchedEffect(Unit) { AppContainer.budgetRepository.refresh() }

    val progressList = budgetProgress.sortedByDescending { it.percentage }

    val totalLimit = progressList.sumOf { it.budget.limit }
    val totalSpent = progressList.sumOf { it.spent }
    val pct = if (totalLimit > 0) ((totalSpent / totalLimit) * 100).toInt() else 0

    var editing by remember { mutableStateOf<BudgetProgress?>(null) }
    var creating by remember { mutableStateOf(false) }

    LazyColumn(
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            androidx.compose.ui.graphics.Brush.linearGradient(listOf(colors.heroFrom, colors.heroTo)),
                            RoundedCornerShape(20.dp),
                        )
                        .padding(20.dp),
                ) {
                    Text(t(StringKey.BUDGETS_MONTH_LABEL), style = MaterialTheme.typography.labelMedium, color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.6f))
                    Text(format(totalSpent), style = MaterialTheme.typography.headlineLarge, color = androidx.compose.ui.graphics.Color.White, modifier = Modifier.padding(top = 4.dp))
                    Text("${t(StringKey.BUDGETS_OF)} ${format(totalLimit)}", style = MaterialTheme.typography.bodyMedium, color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.7f))
                    Spacer(Modifier.height(12.dp))
                    NovaProgressBar(percentage = pct, color = androidx.compose.ui.graphics.Color.White)
                    Text("$pct% ${t(StringKey.BUDGETS_UTILIZED)}", style = MaterialTheme.typography.bodySmall, color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.7f), modifier = Modifier.padding(top = 6.dp))
                }
            }

            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    val available = expenseCategories.filter { c -> progressList.none { it.budget.category == c.id } }
                    TextButton(onClick = { creating = true }, enabled = available.isNotEmpty()) {
                        Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.padding(end = 4.dp))
                        Text(t(StringKey.BUDGETS_NEW))
                    }
                }
            }

            items(progressList) { progress ->
                NovaCard(modifier = Modifier.fillMaxWidth(), onClick = { editing = progress }) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            CategoryIcon(category = progress.budget.category)
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
                            StatusBadge(text = t(budgetStatusStringKey(progress.status)), tone = badgeToneFor(progress.status))
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

    if (editing != null) {
        EditBudgetDialog(
            categoryId = editing!!.budget.category,
            initialLimit = editing!!.budget.limit.toInt().toString(),
            onDismiss = { editing = null },
            onSave = { newLimit ->
                scope.launch { AppContainer.budgetRepository.updateLimit(editing!!.budget.id, newLimit) }
                editing = null
            },
        )
    }

    if (creating) {
        val available = expenseCategories.filter { c -> progressList.none { it.budget.category == c.id && it.budget.name == null } }
        CreateBudgetDialog(
            availableCategories = available.map { it.id },
            onDismiss = { creating = false },
            onCreate = { name, category, limit ->
                scope.launch { AppContainer.budgetRepository.create(name, category, limit) }
                creating = false
            },
        )
    }
}

@Composable
private fun EditBudgetDialog(categoryId: CategoryId, initialLimit: String, onDismiss: () -> Unit, onSave: (Double) -> Unit) {
    var limitText by remember { mutableStateOf(initialLimit) }
    val t = rememberStrings()
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("${t(StringKey.BUDGETS_EDIT_TITLE_PREFIX)} ${categoryMap[categoryId]?.let { t(categoryStringKey(it.id)) }}") },
        text = {
            OutlinedTextField(
                value = limitText,
                onValueChange = { limitText = it.filter { c -> c.isDigit() } },
                leadingIcon = { Text("$") },
                label = { Text(t(StringKey.BUDGETS_MONTHLY_LIMIT)) },
                singleLine = true,
            )
        },
        confirmButton = {
            TextButton(onClick = { limitText.toDoubleOrNull()?.let { if (it > 0) onSave(it) } }) { Text(t(StringKey.COMMON_SAVE)) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(t(StringKey.COMMON_CANCEL)) } },
    )
}

@Composable
private fun CreateBudgetDialog(availableCategories: List<CategoryId>, onDismiss: () -> Unit, onCreate: (String?, CategoryId, Double) -> Unit) {
    var name by remember { mutableStateOf("") }
    var selected by remember { mutableStateOf(availableCategories.firstOrNull()) }
    var limitText by remember { mutableStateOf("") }
    var expanded by remember { mutableStateOf(false) }
    val t = rememberStrings()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(t(StringKey.BUDGETS_NEW)) },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text(t(StringKey.BUDGETS_NAME_OPTIONAL)) },
                    placeholder = { Text(t(StringKey.BUDGETS_NAME_PLACEHOLDER)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                )
                Box {
                    OutlinedTextField(
                        value = selected?.let { id -> categoryMap[id]?.let { t(categoryStringKey(it.id)) } } ?: "",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text(t(StringKey.ADD_TXN_CATEGORY)) },
                        trailingIcon = {
                            Icon(
                                Icons.Filled.KeyboardArrowDown,
                                contentDescription = null,
                                modifier = Modifier.clickable { expanded = true },
                            )
                        },
                        modifier = Modifier.fillMaxWidth().clickable { expanded = true },
                        enabled = false,
                        colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                            disabledTextColor = MaterialTheme.colorScheme.onSurface,
                            disabledBorderColor = MaterialTheme.colorScheme.outline,
                            disabledLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            disabledTrailingIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        ),
                    )
                    DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        availableCategories.forEach { c ->
                            DropdownMenuItem(
                                text = { Text(categoryMap[c]?.let { t(categoryStringKey(it.id)) } ?: "") },
                                onClick = { selected = c; expanded = false },
                            )
                        }
                    }
                }
                OutlinedTextField(
                    value = limitText,
                    onValueChange = { limitText = it.filter { c -> c.isDigit() } },
                    leadingIcon = { Text("$") },
                    label = { Text(t(StringKey.BUDGETS_MONTHLY_LIMIT)) },
                    singleLine = true,
                    modifier = Modifier.padding(top = 12.dp),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val cat = selected
                val limit = limitText.toDoubleOrNull()
                if (cat != null && limit != null && limit > 0) onCreate(name.trim().ifBlank { null }, cat, limit)
            }) { Text(t(StringKey.BUDGETS_CREATE)) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(t(StringKey.COMMON_CANCEL)) } },
    )
}
