package com.s2nova.app.ui.screens.budgets

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.Taxonomy
import com.s2nova.app.data.fmtDate
import com.s2nova.app.data.model.BudgetKind
import com.s2nova.app.data.model.BudgetPeriod
import com.s2nova.app.data.model.BudgetProgress
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.repository.BudgetRepository
import com.s2nova.app.ui.components.AmountHeroField
import com.s2nova.app.ui.components.ChoiceCard
import com.s2nova.app.ui.components.NameField
import com.s2nova.app.ui.components.PlanIconPicker
import com.s2nova.app.ui.components.StepDeleteButton
import com.s2nova.app.ui.components.StepNote
import com.s2nova.app.ui.components.StepQuestion
import com.s2nova.app.ui.components.StepSheet
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.Spacer
import com.s2nova.app.ui.components.StepDivider
import com.s2nova.app.ui.components.StepOptionGroup
import com.s2nova.app.ui.components.StepOptionRow
import com.s2nova.app.ui.components.StepChoiceRow
import com.s2nova.app.ui.components.StepSubPage
import com.s2nova.app.ui.components.StepSpacer
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.screens.addtransaction.categoryGridColumns
import androidx.compose.foundation.selection.selectable
import androidx.compose.ui.semantics.Role
import com.s2nova.app.ui.components.BareField
import com.s2nova.app.ui.components.CatMark
import com.s2nova.app.ui.components.FieldLabel
import com.s2nova.app.ui.components.FieldNote
import com.s2nova.app.ui.components.InputBox
import com.s2nova.app.ui.components.MoneyInput
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.OptionTile
import com.s2nova.app.ui.components.PillRow
import com.s2nova.app.ui.components.PlanMark
import com.s2nova.app.ui.components.SheetHeader
import com.s2nova.app.ui.components.SheetTextAction
import com.s2nova.app.ui.components.TNUM
import com.s2nova.app.ui.components.V2Button
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.components.V2Pill
import com.s2nova.app.ui.components.hexColor
import com.s2nova.app.ui.components.noRippleClick
import com.s2nova.app.ui.screens.addtransaction.DateBox
import com.s2nova.app.ui.screens.addtransaction.GridChip
import com.s2nova.app.ui.screens.addtransaction.GridLabel
import com.s2nova.app.ui.screens.addtransaction.GridOf
import com.s2nova.app.ui.screens.addtransaction.shortWallet
import com.s2nova.app.ui.suggestExpenseCategory
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.tr
import com.s2nova.app.ui.StringKey

// Budget create/edit (PLANS.md §4): kind switch, Nombre with its tappable
// mark (▾), Monto, the inline Icono grid for Personalizado, and option tiles
// (Categoría, Billeteras, Periodo) that open their own sheets.

data class BudgetEditDraft(
    val id: String? = null,
    val kind: BudgetKind = BudgetKind.CATEGORY,
    val name: String = "",
    val limit: String = "",
    val category: CategoryId? = null,
    val sub: CategoryId? = null,
    val icon: String = "other",
    val iconAuto: Boolean = true,
    val walletIds: List<String> = emptyList(),
    val period: BudgetPeriod = BudgetPeriod.MONTHLY,
    val start: String = "",
    val end: String = "",
    val auto: Boolean = true,
    // The name is typed by the user (otherwise it is the suggested category name).
    val nameTouched: Boolean = false,
    val error: String? = null,
) {
    val custom get() = kind == BudgetKind.CUSTOM
    val valid get() = com.s2nova.app.ui.screens.addtransaction.AmountPad.eval(limit) > 0 &&
        (period != BudgetPeriod.CUSTOM || (start.isNotBlank() && end.isNotBlank() && end >= start)) &&
        name.isNotBlank() && (custom || category != null)

    fun toSave(): BudgetRepository.Draft {
        val scope = sub ?: category
        return BudgetRepository.Draft(
            kind = kind,
            name = name.trim(),
            category = if (custom) null else scope,
            icon = if (custom) icon else null,
            walletIds = if (custom) emptyList() else walletIds,
            limit = com.s2nova.app.ui.screens.addtransaction.AmountPad.eval(limit),
            period = period,
            startDate = if (period == BudgetPeriod.CUSTOM) start else null,
            endDate = if (period == BudgetPeriod.CUSTOM) end else null,
        )
    }

    companion object {
        fun from(p: BudgetProgress): BudgetEditDraft {
            val b = p.budget
            val repo = AppContainer.categoryRepository
            val node = repo.node(b.category)
            return BudgetEditDraft(
                id = b.id, kind = b.kind, name = b.name ?: if (b.kind == BudgetKind.CUSTOM) "" else repo.name(b.category), limit = com.s2nova.app.ui.screens.addtransaction.AmountPad.numStr(b.limit),
                category = node?.parentId ?: b.category, sub = if (node?.parentId != null) b.category else null,
                icon = b.icon ?: "other", iconAuto = false, walletIds = b.walletIds, period = b.period,
                start = b.startDate.orEmpty(), end = b.endDate.orEmpty(), auto = false, nameTouched = true,
            )
        }
    }
}

// Budget create/edit as guided steps that never scroll (DESIGN-SYSTEM.md
// §6.9). Category kind: Tipo → Categoría (tap advances) → Subcategoría
// (only when the category has some; tap advances) → Límite (amount, name,
// and Periodo / Billeteras rows that open their own sub-pages). Custom kind:
// Tipo → Nombre e icono → Límite. Editing starts at Límite and never shows
// Tipo, because the kind is fixed once saved.
private const val KIND = 0
private const val CATEGORY = 1
private const val SUB = 2
private const val LIMIT = 3

@Composable
fun BudgetSheet(draft: BudgetEditDraft, onChange: (BudgetEditDraft) -> Unit, onDismiss: () -> Unit, onSave: (BudgetRepository.Draft) -> Unit, onDelete: () -> Unit) {
    val d = draft
    val colors = NovaColors.current
    val repo = AppContainer.categoryRepository
    val wallets = AppContainer.walletRepository.wallets.value
    val editing = d.id != null
    val hasSubs = !d.custom && d.category?.let { repo.children(it).isNotEmpty() } == true
    val steps = buildList {
        if (!editing) add(KIND)
        add(CATEGORY)
        if (hasSubs) add(SUB)
        add(LIMIT)
    }
    var index by remember { mutableStateOf(if (editing) Int.MAX_VALUE else 0) }
    val at = index.coerceAtMost(steps.lastIndex)
    val step = steps[at]
    // A new budget's kind isn't preselected: the user picks it.
    var kindChosen by remember { mutableStateOf(editing) }
    var sub by remember { mutableStateOf<String?>(null) }
    val stepValid = when (step) {
        CATEGORY -> if (d.custom) d.name.isNotBlank() else d.category != null
        else -> d.valid
    }
    val next = { index = at + 1 }

    val subPage = when (sub) {
        "period" -> StepSubPage("period", tr(StringKey.BUD_Q_PERIOD)) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                StepChoiceRow(tr(StringKey.NM_FREQ_MONTHLY), d.period == BudgetPeriod.MONTHLY, { onChange(d.copy(period = BudgetPeriod.MONTHLY)) })
                StepChoiceRow(tr(StringKey.BUD_CUSTOM_RANGE), d.period == BudgetPeriod.CUSTOM, { onChange(d.copy(period = BudgetPeriod.CUSTOM)) })
            }
            if (d.period == BudgetPeriod.CUSTOM) {
                Row(Modifier.padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Column(Modifier.weight(1f)) { FieldLabel(tr(StringKey.NM_WALLET_FROM)); DateBox(d.start) { onChange(d.copy(start = it)) } }
                    Column(Modifier.weight(1f)) { FieldLabel(tr(StringKey.BUD_UNTIL)); DateBox(d.end) { onChange(d.copy(end = it)) } }
                }
            }
        }
        "wallets" -> StepSubPage("wallets", tr(StringKey.BUD_Q_WALLETS)) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                StepChoiceRow(tr(StringKey.BUD_ALL), d.walletIds.isEmpty(), { onChange(d.copy(walletIds = emptyList())) })
                wallets.forEach { w ->
                    StepChoiceRow(shortWallet(w.name), w.id in d.walletIds, {
                        onChange(d.copy(walletIds = if (w.id in d.walletIds) d.walletIds - w.id else d.walletIds + w.id))
                    }, multi = true)
                }
            }
        }
        else -> null
    }

    StepSheet(
        title = tr(if (editing) StringKey.BUD_EDIT else StringKey.BUD_NEW),
        step = at,
        stepCount = steps.size,
        onBack = { index = at - 1 },
        onDismiss = onDismiss,
        primaryLabel = tr(if (step != LIMIT) StringKey.STEP_CONTINUE else if (editing) StringKey.STEP_SAVE_CHANGES else StringKey.BUD_SAVE),
        primaryEnabled = stepValid,
        onPrimary = { if (step != LIMIT) next() else onSave(d.toSave()) },
        // Choice steps advance on tap.
        showPrimary = step == LIMIT || (step == CATEGORY && d.custom),
        showBack = at > 0,
        footer = if (editing && step == LIMIT) ({ StepDeleteButton(tr(StringKey.BUD_DELETE), onDelete) }) else null,
        context = if (step == KIND) null else if (editing) d.name else (d.sub ?: d.category)?.takeIf { !d.custom }?.let { repo.name(it) },
        subPage = subPage,
        onSubDone = { sub = null },
    ) { shown ->
        when (steps[shown.coerceAtMost(steps.lastIndex)]) {
            KIND -> {
                StepQuestion(tr(StringKey.BUD_Q_KIND))
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    ChoiceCard(V2Icons.target, colors.link, tr(StringKey.BUD_CHOICE_CATEGORY), tr(StringKey.BUD_CHOICE_CATEGORY_DETAIL), kindChosen && !d.custom, {
                        kindChosen = true
                        onChange(d.copy(kind = BudgetKind.CATEGORY, name = if (d.nameTouched) d.name else (d.sub ?: d.category)?.let { repo.name(it) }.orEmpty()))
                        next()
                    })
                    ChoiceCard(V2Icons.sparkle, colors.link, tr(StringKey.BUD_CHOICE_CUSTOM), tr(StringKey.BUD_CHOICE_CUSTOM_DETAIL), kindChosen && d.custom, {
                        kindChosen = true
                        onChange(d.copy(kind = BudgetKind.CUSTOM, name = if (d.nameTouched) d.name else ""))
                        next()
                    })
                }
            }
            CATEGORY -> if (d.custom) {
                StepQuestion(tr(StringKey.BUD_Q_CUSTOM), tr(StringKey.BUD_KIND_CUSTOM_HINT))
                NameField(tr(StringKey.PLAN_NAME), d.name, { name ->
                    onChange(d.copy(name = name, nameTouched = true, icon = if (d.iconAuto) Taxonomy.guessPlanIcon(name) ?: "other" else d.icon))
                }, tr(StringKey.BUD_PH_CUSTOM), leading = { PlanMark(d.icon, 44.dp) })
                FieldNote(
                    tr(if (d.iconAuto && Taxonomy.guessPlanIcon(d.name) != null) StringKey.PLAN_ICON_GUESS else StringKey.BUD_ICON_PICK),
                    Modifier.padding(top = 8.dp, start = 4.dp),
                )
                StepSpacer()
                FieldLabel(tr(StringKey.PLAN_ICON))
                PlanIconPicker(d.icon) { onChange(d.copy(icon = it, iconAuto = false)) }
            } else {
                StepQuestion(tr(StringKey.BUD_Q_CATEGORY), tr(StringKey.BUD_CAT_HINT))
                val parents = repo.parents(false, includeHidden = false)
                GridOf(parents, categoryGridColumns(parents.map { repo.name(it.id) }), 14.dp, 6.dp) { p ->
                    val on = d.category == p.id
                    Column(
                        Modifier.selectable(selected = on, role = Role.RadioButton) {
                            val keepSub = d.category == p.id
                            onChange(d.copy(category = p.id, sub = if (keepSub) d.sub else null, auto = false, name = if (d.nameTouched) d.name else repo.name(if (keepSub) d.sub ?: p.id else p.id)))
                            next()
                        },
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        GridChip(repo.glyph(p.id), Color(p.color), on)
                        GridLabel(repo.name(p.id), on)
                    }
                }
            }
            SUB -> {
                val parent = d.category ?: return@StepSheet
                StepQuestion(tr(StringKey.BUD_Q_SUB, repo.name(parent)), tr(StringKey.BUD_Q_SUB_HINT))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    StepChoiceRow(tr(StringKey.BUD_ALL_SUBS), d.sub == null, {
                        onChange(d.copy(sub = null, name = if (d.nameTouched) d.name else repo.name(parent)))
                        next()
                    }, leading = { CatMark(parent, 32.dp) })
                    repo.children(parent).forEach { c ->
                        StepChoiceRow(repo.name(c.id), d.sub == c.id, {
                            onChange(d.copy(sub = c.id, name = if (d.nameTouched) d.name else repo.name(c.id)))
                            next()
                        }, leading = { CatMark(c.id, 32.dp) })
                    }
                }
            }
            else -> {
                StepQuestion(tr(StringKey.BUD_Q_LIMIT))
                AmountHeroField(tr(StringKey.BUD_LIMIT), d.limit, { onChange(d.copy(limit = it)) }, AppContainer.currencyRepository.principal)
                Spacer(Modifier.height(12.dp))
                NameField(tr(StringKey.PLAN_NAME), d.name, { onChange(d.copy(name = it, nameTouched = it.isNotBlank())) }, tr(if (d.custom) StringKey.BUD_PH_CUSTOM else StringKey.BUD_PH_CATEGORY), leading = {
                    if (d.custom) PlanMark(d.icon, 40.dp) else CatMark(d.sub ?: d.category, 40.dp)
                })
                Spacer(Modifier.height(12.dp))
                StepOptionGroup {
                    StepOptionRow(V2Icons.cal, tr(StringKey.BUD_PERIOD), if (d.period == BudgetPeriod.CUSTOM) periodRange(d) else tr(StringKey.NM_FREQ_MONTHLY)) { sub = "period" }
                    if (!d.custom && wallets.size > 1) {
                        StepDivider()
                        StepOptionRow(V2Icons.wallet, tr(StringKey.BUD_WALLETS), if (d.walletIds.isEmpty()) tr(StringKey.BUD_ALL) else wallets.filter { it.id in d.walletIds }.joinToString(", ") { shortWallet(it.name) }) { sub = "wallets" }
                    }
                }
                Spacer(Modifier.height(12.dp))
                StepNote(budgetScopeNote(d, wallets.filter { it.id in d.walletIds }.map { shortWallet(it.name) }))
                d.error?.let {
                    Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        V2Icon(V2Icons.alertCircle, colors.negative, 18.dp)
                        Text(it, style = com.s2nova.app.ui.theme.NovaType.bodySm, color = colors.negative)
                    }
                }
            }
        }
    }
}

// "1 oct – 31 oct", or "…" while a date is missing.
private fun periodRange(d: BudgetEditDraft): String =
    if (d.start.isBlank() || d.end.isBlank()) tr(StringKey.BUD_CUSTOM_RANGE) else fmtDate(d.start) + " – " + fmtDate(d.end)

// What the budget counts, in one sentence ("Todos los gastos de Alimentación,
// de todas tus billeteras · se reinicia cada mes.").
private fun budgetScopeNote(d: BudgetEditDraft, walletNames: List<String>): String {
    val repo = AppContainer.categoryRepository
    val reset = tr(if (d.period == BudgetPeriod.CUSTOM) StringKey.BUD_SCOPE_NO_RESET else StringKey.BUD_SCOPE_RESET)
    if (d.custom) return tr(StringKey.BUD_KIND_CUSTOM_HINT) + " " + reset.replaceFirstChar { it.uppercase() } + "."
    val category = d.category ?: return tr(StringKey.BUD_SCOPE_PICK)
    return (if (d.sub != null) tr(StringKey.BUD_SCOPE_ONLY, repo.label(d.sub)) else tr(StringKey.BUD_SCOPE_ALL, repo.name(category))) +
        (if (walletNames.isNotEmpty()) tr(StringKey.BUD_SCOPE_FROM, walletNames.joinToString(", ")) else tr(StringKey.BUD_SCOPE_ALL_WALLETS)) + " · " + reset + "."
}

// The PLAN_ICONS picker: 30 dp marks; the selected one has a 1.5 dp ring in
// its color.
@Composable
fun PlanIconGrid(selected: String, columns: Int, onPick: (String) -> Unit) {
    GridOf(Taxonomy.planIcons, columns, if (columns == 9) 4.dp else 6.dp, if (columns == 9) 4.dp else 6.dp) { p ->
        val color = hexColor(p.color)
        Box(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
                .border(1.5.dp, if (selected == p.key) color else Color.Transparent, RoundedCornerShape(12.dp))
                .noRippleClick { onPick(p.key) }.padding(vertical = 3.dp),
            contentAlignment = Alignment.Center,
        ) { PlanMark(p.key, 30.dp) }
    }
}
