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
    val error: String? = null,
) {
    val custom get() = kind == BudgetKind.CUSTOM
    val valid get() = com.s2nova.app.ui.screens.addtransaction.AmountPad.eval(limit) > 0 &&
        (period != BudgetPeriod.CUSTOM || (start.isNotBlank() && end.isNotBlank() && end >= start)) &&
        (if (custom) name.isNotBlank() else category != null)

    fun toSave(): BudgetRepository.Draft {
        val repo = AppContainer.categoryRepository
        val scope = sub ?: category
        return BudgetRepository.Draft(
            kind = kind,
            name = if (custom) name.trim() else name.trim().ifBlank { null }?.takeUnless { it == repo.name(scope) },
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
                id = b.id, kind = b.kind, name = b.name ?: repo.name(b.category), limit = com.s2nova.app.ui.screens.addtransaction.AmountPad.numStr(b.limit),
                category = node?.parentId ?: b.category, sub = if (node?.parentId != null) b.category else null,
                icon = b.icon ?: "other", iconAuto = false, walletIds = b.walletIds, period = b.period,
                start = b.startDate.orEmpty(), end = b.endDate.orEmpty(), auto = false,
            )
        }
    }
}

private enum class BSheet { CAT, SUB, ICON, WALLETS, PERIOD }

@Composable
fun BudgetSheet(draft: BudgetEditDraft, onChange: (BudgetEditDraft) -> Unit, onDismiss: () -> Unit, onSave: (BudgetRepository.Draft) -> Unit, onDelete: () -> Unit) {
    val d = draft
    val colors = NovaColors.current
    val repo = AppContainer.categoryRepository
    val wallets = AppContainer.walletRepository.wallets.value
    var bSheet by remember { mutableStateOf<BSheet?>(null) }
    val walletLabel = { ids: List<String> -> wallets.filter { it.id in ids }.map { shortWallet(it.name) } }

    NovaDraftSheet(onDismiss = onDismiss) {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            SheetHeader(tr(if (d.id != null) StringKey.BUD_EDIT else StringKey.BUD_NEW), bottom = 16.dp)
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Column {
                    PillRow {
                        V2Pill(tr(StringKey.BUD_KIND_CATEGORY), !d.custom, { if (d.id == null) onChange(d.copy(kind = BudgetKind.CATEGORY)) })
                        V2Pill(tr(StringKey.BUD_KIND_CUSTOM), d.custom, { if (d.id == null) onChange(d.copy(kind = BudgetKind.CUSTOM)) })
                    }
                    FieldNote(
                        tr(if (d.custom) StringKey.BUD_KIND_CUSTOM_HINT else StringKey.BUD_KIND_CATEGORY_HINT),
                        Modifier.padding(top = 8.dp),
                    )
                }
                Column {
                    FieldLabel(tr(StringKey.PLAN_NAME))
                    InputBox(vertical = 11.dp) {
                        Box(Modifier.noRippleClick { bSheet = if (d.custom) BSheet.ICON else BSheet.CAT }) {
                            if (d.custom) PlanMark(d.icon, 40.dp) else CatMark(d.sub ?: d.category ?: "exp.other", 40.dp)
                            Box(
                                Modifier.align(Alignment.BottomEnd).offset(2.dp, 2.dp).size(16.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary)
                                    .border(2.dp, colors.sheetSurface, CircleShape),
                                contentAlignment = Alignment.Center,
                            ) { Text("▾", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = Color.White) }
                        }
                        BareField(d.name, { name ->
                            if (d.custom) onChange(d.copy(name = name, icon = if (d.iconAuto) Taxonomy.guessPlanIcon(name) ?: "other" else d.icon))
                            else {
                                val leaf = Taxonomy.guessCategory(name, false)
                                val g = suggestExpenseCategory(name)
                                onChange(d.copy(name = name, category = if (d.auto && g != null) g else d.category, sub = if (d.auto && g != null) leaf?.takeIf { it != g } else d.sub))
                            }
                        }, tr(if (d.custom) StringKey.BUD_PH_CUSTOM else StringKey.BUD_PH_CATEGORY))
                    }
                    FieldNote(
                        tr(
                            if (d.custom) (if (d.iconAuto && Taxonomy.guessPlanIcon(d.name) != null) StringKey.PLAN_ICON_GUESS else StringKey.BUD_ICON_PICK)
                            else if (d.auto && suggestExpenseCategory(d.name) != null) StringKey.BUD_CAT_GUESS else StringKey.BUD_CAT_AUTO,
                        ),
                        Modifier.padding(top = 8.dp),
                    )
                }
                Column {
                    FieldLabel(tr(StringKey.NM_AMOUNT))
                    com.s2nova.app.ui.components.AmountField(d.limit, { onChange(d.copy(limit = it)) }, AppContainer.currencyRepository.principal, title = tr(StringKey.BUD_LIMIT))
                }
                if (d.custom) {
                    Column {
                        FieldLabel(tr(StringKey.PLAN_ICON))
                        PlanIconGrid(d.icon, 9) { onChange(d.copy(icon = it, iconAuto = false)) }
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    val tiles = mutableListOf<@Composable () -> Unit>()
                    if (!d.custom) {
                        val catLabel = d.category?.let { repo.name(d.sub ?: it) } ?: tr(StringKey.BUD_CATEGORY)
                        tiles += {
                            OptionTile(
                                if (d.category != null) repo.glyph(d.sub ?: d.category) else V2Icons.target, catLabel, d.category != null, { bSheet = BSheet.CAT },
                                Modifier.weight(1f), iconTint = d.category?.let { Color(repo.color(it)) },
                            )
                        }
                        val wl = walletLabel(d.walletIds)
                        tiles += { OptionTile(V2Icons.wallet, if (wl.isEmpty()) tr(StringKey.BUD_WALLETS) else if (wl.size == 1) wl[0] else tr(StringKey.BUD_N_WALLETS, wl.size), wl.isNotEmpty(), { bSheet = BSheet.WALLETS }, Modifier.weight(1f)) }
                    }
                    val per = if (d.period == BudgetPeriod.CUSTOM) (if (d.start.isNotBlank() && d.end.isNotBlank()) fmtDate(d.start) + " – " + fmtDate(d.end) else tr(StringKey.BUD_RANGE)) else tr(StringKey.NM_FREQ_MONTHLY)
                    tiles += { OptionTile(V2Icons.cal, per, d.period == BudgetPeriod.CUSTOM, { bSheet = BSheet.PERIOD }, Modifier.weight(1f)) }
                    tiles.forEach { it() }
                    repeat(5 - tiles.size) { Box(Modifier.weight(1f)) }
                }
                if (!d.custom) {
                    val wl = walletLabel(d.walletIds)
                    val note = if (d.category == null) tr(StringKey.BUD_SCOPE_PICK)
                    else (if (d.sub != null) tr(StringKey.BUD_SCOPE_ONLY, repo.label(d.sub)) else tr(StringKey.BUD_SCOPE_ALL, repo.name(d.category))) +
                        (if (wl.isNotEmpty()) tr(StringKey.BUD_SCOPE_FROM, wl.joinToString(", ")) else tr(StringKey.BUD_SCOPE_ALL_WALLETS)) + " · " +
                        tr(if (d.period == BudgetPeriod.CUSTOM) StringKey.BUD_SCOPE_NO_RESET else StringKey.BUD_SCOPE_RESET) + "."
                    Text(note, fontSize = 12.sp, lineHeight = 16.sp, color = colors.textDim, modifier = Modifier.offset(y = (-4).dp), style = TextStyle(fontFeatureSettings = TNUM))
                }
                d.error?.let { Text(it, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = colors.negative) }
                V2Button(tr(StringKey.COMMON_SAVE), enabled = d.valid, onClick = { onSave(d.toSave()) })
                if (d.id != null) SheetTextAction(tr(StringKey.BUD_DELETE), colors.negative, onDelete, weight = FontWeight.ExtraBold)
            }
        }
    }

    val sheet = bSheet ?: return
    NovaDraftSheet(onDismiss = { bSheet = null }, scrimAlpha = 0.72f) {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            val title = tr(mapOf(BSheet.CAT to StringKey.BUD_CATEGORY, BSheet.SUB to StringKey.NM_SUBCATEGORY, BSheet.ICON to StringKey.PLAN_ICON, BSheet.WALLETS to StringKey.BUD_WALLETS, BSheet.PERIOD to StringKey.BUD_PERIOD)[sheet]!!)
            val sub = when (sheet) {
                BSheet.SUB -> repo.name(d.category) + " · " + tr(StringKey.BUD_SUB_HINT)
                BSheet.WALLETS -> tr(StringKey.BUD_WALLETS_HINT)
                BSheet.PERIOD -> tr(if (d.period == BudgetPeriod.CUSTOM) StringKey.BUD_PERIOD_CUSTOM_HINT else StringKey.BUD_PERIOD_MONTHLY_HINT)
                BSheet.CAT -> tr(StringKey.BUD_CAT_HINT)
                BSheet.ICON -> tr(StringKey.BUD_ICON_HINT)
            }
            SheetHeader(title, sub, bottom = 16.dp)
            when (sheet) {
                BSheet.CAT -> GridOf(repo.parents(false), 5, 14.dp, 4.dp) { p ->
                    val on = d.category == p.id
                    Column(Modifier.noRippleClick {
                        onChange(d.copy(category = p.id, sub = null, auto = false))
                        bSheet = if (repo.children(p.id).isNotEmpty()) BSheet.SUB else null
                    }, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        GridChip(repo.glyph(p.id), Color(p.color), on, 46.dp, 30.dp)
                        GridLabel(repo.name(p.id), on)
                    }
                }
                BSheet.SUB -> {
                    val parent = d.category ?: "exp.other"
                    val items = listOf<Pair<String?, String>>(null to tr(StringKey.BUD_ALL)) + repo.children(parent).map { it.id to repo.name(it.id) }
                    GridOf(items, 5, 14.dp, 4.dp) { (id, name) ->
                        val on = d.sub == id
                        Column(Modifier.noRippleClick { onChange(d.copy(sub = id, auto = false)); bSheet = null }, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            GridChip(repo.glyph(id ?: parent), Color(repo.color(parent)), on, 46.dp, 30.dp)
                            GridLabel(name, on)
                        }
                    }
                    com.s2nova.app.ui.components.TextLink(tr(StringKey.NM_CHANGE_CATEGORY), { bSheet = BSheet.CAT }, Modifier.padding(start = 4.dp, top = 18.dp))
                }
                BSheet.ICON -> PlanIconGrid(d.icon, 6) { onChange(d.copy(icon = it, iconAuto = false)); bSheet = null }
                BSheet.WALLETS -> PillRow {
                    V2Pill(tr(StringKey.BUD_ALL), d.walletIds.isEmpty(), { onChange(d.copy(walletIds = emptyList())) })
                    wallets.forEach { w ->
                        V2Pill(shortWallet(w.name), w.id in d.walletIds, {
                            onChange(d.copy(walletIds = if (w.id in d.walletIds) d.walletIds - w.id else d.walletIds + w.id))
                        })
                    }
                }
                BSheet.PERIOD -> {
                    PillRow {
                        V2Pill(tr(StringKey.NM_FREQ_MONTHLY), d.period == BudgetPeriod.MONTHLY, { onChange(d.copy(period = BudgetPeriod.MONTHLY)) })
                        V2Pill(tr(StringKey.BUD_CUSTOM_RANGE), d.period == BudgetPeriod.CUSTOM, { onChange(d.copy(period = BudgetPeriod.CUSTOM)) })
                    }
                    if (d.period == BudgetPeriod.CUSTOM) {
                        Row(Modifier.padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Column(Modifier.weight(1f)) { FieldLabel(tr(StringKey.NM_WALLET_FROM)); DateBox(d.start) { onChange(d.copy(start = it)) } }
                            Column(Modifier.weight(1f)) { FieldLabel(tr(StringKey.BUD_UNTIL)); DateBox(d.end) { onChange(d.copy(end = it)) } }
                        }
                    }
                }
            }
            V2Button(tr(StringKey.NM_DONE), onClick = { bSheet = null }, modifier = Modifier.padding(top = 18.dp))
        }
    }
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
