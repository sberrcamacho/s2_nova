package com.s2nova.app.ui.screens.budgets

import com.s2nova.app.ui.tour.tourTarget
import com.s2nova.app.ui.theme.appCanvas
import com.s2nova.app.ui.theme.cardAurora
import com.s2nova.app.ui.theme.ctaBrush
import com.s2nova.app.ui.theme.novaRise
import com.s2nova.app.ui.theme.rememberIntroProgress
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.foundation.lazy.itemsIndexed
import com.s2nova.app.ui.theme.novaItem
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.screens.home.BudgetTone
import com.s2nova.app.ui.screens.home.toneColor
import com.s2nova.app.ui.theme.NovaType
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
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.Brush
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
        containerColor = Color.Transparent,
        modifier = Modifier.appCanvas(MaterialTheme.colorScheme.background),
        // The app shell already pads for the status bar.
        contentWindowInsets = androidx.compose.foundation.layout.WindowInsets(0),
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            Column(modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp)) {
                Text(
                    t(StringKey.TITLE_PLANS),
                    style = NovaType.headline,
                    color = MaterialTheme.colorScheme.onBackground,
                    modifier = Modifier.semantics { heading() },
                )
                Box(Modifier.tourTarget("planes.tabs", 0.dp)) {
                    PlanesTabs(
                        labels = listOf(t(StringKey.TITLE_BUDGETS), t(StringKey.GOALS_TITLE), t(StringKey.PLANS_TAB)),
                        selected = tab,
                        onSelect = { tab = it },
                    )
                }
            }
            when (tab) {
                0 -> BudgetsTab()
                1 -> GoalsTab(snackbarHostState = snackbarHostState)
                else -> LoansTab(initialSide = initialLoanSide)
            }
        }
    }
}

// Text tabs over a 1 dp `border` rule: `label` text, the selected one in
// `text` with a 2 dp `primary-border` indicator over the rule; 48 dp tall
// with tab semantics. They scroll instead of wrapping a label with large text.
@Composable
private fun PlanesTabs(labels: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    val line = MaterialTheme.colorScheme.outline
    val accent = ctaBrush()
    val scroll = rememberScrollState()
    val fadeColor = MaterialTheme.colorScheme.background
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp)
            .drawBehind {
                val h = 1.dp.toPx()
                drawRect(line, topLeft = Offset(0f, size.height - h), size = Size(size.width, h))
            }
            // A visible edge fade when a tab is out of view (large text).
            .drawWithContent {
                drawContent()
                val w = 32.dp.toPx()
                if (scroll.canScrollForward) drawRect(Brush.horizontalGradient(listOf(fadeColor.copy(alpha = 0f), fadeColor), startX = size.width - w, endX = size.width), topLeft = Offset(size.width - w, 0f), size = Size(w, size.height - 1.dp.toPx()))
                if (scroll.canScrollBackward) drawRect(Brush.horizontalGradient(listOf(fadeColor, fadeColor.copy(alpha = 0f)), startX = 0f, endX = w), size = Size(w, size.height - 1.dp.toPx()))
            }
            .horizontalScroll(scroll)
            .selectableGroup(),
    ) {
        labels.forEachIndexed { index, label ->
            val on = index == selected
            // The brand underline grows out from the center when a tab is
            // chosen (web's [role=tab] underline).
            val grow by androidx.compose.animation.core.animateFloatAsState(
                if (on) 1f else 0f,
                androidx.compose.animation.core.tween(if (on) 260 else 160, easing = com.s2nova.app.ui.theme.NovaMotion.EmphasizedDecelerate),
                label = "tabLine",
            )
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .heightIn(min = 48.dp)
                    .selectable(selected = on, role = Role.Tab, onClick = { onSelect(index) })
                    .drawBehind {
                        if (grow > 0f) {
                            val h = 3.dp.toPx()
                            val w = size.width * grow
                            drawRoundRect(accent, topLeft = Offset((size.width - w) / 2f, size.height - h), size = Size(w, h), cornerRadius = androidx.compose.ui.geometry.CornerRadius(h / 2f))
                        }
                    }
                    .padding(horizontal = 14.dp),
            ) {
                Text(
                    label,
                    style = NovaType.label.copy(fontWeight = if (on) FontWeight.SemiBold else FontWeight.SemiBold),
                    color = if (on) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    softWrap = false,
                )
            }
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
    val dataLoaded by AppContainer.dataLoaded.collectAsStateWithLifecycle()
    val totalLimit = progressList.sumOf { it.budget.limit }
    val totalSpent = progressList.sumOf { it.spent }
    val totalPct = if (totalLimit > 0) ((totalSpent / totalLimit) * 100).toInt() else 0

    var draft by remember { mutableStateOf<BudgetEditDraft?>(null) }

    LazyColumn(
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            val today = java.time.LocalDate.now()
            val daysLeft = today.lengthOfMonth() - today.dayOfMonth
            val available = (totalLimit - totalSpent).coerceAtLeast(0.0)
            val shape = RoundedCornerShape(16.dp)
            Column(
                modifier = Modifier
                    .novaRise(0)
                    .fillMaxWidth()
                    .clip(shape)
                    .background(MaterialTheme.colorScheme.surface)
                    .cardAurora()
                    .border(1.dp, MaterialTheme.colorScheme.outline, shape)
                    .padding(16.dp),
            ) {
                // Both figures stay whole: when they don't fit side by side
                // (small screen, large text) the limit moves to a second line.
                FlowRow(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Column {
                        Text(t(StringKey.BUDGETS_SPENT_LABEL).uppercase(), style = NovaType.overline, color = colors.textDim, maxLines = 1, softWrap = false)
                        Text(
                            format(totalSpent),
                            maxLines = 1,
                            softWrap = false,
                            style = NovaType.headline.copy(fontFeatureSettings = "tnum"),
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.padding(top = 2.dp),
                        )
                    }
                    Column {
                        Text(t(StringKey.BUDGETS_LIMIT_TOTAL).uppercase(), style = NovaType.overline, color = colors.textDim, maxLines = 1, softWrap = false)
                        Text(format(totalLimit), style = NovaType.amount, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, softWrap = false, modifier = Modifier.padding(top = 2.dp))
                    }
                }
                BudgetBar(percentage = totalPct, modifier = Modifier.padding(top = 12.dp))
                Text(
                    if (daysLeft == 0) tr(StringKey.BUDGETS_LAST_DAY_NOTE, format(available))
                    else String.format(t(StringKey.BUDGETS_DAYS_LEFT_NOTE), daysLeft, format(available)),
                    style = NovaType.bodySm.copy(fontFeatureSettings = "tnum"),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }

        item {
            DashedNewRow(label = t(StringKey.BUDGETS_NEW), onClick = { draft = BudgetEditDraft() }, modifier = Modifier.tourTarget("planes.create", 16.dp))
        }

        itemsIndexed(progressList, key = { _, it -> it.budget.id }) { i, progress ->
            androidx.compose.foundation.layout.Box(novaItem().novaRise(i + 1).then(if (i == 0) Modifier.tourTarget("planes.card", 20.dp) else Modifier)) { BudgetCard(progress) { draft = BudgetEditDraft.from(progress) } }
        }

        if (progressList.isEmpty() && !dataLoaded) {
            item { com.s2nova.app.ui.components.NovaSkeletonRows(count = 3, modifier = Modifier.padding(vertical = 8.dp)) }
        } else if (progressList.isEmpty()) {
            item {
                Text(
                    t(StringKey.BUDGETS_EMPTY),
                    style = NovaType.bodySm,
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

// BudgetBar (DESIGN-SYSTEM.md §6.8) inside a flat card: the name with the
// percentage and its state icon on the first line, the scope and period
// below, the 8 dp bar, then "spent de limit" with the state in words. The
// tone never travels by color alone. The card opens the budget's sheet and
// reads as one sentence.
@Composable
private fun BudgetCard(progress: BudgetProgress, onEdit: () -> Unit) {
    val colors = NovaColors.current
    val principal = AppContainer.currencyRepository.principal
    val b = progress.budget
    val tone = toneColor(budgetTone(progress.percentage), colors)
    val shape = RoundedCornerShape(16.dp)
    val custom = b.kind == BudgetKind.CUSTOM
    val repo = AppContainer.categoryRepository
    val walletNames = AppContainer.walletRepository.wallets.value.filter { it.id in b.walletIds }.map { shortWallet(it.name) }
    val scope = if (custom) tr(StringKey.BUD_SCOPE_CUSTOM, b.assignedCount)
    else repo.label(b.category) + (if (repo.node(b.category)?.parentId != null) "" else " · " + tr(StringKey.BUD_ALL)) + (if (walletNames.isNotEmpty()) tr(StringKey.BUD_SCOPE_ONLY_WALLETS, walletNames.joinToString(", ")) else "")
    val period = if (b.period == BudgetPeriod.CUSTOM) fmtDate(b.startDate) + " – " + fmtDate(b.endDate) + " · " + tr(StringKey.BUD_SCOPE_NO_RESET) else tr(StringKey.NM_FREQ_MONTHLY)
    val name = b.name ?: repo.name(b.category)
    val spent = formatMoney(progress.spent, principal)
    val limit = formatMoney(b.limit, principal)
    val state = budgetStateNote(progress, principal)
    val editLabel = tr(StringKey.BUD_EDIT)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(MaterialTheme.colorScheme.surface)
            .cardAurora()
            .border(1.dp, if (progress.percentage >= 90) colors.negativeBorder else MaterialTheme.colorScheme.outline, shape)
            .clickable(onClickLabel = editLabel, role = Role.Button, onClick = onEdit)
            .clearAndSetSemantics {
                contentDescription = tr(StringKey.PLAN_STATE_A11Y, name, progress.percentage, state, spent, limit, period)
                role = Role.Button
                onClick(label = editLabel) { onEdit(); true }
            }
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            if (custom) PlanMark(b.icon, 40.dp) else CatMark(b.category, 40.dp)
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(name, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                    BudgetPercent(progress.percentage)
                    Icon(MockupIcons.Pencil, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                }
                Text("$scope · $period", style = NovaType.bodySm, color = colors.textDim, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        BudgetBar(percentage = progress.percentage, modifier = Modifier.padding(top = 12.dp))
        // Both stay whole: the state drops under the figures when they don't fit.
        FlowRow(
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(tr(StringKey.NM_X_OF_Y, spent, limit), style = NovaType.bodySm.copy(fontFeatureSettings = "tnum"), color = MaterialTheme.colorScheme.onSurface, maxLines = 1, softWrap = false)
            Text(state, style = NovaType.bodySm.copy(fontFeatureSettings = "tnum"), color = if (progress.percentage >= 65) tone else MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, softWrap = false)
        }
    }
}

// "94 %" plus the state icon (✓ / ⚠ / !) in the budget's tone.
@Composable
private fun BudgetPercent(percentage: Int) {
    val tone = budgetTone(percentage)
    val color = toneColor(tone, NovaColors.current)
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Text("$percentage%", style = NovaType.label.copy(fontFeatureSettings = "tnum"), color = color, maxLines = 1, softWrap = false)
        V2Icon(
            when (tone) {
                BudgetTone.NEGATIVE -> V2Icons.alertCircle
                BudgetTone.WARNING -> V2Icons.warn
                BudgetTone.POSITIVE -> V2Icons.check
            },
            color, 16.dp,
        )
    }
}

// Track 8 dp on `surface-sunken`, the fill in the tone, capped at 100 %.
@Composable
private fun BudgetBar(percentage: Int, modifier: Modifier = Modifier) {
    val colors = NovaColors.current
    // Fills from the left on first show (web .nova-fill).
    val fill = rememberIntroProgress()
    Box(modifier = modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(999.dp)).background(colors.surfaceSunken)) {
        Box(
            modifier = Modifier
                .fillMaxWidth(percentage.coerceIn(0, 100) / 100f)
                .graphicsLayer { scaleX = fill; transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0f, 0.5f) }
                .height(8.dp)
                .clip(RoundedCornerShape(999.dp))
                .background(toneColor(budgetTone(percentage), colors)),
        )
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
