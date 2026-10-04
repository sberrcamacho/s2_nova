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

// Budget create/edit as guided steps (the single sheet was too crowded):
// 1 the kind, 2 the category (or the custom budget's name and icon), 3 the
// limit, period and wallets with a summary of what counts. Editing starts at
// step 3 and never shows step 1, because the kind is fixed once saved.
@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun BudgetSheet(draft: BudgetEditDraft, onChange: (BudgetEditDraft) -> Unit, onDismiss: () -> Unit, onSave: (BudgetRepository.Draft) -> Unit, onDelete: () -> Unit) {
    val d = draft
    val colors = NovaColors.current
    val repo = AppContainer.categoryRepository
    val wallets = AppContainer.walletRepository.wallets.value
    val editing = d.id != null
    val steps = if (editing) listOf(1, 2) else listOf(0, 1, 2)
    var index by remember { mutableStateOf(steps.lastIndex.takeIf { editing } ?: 0) }
    val step = steps[index]
    // A new budget's kind isn't preselected: the user picks it.
    var kindChosen by remember { mutableStateOf(editing) }
    val stepValid = when (step) {
        1 -> d.name.isNotBlank() && (d.custom || d.category != null)
        else -> d.valid
    }

    StepSheet(
        title = tr(if (editing) StringKey.BUD_EDIT else StringKey.BUD_NEW),
        step = index,
        stepCount = steps.size,
        onBack = { index-- },
        onDismiss = onDismiss,
        primaryLabel = tr(if (step < 2) StringKey.STEP_CONTINUE else if (editing) StringKey.STEP_SAVE_CHANGES else StringKey.BUD_SAVE),
        primaryEnabled = stepValid,
        onPrimary = { if (step < 2) index++ else onSave(d.toSave()) },
        showPrimary = step != 0,
        footer = if (editing) ({ StepDeleteButton(tr(StringKey.BUD_DELETE), onDelete) }) else null,
        context = if (editing) d.name else null,
    ) { shown ->
        when (steps[shown]) {
            0 -> {
                StepQuestion(tr(StringKey.BUD_Q_KIND))
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    ChoiceCard(V2Icons.target, colors.link, tr(StringKey.BUD_CHOICE_CATEGORY), tr(StringKey.BUD_CHOICE_CATEGORY_DETAIL), kindChosen && !d.custom, {
                        kindChosen = true
                        onChange(d.copy(kind = BudgetKind.CATEGORY, name = if (d.nameTouched) d.name else (d.sub ?: d.category)?.let { repo.name(it) }.orEmpty()))
                        index++
                    })
                    ChoiceCard(V2Icons.sparkle, colors.link, tr(StringKey.BUD_CHOICE_CUSTOM), tr(StringKey.BUD_CHOICE_CUSTOM_DETAIL), kindChosen && d.custom, {
                        kindChosen = true
                        onChange(d.copy(kind = BudgetKind.CUSTOM, name = if (d.nameTouched) d.name else ""))
                        index++
                    })
                }
            }
            1 -> if (d.custom) {
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
                GridOf(repo.parents(false, includeHidden = false), categoryGridColumns(repo.parents(false, includeHidden = false).map { repo.name(it.id) }), 18.dp, 8.dp) { p ->
                    val on = d.category == p.id
                    Column(
                        Modifier.selectable(selected = on, role = Role.RadioButton) {
                            onChange(d.copy(category = p.id, sub = null, auto = false, name = if (d.nameTouched) d.name else repo.name(p.id)))
                        },
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(7.dp),
                    ) {
                        GridChip(repo.glyph(p.id), Color(p.color), on)
                        GridLabel(repo.name(p.id), on)
                    }
                }
                val parent = d.category
                if (parent != null && repo.children(parent).isNotEmpty()) {
                    StepSpacer()
                    FieldLabel(tr(StringKey.NM_SUBCATEGORY))
                    PillRow {
                        V2Pill(tr(StringKey.BUD_ALL_SUBS), d.sub == null, { onChange(d.copy(sub = null, name = if (d.nameTouched) d.name else repo.name(parent))) })
                        repo.children(parent).forEach { c ->
                            V2Pill(repo.name(c.id), d.sub == c.id, { onChange(d.copy(sub = c.id, name = if (d.nameTouched) d.name else repo.name(c.id))) })
                        }
                    }
                }
                if (parent != null) {
                    StepSpacer()
                    NameField(tr(StringKey.PLAN_NAME), d.name, { onChange(d.copy(name = it, nameTouched = it.isNotBlank())) }, tr(StringKey.BUD_PH_CATEGORY))
                }
            }
            else -> {
                StepQuestion(tr(StringKey.BUD_Q_LIMIT))
                AmountHeroField(tr(StringKey.BUD_LIMIT), d.limit, { onChange(d.copy(limit = it)) }, AppContainer.currencyRepository.principal)
                StepSpacer()
                FieldLabel(tr(StringKey.BUD_PERIOD))
                PillRow {
                    V2Pill(tr(StringKey.NM_FREQ_MONTHLY), d.period == BudgetPeriod.MONTHLY, { onChange(d.copy(period = BudgetPeriod.MONTHLY)) })
                    V2Pill(tr(StringKey.BUD_CUSTOM_RANGE), d.period == BudgetPeriod.CUSTOM, { onChange(d.copy(period = BudgetPeriod.CUSTOM)) })
                }
                if (d.period == BudgetPeriod.CUSTOM) {
                    Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Column(Modifier.weight(1f)) { FieldLabel(tr(StringKey.NM_WALLET_FROM)); DateBox(d.start) { onChange(d.copy(start = it)) } }
                        Column(Modifier.weight(1f)) { FieldLabel(tr(StringKey.BUD_UNTIL)); DateBox(d.end) { onChange(d.copy(end = it)) } }
                    }
                }
                if (!d.custom && wallets.size > 1) {
                    StepSpacer()
                    FieldLabel(tr(StringKey.BUD_WALLETS))
                    PillRow {
                        V2Pill(tr(StringKey.BUD_ALL), d.walletIds.isEmpty(), { onChange(d.copy(walletIds = emptyList())) })
                        wallets.forEach { w ->
                            V2Pill(shortWallet(w.name), w.id in d.walletIds, {
                                onChange(d.copy(walletIds = if (w.id in d.walletIds) d.walletIds - w.id else d.walletIds + w.id))
                            }, role = Role.Checkbox)
                        }
                    }
                }
                StepSpacer()
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
