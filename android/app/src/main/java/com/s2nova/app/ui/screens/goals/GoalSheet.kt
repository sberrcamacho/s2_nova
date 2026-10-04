package com.s2nova.app.ui.screens.goals

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.Taxonomy
import com.s2nova.app.data.fmtDate
import com.s2nova.app.data.fmtDateLong
import com.s2nova.app.data.formatMoney
import com.s2nova.app.data.model.Goal
import com.s2nova.app.data.model.GoalPlan
import com.s2nova.app.data.model.GoalPlanEnd
import com.s2nova.app.data.model.RecurrenceInterval
import com.s2nova.app.ui.components.AmountField
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
import com.s2nova.app.ui.components.StepOptionGroup
import com.s2nova.app.ui.components.StepOptionRow
import com.s2nova.app.ui.components.StepChoiceRow
import com.s2nova.app.ui.components.StepSubPage
import com.s2nova.app.ui.components.SegmentOption
import com.s2nova.app.ui.components.SegmentedChoice
import com.s2nova.app.ui.components.StepSpacer
import com.s2nova.app.ui.screens.addtransaction.AmountPad
import com.s2nova.app.ui.components.FieldLabel
import com.s2nova.app.ui.components.FieldNote
import com.s2nova.app.ui.components.PillRow
import com.s2nova.app.ui.components.PlanMark
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.components.V2Pill
import com.s2nova.app.ui.screens.addtransaction.ConfirmModeRow
import com.s2nova.app.ui.screens.addtransaction.DateBox
import com.s2nova.app.ui.screens.addtransaction.Freq
import com.s2nova.app.ui.screens.addtransaction.Stepper
import com.s2nova.app.ui.screens.addtransaction.addFreq
import com.s2nova.app.ui.screens.addtransaction.shortWallet
import com.s2nova.app.ui.theme.NovaColors
import java.time.LocalDate
import kotlin.math.ceil
import com.s2nova.app.ui.tr
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.monthName

// Goal create/edit (PLANS.md §2–3) in guided steps: name and icon, the
// amounts and target date, then how to save (by hand or with a recurring
// contribution).

data class GoalDraft(
    val id: String? = null,
    val name: String = "",
    val target: String = "",
    val icon: String = "other",
    val iconAuto: Boolean = true,
    val initial: String = "",
    val due: String = "",
    val plan: GoalPlan? = null,
    val planChanged: Boolean = false,
    val current: Double = 0.0,
) {
    companion object {
        fun from(g: Goal) = GoalDraft(
            id = g.id, name = g.name, target = com.s2nova.app.ui.screens.addtransaction.AmountPad.numStr(g.targetAmount), icon = g.icon, iconAuto = false,
            initial = if (g.initialAmount > 0) com.s2nova.app.ui.screens.addtransaction.AmountPad.numStr(g.initialAmount) else "", due = g.targetDate.orEmpty(), plan = g.plan,
            current = g.currentAmount,
        )
    }
}

private data class PlanDraft(
    val amount: String = "",
    val freq: Freq = Freq.MONTHLY,
    val walletId: String? = null,
    val start: String = LocalDate.now().toString(),
    val end: GoalPlanEnd = GoalPlanEnd.GOAL,
    val count: Int = 12,
    val until: String = "",
    val auto: Boolean = false,
)

@Composable
fun GoalDraftSheet(draft: GoalDraft, onDraftChange: (GoalDraft) -> Unit, onDismiss: () -> Unit, onSave: (GoalDraft) -> Unit, onRequestDelete: () -> Unit) {
    val d = draft
    val colors = NovaColors.current
    val principal = AppContainer.currencyRepository.principal
    val wallets = AppContainer.walletRepository.wallets.value
    val editing = d.id != null
    // Name and icon · amounts and date · how to save. A recurring
    // contribution adds two steps (amount and wallet · schedule) instead of
    // unfolding under the choice, so no step needs scrolling. Editing opens
    // on "how to save", like budgets open on their limit.
    var step by remember { mutableStateOf(if (editing) 2 else 0) }
    var planOn by remember { mutableStateOf(d.plan != null) }
    var p by remember {
        mutableStateOf(
            d.plan?.let { pl -> PlanDraft(AmountPad.numStr(pl.amount), Freq.entries.first { it.interval == pl.frequency }, pl.walletId, pl.startDate, pl.endMode, pl.count ?: 12, pl.endDate.orEmpty(), pl.autoConfirm) }
                ?: PlanDraft(walletId = wallets.firstOrNull()?.id),
        )
    }
    val target = AmountPad.eval(d.target)
    val current = if (editing) d.current else AmountPad.eval(d.initial)
    val amt = AmountPad.eval(p.amount)
    val planValid = !planOn || (amt > 0 && p.walletId != null)
    val stepCount = if (planOn) 5 else 3
    var endPage by remember { mutableStateOf(false) }
    val last = step == stepCount - 1
    val stepValid = when (step) {
        0 -> d.name.isNotBlank()
        1 -> d.name.isNotBlank() && target > 0
        2 -> d.name.isNotBlank() && target > 0
        3 -> amt > 0 && p.walletId != null
        else -> d.name.isNotBlank() && target > 0 && planValid && (p.end != GoalPlanEnd.DATE || p.until.isNotBlank())
    }

    fun finalDraft(): GoalDraft {
        val plan = if (!planOn) null else {
            val next = d.plan?.nextDate?.takeIf { it >= LocalDate.now().toString() && d.plan.startDate == p.start } ?: p.start
            GoalPlan(
                amount = amt, frequency = p.freq.interval, walletId = p.walletId!!, startDate = p.start, endMode = p.end,
                count = if (p.end == GoalPlanEnd.COUNT) p.count else null, endDate = if (p.end == GoalPlanEnd.DATE) p.until.ifBlank { null } else null,
                autoConfirm = p.auto, nextDate = next,
            )
        }
        return d.copy(plan = plan, planChanged = d.planChanged || plan != d.plan)
    }

    StepSheet(
        title = tr(if (editing) StringKey.GOAL_EDIT else StringKey.GOAL_NEW),
        step = step,
        stepCount = stepCount,
        onBack = { step-- },
        onDismiss = onDismiss,
        primaryLabel = tr(if (!last) StringKey.STEP_CONTINUE else if (editing) StringKey.STEP_SAVE_CHANGES else StringKey.GOAL_SAVE),
        primaryEnabled = stepValid,
        onPrimary = { if (!last) step++ else onSave(finalDraft()) },
        footer = if (editing && step == 2) ({ StepDeleteButton(tr(StringKey.GOAL_DELETE), onRequestDelete) }) else null,
        context = if (editing) d.name else null,
        // The end of the plan has its own options (a count, a date), so it
        // opens as a sub-page instead of unfolding under the choice.
        subPage = if (endPage) StepSubPage("end", tr(StringKey.GOAL_Q_END)) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(GoalPlanEnd.GOAL to tr(StringKey.GOAL_ENDS_GOAL), GoalPlanEnd.COUNT to tr(StringKey.NM_ENDS_COUNT), GoalPlanEnd.DATE to tr(StringKey.NM_ENDS_UNTIL)).forEach { (k, label) ->
                    StepChoiceRow(label, p.end == k, { p = p.copy(end = k) })
                }
            }
            when (p.end) {
                GoalPlanEnd.COUNT -> Stepper(tr(StringKey.GOAL_N_CONTRIBUTIONS, p.count), { p = p.copy(count = (p.count - 1).coerceAtLeast(1)) }, { p = p.copy(count = (p.count + 1).coerceAtMost(120)) })
                GoalPlanEnd.DATE -> DateBox(p.until, Modifier.padding(top = 12.dp)) { p = p.copy(until = it) }
                else -> {}
            }
        } else null,
        onSubDone = { endPage = false },
    ) { shown ->
        when (shown) {
            0 -> {
                StepQuestion(tr(StringKey.GOAL_Q_NAME))
                NameField(tr(StringKey.PLAN_NAME), d.name, { name ->
                    onDraftChange(d.copy(name = name, icon = if (d.iconAuto) Taxonomy.guessPlanIcon(name) ?: "other" else d.icon))
                }, tr(StringKey.GOAL_NAME_PH), leading = { PlanMark(d.icon, 44.dp) })
                FieldNote(
                    tr(if (d.iconAuto && Taxonomy.guessPlanIcon(d.name) != null) StringKey.PLAN_ICON_GUESS else StringKey.GOAL_ICON_PICK),
                    Modifier.padding(top = 8.dp, start = 4.dp),
                )
                StepSpacer()
                FieldLabel(tr(StringKey.PLAN_ICON))
                PlanIconPicker(d.icon) { onDraftChange(d.copy(icon = it, iconAuto = false)) }
            }
            1 -> {
                StepQuestion(tr(StringKey.GOAL_Q_AMOUNT), tr(StringKey.GOAL_Q_AMOUNT_HINT))
                AmountHeroField(tr(StringKey.GOAL_TARGET), d.target, { onDraftChange(d.copy(target = it)) }, principal)
                StepSpacer()
                FieldLabel(tr(StringKey.GOAL_INITIAL))
                AmountField(d.initial, { onDraftChange(d.copy(initial = it)) }, principal, title = tr(StringKey.GOAL_INITIAL), fontSize = 16.sp)
                StepSpacer()
                FieldLabel(tr(StringKey.GOAL_DATE))
                DateBox(d.due) { onDraftChange(d.copy(due = it)) }
            }
            2 -> {
                StepQuestion(tr(StringKey.GOAL_Q_PLAN), tr(StringKey.GOAL_Q_PLAN_HINT))
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    ChoiceCard(V2Icons.wallet, colors.link, tr(StringKey.GOAL_CHOICE_MANUAL), tr(StringKey.GOAL_CHOICE_MANUAL_DETAIL), !planOn, { planOn = false })
                    ChoiceCard(V2Icons.repeat, colors.link, tr(StringKey.GOAL_PLAN), tr(StringKey.GOAL_CHOICE_PLAN_DETAIL), planOn, { planOn = true })
                }
            }
            3 -> {
                StepQuestion(tr(StringKey.GOAL_Q_CONTRIB))
                AmountHeroField(tr(StringKey.GOAL_PLAN_AMOUNT), p.amount, { p = p.copy(amount = it) }, principal)
                StepSpacer()
                FieldLabel(tr(StringKey.GOAL_FREQ))
                PillRow { listOf(Freq.DAILY, Freq.WEEKLY, Freq.MONTHLY).forEach { f -> V2Pill(f.label, p.freq == f, { p = p.copy(freq = f) }) } }
                StepSpacer()
                FieldLabel(tr(StringKey.GOAL_FROM_WALLET))
                PillRow { wallets.forEach { w -> V2Pill(shortWallet(w.name), p.walletId == w.id, { p = p.copy(walletId = w.id) }) } }
            }
            else -> {
                StepQuestion(tr(StringKey.GOAL_Q_SCHEDULE))
                FieldLabel(tr(StringKey.GOAL_STARTS))
                DateBox(p.start) { p = p.copy(start = it) }
                Spacer(Modifier.height(12.dp))
                StepOptionGroup {
                    StepOptionRow(
                        V2Icons.cal, tr(StringKey.NM_ENDS),
                        when (p.end) {
                            GoalPlanEnd.GOAL -> tr(StringKey.GOAL_ENDS_GOAL)
                            GoalPlanEnd.COUNT -> tr(StringKey.GOAL_N_CONTRIBUTIONS, p.count)
                            GoalPlanEnd.DATE -> if (p.until.isNotBlank()) fmtDate(p.until) else tr(StringKey.NM_ENDS_UNTIL)
                        },
                    ) { endPage = true }
                }
                StepSpacer()
                FieldLabel(tr(StringKey.NM_EACH_DATE))
                SegmentedChoice(
                    listOf(SegmentOption(false, tr(StringKey.NM_ASK_SHORT), V2Icons.alertCircle), SegmentOption(true, tr(StringKey.GOAL_AUTO), V2Icons.repeat)),
                    p.auto,
                ) { p = p.copy(auto = it) }
                FieldNote(tr(if (p.auto) StringKey.GOAL_AUTO_DETAIL else StringKey.GOAL_ASK_DETAIL), Modifier.padding(top = 8.dp, start = 4.dp))
                planSummary(p, amt, target, current, principal)?.let {
                    StepSpacer()
                    StepNote(it)
                }
            }
        }
    }
}

// "Con 8 aportes de $ 250.000 cumples la meta hacia mayo de 2027."
private fun planSummary(p: PlanDraft, amt: Double, target: Double, current: Double, principal: String): String? {
    if (amt <= 0) return null
    val start = runCatching { LocalDate.parse(p.start) }.getOrDefault(LocalDate.now())
    return when (p.end) {
        GoalPlanEnd.GOAL -> {
            val n = ceil((target - current).coerceAtLeast(0.0) / amt).toInt().coerceAtLeast(1)
            val last = addFreq(start, p.freq, (n - 1).toLong())
            tr(StringKey.GOAL_SUM_GOAL, n, formatMoney(amt, principal), monthName(last.monthValue), last.year)
        }
        GoalPlanEnd.COUNT -> tr(StringKey.GOAL_SUM_COUNT, p.count, formatMoney(p.count * amt, principal), fmtDate(addFreq(start, p.freq, (p.count - 1).toLong()).toString()))
        GoalPlanEnd.DATE -> tr(StringKey.GOAL_SUM_DATE, formatMoney(amt, principal), if (p.until.isNotBlank()) fmtDateLong(p.until) else "…")
    }
}

val RecurrenceInterval.freqLabel: String get() = Freq.entries.first { it.interval == this }.label
