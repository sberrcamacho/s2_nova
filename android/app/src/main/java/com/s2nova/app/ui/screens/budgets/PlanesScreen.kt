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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.BudgetProgress
import com.s2nova.app.data.model.BudgetKind
import com.s2nova.app.data.model.BudgetPeriod
import com.s2nova.app.data.fmtDate
import com.s2nova.app.data.formatMoney
import com.s2nova.app.ui.Confirm
import com.s2nova.app.ui.ConfirmRequest
import com.s2nova.app.ui.components.CatMark
import com.s2nova.app.ui.components.PlanMark
import com.s2nova.app.ui.components.TNUM
import com.s2nova.app.ui.components.toneOf
import com.s2nova.app.ui.screens.addtransaction.shortWallet
import com.s2nova.app.data.model.LoanKind
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.categoryName
import com.s2nova.app.ui.components.CategoryIcon
import com.s2nova.app.ui.components.CategoryIconSize
import com.s2nova.app.ui.components.ColorPill
import com.s2nova.app.ui.components.DashedNewRow
import com.s2nova.app.ui.components.DraftSheetDeleteRow
import com.s2nova.app.ui.components.DraftSheetPrimaryButton
import com.s2nova.app.ui.components.MockupIcons
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.NovaProgressBar
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
import com.s2nova.app.ui.tr

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
    val accent = NovaColors.current.primaryBorder
    // Scrolls instead of wrapping a label ("Présta / mos") with large text.
    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 14.dp)
            .drawBehind {
                val h = 1.dp.toPx()
                drawRect(line, topLeft = Offset(0f, size.height - h), size = Size(size.width, h))
            }
            .horizontalScroll(rememberScrollState()),
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
                maxLines = 1,
                softWrap = false,
            )
        }
    }
}

@Composable
@OptIn(ExperimentalLayoutApi::class)
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

    var draft by remember { mutableStateOf<BudgetEditDraft?>(null) }

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
                // Both figures stay whole: when they don't fit side by side
                // (small screen, large text) the limit moves to a second line.
                FlowRow(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Column {
                        Text(t(StringKey.BUDGETS_SPENT_LABEL), fontSize = 12.sp, color = colors.textDim)
                        Text(
                            format(totalSpent),
                            maxLines = 1,
                            softWrap = false,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = (-0.55).sp,
                            color = MaterialTheme.colorScheme.onBackground,
                            modifier = Modifier.padding(top = 3.dp),
                        )
                    }
                    Column {
                        Text(t(StringKey.BUDGETS_LIMIT_TOTAL), fontSize = 12.sp, color = colors.textDim)
                        Text(format(totalLimit), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, softWrap = false)
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
                    fontSize = 12.sp,
                    color = colors.textDim,
                    modifier = Modifier.padding(top = 9.dp),
                )
            }
        }

        item {
            DashedNewRow(label = t(StringKey.BUDGETS_NEW), onClick = { draft = BudgetEditDraft() })
        }

        items(progressList, key = { it.budget.id }) { progress ->
            BudgetCard(progress) { draft = BudgetEditDraft.from(progress) }
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

    draft?.let { d ->
        BudgetSheet(
            draft = d,
            onChange = { draft = it.copy(error = null) },
            onDismiss = { draft = null },
            onSave = { save ->
                scope.launch {
                    try {
                        if (d.id == null) AppContainer.budgetRepository.create(save) else AppContainer.budgetRepository.update(d.id, save)
                        draft = null
                    } catch (e: HttpException) {
                        draft = d.copy(error = if (e.code() == 409) tr(StringKey.BUD_TAKEN) else t(StringKey.COMMON_SAVE_ERROR))
                    } catch (e: Exception) {
                        draft = d.copy(error = t(StringKey.COMMON_SAVE_ERROR))
                    }
                }
            },
            onDelete = {
                val b = progressList.firstOrNull { it.budget.id == d.id } ?: return@BudgetSheet
                val principal = AppContainer.currencyRepository.principal
                val label = b.budget.name ?: categoryName(b.budget.category)
                Confirm.ask(
                    ConfirmRequest(
                        title = tr(StringKey.BUD_DELETE_TITLE, label),
                        lines = listOf(
                            tr(StringKey.BUD_DELETE_SPENT, formatMoney(b.spent, principal), formatMoney(b.budget.limit, principal)) +
                                if (b.budget.period == BudgetPeriod.CUSTOM) " · " + fmtDate(b.budget.startDate) + " – " + fmtDate(b.budget.endDate) else " " + tr(StringKey.BUD_THIS_MONTH),
                            tr(StringKey.BUD_DELETE_HISTORY),
                            tr(StringKey.BUD_DELETE_KEEP),
                        ),
                        ack = tr(StringKey.BUD_DELETE_ACK),
                        cta = tr(StringKey.BUD_DELETE),
                        onConfirm = {
                            draft = null
                            scope.launch { runCatching { AppContainer.budgetRepository.delete(b.budget.id) } }
                        },
                    ),
                )
            },
        )
    }
}

// Mockup budget card: 38 dp mark (plan icon for custom budgets), name,
// tone % pill and pencil, scope line, "spent de limit · periodo", 6 dp bar;
// --neg-soft border from 90 %.
@Composable
private fun BudgetCard(progress: BudgetProgress, onEdit: () -> Unit) {
    val colors = NovaColors.current
    val principal = AppContainer.currencyRepository.principal
    val b = progress.budget
    val (tone, bg) = toneOf(progress.percentage)
    val shape = RoundedCornerShape(18.dp)
    val custom = b.kind == BudgetKind.CUSTOM
    val repo = AppContainer.categoryRepository
    val walletNames = AppContainer.walletRepository.wallets.value.filter { it.id in b.walletIds }.map { shortWallet(it.name) }
    val scope = if (custom) tr(StringKey.BUD_SCOPE_CUSTOM, b.assignedCount)
    else repo.label(b.category) + (if (repo.node(b.category)?.parentId != null) "" else " · " + tr(StringKey.BUD_ALL)) + (if (walletNames.isNotEmpty()) tr(StringKey.BUD_SCOPE_ONLY_WALLETS, walletNames.joinToString(", ")) else "")
    val period = if (b.period == BudgetPeriod.CUSTOM) fmtDate(b.startDate) + " – " + fmtDate(b.endDate) + " · " + tr(StringKey.BUD_SCOPE_NO_RESET) else tr(StringKey.NM_FREQ_MONTHLY)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, if (progress.percentage >= 90) colors.negativeBorder else MaterialTheme.colorScheme.outline, shape)
            .clickable(onClick = onEdit)
            .padding(horizontal = 17.dp, vertical = 15.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(13.dp)) {
            if (custom) PlanMark(b.icon, 38.dp) else CatMark(b.category, 38.dp)
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(b.name ?: repo.name(b.category), fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                    Text("${progress.percentage}%", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = tone, maxLines = 1, softWrap = false, modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(bg).padding(horizontal = 8.dp, vertical = 3.dp))
                    Icon(MockupIcons.Pencil, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(15.dp))
                }
                Text(scope, fontSize = 12.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    tr(StringKey.NM_X_OF_Y, formatMoney(progress.spent, principal), formatMoney(b.limit, principal)) + " · " + period,
                    fontSize = 12.sp, color = colors.textDim, modifier = Modifier.padding(top = 3.dp), style = TextStyle(fontFeatureSettings = TNUM),
                )
            }
        }
        NovaProgressBar(percentage = progress.percentage.coerceAtMost(100), color = tone, height = 6.dp, cornerRadius = 3.dp, modifier = Modifier.padding(top = 12.dp))
        // The state in words, so it isn't carried by the bar's color alone
        // (same copy as the web's budgetStateNote).
        Text(budgetStateNote(progress, principal), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 9.dp), style = TextStyle(fontFeatureSettings = TNUM))
    }
}

private fun budgetStateNote(progress: BudgetProgress, principal: String): String {
    val b = progress.budget
    val start = b.startDate
    return when {
        b.period == BudgetPeriod.CUSTOM && b.kind == BudgetKind.CATEGORY && start != null && start > java.time.LocalDate.now().toString() -> tr(StringKey.PLAN_STATE_NOT_STARTED)
        progress.spent > b.limit -> tr(StringKey.PLAN_STATE_OVER, formatMoney(progress.spent - b.limit, principal))
        progress.percentage >= 90 -> tr(StringKey.PLAN_STATE_NEAR)
        progress.percentage >= 65 -> tr(StringKey.PLAN_STATE_WATCH)
        else -> tr(StringKey.PLAN_STATE_OK)
    }
}
