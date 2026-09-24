package com.s2nova.app.ui.screens.budgets

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.mock.expenseCategories
import com.s2nova.app.data.model.BudgetProgress
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.LoanKind
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.components.CategoryIcon
import com.s2nova.app.ui.components.CategoryIconSize
import com.s2nova.app.ui.components.ColorPill
import com.s2nova.app.ui.components.DashedNewRow
import com.s2nova.app.ui.components.DraftSheetDeleteRow
import com.s2nova.app.ui.components.DraftSheetPrimaryButton
import com.s2nova.app.ui.components.MockupIcons
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.NovaProgressBar
import com.s2nova.app.ui.components.SheetAmountBox
import com.s2nova.app.ui.components.SheetBox
import com.s2nova.app.ui.components.SheetInput
import com.s2nova.app.ui.components.SheetLabel
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.screens.goals.GoalsTab
import com.s2nova.app.ui.screens.home.budgetTone
import com.s2nova.app.ui.screens.home.toneColor
import com.s2nova.app.ui.screens.loans.LoansTab
import com.s2nova.app.ui.suggestExpenseCategory
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch
import retrofit2.HttpException

@Composable
fun PlanesScreen(initialTab: Int = 0, initialLoanSide: LoanKind = LoanKind.LENT) {
    val t = rememberStrings()
    // Keyed on the deep-link arguments so an alert opening a different tab
    // while Planes is already showing still switches to it.
    var tab by remember(initialTab, initialLoanSide) { mutableStateOf(initialTab) }
    val snackbarHostState = remember { SnackbarHostState() }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        // The app shell already pads for the status bar.
        contentWindowInsets = androidx.compose.foundation.layout.WindowInsets(0),
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            Column(modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 10.dp)) {
                Text(
                    t(StringKey.TITLE_PLANS),
                    fontSize = 21.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = (-0.42).sp,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                PlanesTabs(
                    labels = listOf(t(StringKey.TITLE_BUDGETS), t(StringKey.GOALS_TITLE), t(StringKey.PLANS_TAB)),
                    selected = tab,
                    onSelect = { tab = it },
                )
            }
            when (tab) {
                0 -> BudgetsTab()
                1 -> GoalsTab(snackbarHostState = snackbarHostState)
                else -> LoansTab(initialSide = initialLoanSide)
            }
        }
    }
}

// Mockup budgetTabs: left-aligned text tabs over a 1dp --line rule; the
// selected one is ExtraBold --text with a 2dp --accent underline that
// overlaps the rule.
@Composable
private fun PlanesTabs(labels: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    val line = MaterialTheme.colorScheme.outline
    val accent = MaterialTheme.colorScheme.primary
    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 14.dp)
            .drawBehind {
                val h = 1.dp.toPx()
                drawRect(line, topLeft = Offset(0f, size.height - h), size = Size(size.width, h))
            },
    ) {
        labels.forEachIndexed { index, label ->
            val on = index == selected
            Text(
                label,
                fontSize = 13.sp,
                fontWeight = if (on) FontWeight.ExtraBold else FontWeight.SemiBold,
                color = if (on) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier
                    .clickable { onSelect(index) }
                    .drawBehind {
                        if (on) {
                            val h = 2.dp.toPx()
                            drawRect(accent, topLeft = Offset(0f, size.height - h), size = Size(size.width, h))
                        }
                    }
                    .padding(horizontal = 14.dp, vertical = 10.dp)
                    .padding(bottom = 1.dp),
            )
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
    val totalPct = if (totalLimit > 0) ((totalSpent / totalLimit) * 100).toInt() else 0

    var draft by remember { mutableStateOf<BudgetDraft?>(null) }
    var deleting by remember { mutableStateOf<BudgetProgress?>(null) }

    LazyColumn(
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            val today = java.time.LocalDate.now()
            val daysLeft = today.lengthOfMonth() - today.dayOfMonth
            val available = (totalLimit - totalSpent).coerceAtLeast(0.0)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(18.dp))
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(18.dp))
                    .padding(horizontal = 18.dp, vertical = 16.dp),
            ) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text(t(StringKey.BUDGETS_SPENT_LABEL), fontSize = 11.sp, color = colors.textDim)
                        Text(
                            format(totalSpent),
                            fontSize = 22.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = (-0.55).sp,
                            color = MaterialTheme.colorScheme.onBackground,
                            modifier = Modifier.padding(top = 3.dp),
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(t(StringKey.BUDGETS_LIMIT_TOTAL), fontSize = 11.sp, color = colors.textDim)
                        Text(format(totalLimit), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                NovaProgressBar(
                    percentage = totalPct.coerceAtMost(100),
                    color = toneColor(budgetTone(totalPct), colors),
                    height = 7.dp,
                    cornerRadius = 4.dp,
                    modifier = Modifier.padding(top = 14.dp),
                )
                Text(
                    String.format(t(StringKey.BUDGETS_DAYS_LEFT_NOTE), daysLeft, format(available)),
                    fontSize = 11.sp,
                    color = colors.textDim,
                    modifier = Modifier.padding(top = 9.dp),
                )
            }
        }

        item {
            DashedNewRow(
                label = t(StringKey.BUDGETS_NEW),
                onClick = {
                    val taken = progressList.map { it.budget.category }.toSet()
                    val free = expenseCategories.map { it.id }.filterNot { it in taken }
                    val category = if (CategoryId.OTHER in free) CategoryId.OTHER else free.firstOrNull() ?: CategoryId.OTHER
                    draft = BudgetDraft(id = null, name = "", category = category, userPickedCategory = false, limitText = "")
                },
            )
        }

        items(progressList, key = { it.budget.id }) { progress ->
            BudgetCard(progress) {
                draft = BudgetDraft(
                    id = progress.budget.id,
                    name = progress.budget.name ?: t(categoryStringKey(progress.budget.category)),
                    category = progress.budget.category,
                    userPickedCategory = true,
                    limitText = progress.budget.limit.toLong().toString(),
                )
            }
        }

        if (progressList.isEmpty()) {
            item {
                Text(
                    t(StringKey.BUDGETS_EMPTY),
                    fontSize = 12.sp,
                    lineHeight = 18.sp,
                    color = colors.textDim,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
                )
            }
        }

        item { androidx.compose.foundation.layout.Spacer(Modifier.height(72.dp)) }
    }

    val d = draft
    if (d != null) {
        BudgetDraftSheet(
            draft = d,
            onDraftChange = { draft = it.copy(error = null) },
            onDismiss = { draft = null },
            onSave = {
                val limit = d.limitText.toDoubleOrNull()
                if (limit != null && limit > 0 && d.name.isNotBlank()) {
                    // A name equal to a category label (the new one, or the
                    // one being moved away from) is a display name, not a
                    // custom one.
                    val existing = d.id?.let { id -> progressList.firstOrNull { it.budget.id == id } }
                    val labels = listOfNotNull(d.category, existing?.budget?.category).map { t(categoryStringKey(it)) }
                    val name = d.name.trim().takeUnless { it in labels }
                    scope.launch {
                        try {
                            if (d.id == null) {
                                AppContainer.budgetRepository.create(name, d.category, limit)
                            } else {
                                val moved = d.category.takeIf { it != existing?.budget?.category }
                                AppContainer.budgetRepository.update(d.id, name, limit, category = moved)
                            }
                            draft = null
                        } catch (e: HttpException) {
                            draft = d.copy(error = if (e.code() == 409) t(StringKey.BUDGETS_CATEGORY_TAKEN) else t(StringKey.COMMON_SAVE_ERROR))
                        } catch (e: Exception) {
                            draft = d.copy(error = t(StringKey.COMMON_SAVE_ERROR))
                        }
                    }
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

    val toDelete = deleting
    if (toDelete != null) {
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text(t(StringKey.BUDGETS_DELETE_CONFIRM_TITLE)) },
            text = { Text(t(StringKey.BUDGETS_DELETE_CONFIRM_BODY)) },
            confirmButton = {
                TextButton(onClick = {
                    scope.launch { runCatching { AppContainer.budgetRepository.delete(toDelete.budget.id) } }
                    deleting = null
                }) { Text(t(StringKey.BUDGETS_DELETE), color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text(t(StringKey.COMMON_CANCEL)) } },
        )
    }
}

// Mockup budget card: 38dp mark, name, tone-colored % and pencil,
// "spent de limit", 6dp bar; --neg-soft border from 90%.
@Composable
private fun BudgetCard(progress: BudgetProgress, onEdit: () -> Unit) {
    val colors = NovaColors.current
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val tone = toneColor(budgetTone(progress.percentage), colors)
    val shape = RoundedCornerShape(18.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, if (progress.percentage >= 90) colors.negativeBorder else MaterialTheme.colorScheme.outline, shape)
            .clickable(onClick = onEdit)
            .padding(horizontal = 17.dp, vertical = 15.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            CategoryIcon(category = progress.budget.category, size = CategoryIconSize.ROW)
            Column(modifier = Modifier.weight(1f).padding(start = 13.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        progress.budget.name ?: t(categoryStringKey(progress.budget.category)),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onBackground,
                        maxLines = 1,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        "${progress.percentage}%",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = tone,
                        modifier = Modifier.padding(start = 8.dp),
                    )
                    Icon(
                        MockupIcons.Pencil,
                        contentDescription = t(StringKey.BUDGETS_EDIT_TITLE),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(start = 8.dp).size(15.dp),
                    )
                }
                Text(
                    "${format(progress.spent)} ${t(StringKey.BUDGETS_OF)} ${format(progress.budget.limit)}",
                    fontSize = 11.5.sp,
                    color = colors.textDim,
                    modifier = Modifier.padding(top = 3.dp),
                )
            }
        }
        NovaProgressBar(
            percentage = progress.percentage.coerceAtMost(100),
            color = tone,
            height = 6.dp,
            cornerRadius = 3.dp,
            modifier = Modifier.padding(top = 12.dp),
        )
    }
}

// Draft state backing the budget create/edit sheet. `id == null` means
// "creating". The backend keeps one budget per category and month, so a
// taken category comes back as a 409 and the sheet stays open.
private data class BudgetDraft(
    val id: String?,
    val name: String,
    val category: CategoryId,
    val userPickedCategory: Boolean,
    val limitText: String,
    // Save failure shown above "Guardar" (a snackbar would sit under the sheet).
    val error: String? = null,
)

// Mockup budgetSheet: Nombre (with the category mark), Categoría pills,
// Límite mensual, Guardar and "Eliminar presupuesto".
@OptIn(ExperimentalLayoutApi::class, androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
private fun BudgetDraftSheet(
    draft: BudgetDraft,
    onDraftChange: (BudgetDraft) -> Unit,
    onDismiss: () -> Unit,
    onSave: () -> Unit,
    onRequestDelete: () -> Unit,
) {
    val t = rememberStrings()
    val colors = NovaColors.current
    val isEdit = draft.id != null
    val showAutoNote = !draft.userPickedCategory && suggestExpenseCategory(draft.name) != null

    NovaDraftSheet(
        onDismiss = onDismiss,
        title = t(if (isEdit) StringKey.BUDGETS_EDIT_TITLE else StringKey.BUDGETS_NEW),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Column {
                SheetLabel(t(StringKey.BUDGETS_NAME))
                SheetBox(padding = PaddingValues(horizontal = 14.dp, vertical = 11.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CategoryIcon(category = draft.category, size = CategoryIconSize.MD)
                        Box(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                            SheetInput(
                                value = draft.name,
                                onValueChange = { newName ->
                                    val guessed = if (!draft.userPickedCategory) suggestExpenseCategory(newName) else null
                                    onDraftChange(draft.copy(name = newName, category = guessed ?: draft.category))
                                },
                                placeholder = t(StringKey.BUDGETS_NAME_PLACEHOLDER),
                                style = TextStyle(fontSize = 13.5.sp, fontWeight = FontWeight.Bold),
                            )
                        }
                    }
                }
                Text(
                    t(if (showAutoNote) StringKey.BUDGETS_CATEGORY_AUTO_NOTE else StringKey.BUDGETS_CATEGORY_NOTE),
                    fontSize = 11.sp,
                    color = colors.textDim,
                    modifier = Modifier.padding(top = 9.dp),
                )
            }

            Column {
                SheetLabel(t(StringKey.ADD_TXN_CATEGORY))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    expenseCategories.forEach { c ->
                        ColorPill(
                            label = t(categoryStringKey(c.id)),
                            color = Color(c.color),
                            selected = draft.category == c.id,
                            onClick = { onDraftChange(draft.copy(category = c.id, userPickedCategory = true)) },
                        )
                    }
                }
            }

            Column {
                SheetLabel(t(StringKey.BUDGETS_MONTHLY_LIMIT))
                SheetAmountBox(draft.limitText) { onDraftChange(draft.copy(limitText = it)) }
            }

            draft.error?.let {
                Text(it, fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = colors.negative)
            }

            DraftSheetPrimaryButton(
                label = t(StringKey.COMMON_SAVE),
                enabled = draft.name.isNotBlank() && (draft.limitText.toDoubleOrNull() ?: 0.0) > 0,
                onClick = onSave,
            )

            if (isEdit) {
                DraftSheetDeleteRow(label = t(StringKey.BUDGETS_DELETE), onClick = onRequestDelete)
            }
        }
    }
}
