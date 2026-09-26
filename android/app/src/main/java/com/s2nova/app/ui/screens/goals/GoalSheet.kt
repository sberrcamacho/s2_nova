package com.s2nova.app.ui.screens.goals

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
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
import com.s2nova.app.data.Currencies
import com.s2nova.app.data.MONTHS_ES
import com.s2nova.app.data.Taxonomy
import com.s2nova.app.data.fmtDate
import com.s2nova.app.data.fmtDateLong
import com.s2nova.app.data.formatMoney
import com.s2nova.app.data.model.Goal
import com.s2nova.app.data.model.GoalPlan
import com.s2nova.app.data.model.GoalPlanEnd
import com.s2nova.app.data.model.RecurrenceInterval
import com.s2nova.app.ui.components.BareField
import com.s2nova.app.ui.components.FieldLabel
import com.s2nova.app.ui.components.FieldNote
import com.s2nova.app.ui.components.InputBox
import com.s2nova.app.ui.components.MoneyInput
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.PillRow
import com.s2nova.app.ui.components.PlanMark
import com.s2nova.app.ui.components.SheetHeader
import com.s2nova.app.ui.components.SheetTextAction
import com.s2nova.app.ui.components.TNUM
import com.s2nova.app.ui.components.V2Button
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.components.V2Pill
import com.s2nova.app.ui.components.noRippleClick
import com.s2nova.app.ui.screens.addtransaction.ConfirmModeRow
import com.s2nova.app.ui.screens.addtransaction.DateBox
import com.s2nova.app.ui.screens.addtransaction.Freq
import com.s2nova.app.ui.screens.addtransaction.Stepper
import com.s2nova.app.ui.screens.addtransaction.addFreq
import com.s2nova.app.ui.screens.addtransaction.shortWallet
import com.s2nova.app.ui.screens.budgets.PlanIconGrid
import com.s2nova.app.ui.theme.NovaColors
import java.time.LocalDate
import kotlin.math.ceil

// Goal create/edit (PLANS.md §2): Nombre with the suggested plan icon, the
// 9×2 Icono grid, Monto objetivo / Monto inicial, Fecha objetivo and the
// "Aporte periódico" row that opens its own sheet (§3).

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
            id = g.id, name = g.name, target = g.targetAmount.toLong().toString(), icon = g.icon, iconAuto = false,
            initial = if (g.initialAmount > 0) g.initialAmount.toLong().toString() else "", due = g.targetDate.orEmpty(), plan = g.plan,
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
fun GoalDraftSheet(draft: GoalDraft, onDraftChange: (GoalDraft) -> Unit, onDismiss: () -> Unit, onSave: () -> Unit, onRequestDelete: () -> Unit) {
    val d = draft
    val colors = NovaColors.current
    val principal = AppContainer.currencyRepository.principal
    val sym = Currencies.symbol(principal)
    val wallets = AppContainer.walletRepository.wallets.value
    var gp by remember { mutableStateOf<PlanDraft?>(null) }
    val current = if (d.id != null) d.current else d.initial.toDoubleOrNull() ?: 0.0

    NovaDraftSheet(onDismiss = onDismiss) {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            SheetHeader(if (d.id != null) "Editar meta" else "Nueva meta", bottom = 16.dp)
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Column {
                    FieldLabel("Nombre")
                    InputBox(vertical = 11.dp) {
                        PlanMark(d.icon, 40.dp)
                        BareField(d.name, { name -> onDraftChange(d.copy(name = name, icon = if (d.iconAuto) Taxonomy.guessPlanIcon(name) ?: "other" else d.icon)) }, "Viaje a Perú, portátil nuevo…")
                    }
                    FieldNote(
                        if (d.iconAuto && Taxonomy.guessPlanIcon(d.name) != null) "Icono sugerido por el nombre. Toca otro para cambiarlo." else "Elige un icono para reconocer la meta de un vistazo.",
                        Modifier.padding(top = 8.dp),
                    )
                }
                Column {
                    FieldLabel("Icono")
                    PlanIconGrid(d.icon, 9) { onDraftChange(d.copy(icon = it, iconAuto = false)) }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Column(Modifier.weight(1f)) { FieldLabel("Monto objetivo"); MoneyInput(d.target, { onDraftChange(d.copy(target = it)) }, sym, 16.sp) }
                    Column(Modifier.weight(1f)) { FieldLabel("Monto inicial"); MoneyInput(d.initial, { onDraftChange(d.copy(initial = it)) }, sym, 16.sp) }
                }
                Column {
                    FieldLabel("Fecha objetivo (opcional)")
                    DateBox(d.due) { onDraftChange(d.copy(due = it)) }
                }
                val plan = d.plan
                val primary = MaterialTheme.colorScheme.primary
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(if (plan != null) primary.copy(alpha = 0.08f) else Color.Transparent)
                        .border(1.dp, if (plan != null) primary else MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(14.dp))
                        .noRippleClick {
                            gp = plan?.let { p ->
                                PlanDraft(p.amount.toLong().toString(), Freq.entries.first { it.interval == p.frequency }, p.walletId, p.startDate, p.endMode, p.count ?: 12, p.endDate.orEmpty(), p.autoConfirm)
                            } ?: PlanDraft(walletId = wallets.firstOrNull()?.id)
                        }.padding(horizontal = 14.dp, vertical = 11.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Box(Modifier.size(36.dp).clip(RoundedCornerShape(12.dp)).background(primary.copy(alpha = 0.16f)), contentAlignment = Alignment.Center) {
                        V2Icon(V2Icons.repeat, colors.accentText, 17.dp)
                    }
                    Column(Modifier.weight(1f)) {
                        Text("Aporte periódico", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                        val wallet = plan?.let { p -> wallets.firstOrNull { it.id == p.walletId }?.name?.let(::shortWallet) }.orEmpty()
                        Text(
                            plan?.let { planText(it, wallet, principal) } ?: "Agrega un aporte automático o con recordatorio",
                            fontSize = 11.sp, lineHeight = 15.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp), style = TextStyle(fontFeatureSettings = TNUM),
                        )
                    }
                    Text("›", fontSize = 18.sp, color = colors.textDim)
                }
                V2Button("Guardar", enabled = d.name.isNotBlank() && (d.target.toDoubleOrNull() ?: 0.0) > 0, onClick = onSave)
                if (d.id != null) SheetTextAction("Eliminar meta", colors.negative, onRequestDelete, weight = FontWeight.ExtraBold)
            }
        }
    }

    val p = gp ?: return
    val amt = p.amount.toDoubleOrNull() ?: 0.0
    val start = runCatching { LocalDate.parse(p.start) }.getOrDefault(LocalDate.now())
    val summary = if (amt > 0) when (p.end) {
        GoalPlanEnd.GOAL -> {
            val remaining = ((d.target.toDoubleOrNull() ?: 0.0) - current).coerceAtLeast(0.0)
            val n = ceil(remaining / amt).toInt().coerceAtLeast(1)
            val last = addFreq(start, p.freq, (n - 1).toLong())
            "Con $n aportes de ${formatMoney(amt, principal)} cumples la meta hacia ${MONTHS_ES[last.monthValue - 1]} de ${last.year}."
        }
        GoalPlanEnd.COUNT -> "${p.count} aportes · ${formatMoney(p.count * amt, principal)} en total · último el ${fmtDate(addFreq(start, p.freq, (p.count - 1).toLong()).toString())}"
        GoalPlanEnd.DATE -> "Aportes de ${formatMoney(amt, principal)} hasta el " + (if (p.until.isNotBlank()) fmtDateLong(p.until) else "…")
    } else null
    NovaDraftSheet(onDismiss = { gp = null }, scrimAlpha = 0.72f) {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            SheetHeader("Aporte periódico", (d.name.ifBlank { "Nueva meta" }) + " · " + formatMoney(current, principal) + " de " + formatMoney(d.target.toDoubleOrNull() ?: 0.0, principal), bottom = 16.dp)
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Column { FieldLabel("Monto de cada aporte"); MoneyInput(p.amount, { gp = p.copy(amount = it) }, sym) }
                Column {
                    FieldLabel("Frecuencia")
                    PillRow { listOf(Freq.DAILY, Freq.WEEKLY, Freq.MONTHLY).forEach { f -> V2Pill(f.label, p.freq == f, { gp = p.copy(freq = f) }) } }
                }
                Column {
                    FieldLabel("Desde qué billetera")
                    PillRow { wallets.forEach { w -> V2Pill(shortWallet(w.name), p.walletId == w.id, { gp = p.copy(walletId = w.id) }) } }
                }
                Column { FieldLabel("Empieza"); DateBox(p.start) { gp = p.copy(start = it) } }
                Column {
                    FieldLabel("Termina")
                    PillRow {
                        listOf(GoalPlanEnd.GOAL to "Al cumplir la meta", GoalPlanEnd.COUNT to "Después de", GoalPlanEnd.DATE to "En una fecha").forEach { (k, label) ->
                            V2Pill(label, p.end == k, { gp = p.copy(end = k) })
                        }
                    }
                    if (p.end == GoalPlanEnd.COUNT) Stepper("${p.count} aportes", { gp = p.copy(count = (p.count - 1).coerceAtLeast(1)) }, { gp = p.copy(count = (p.count + 1).coerceAtMost(120)) })
                    if (p.end == GoalPlanEnd.DATE) DateBox(p.until, Modifier.padding(top = 10.dp)) { gp = p.copy(until = it) }
                }
                Column {
                    FieldLabel("En cada fecha")
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        ConfirmModeRow("Pedirme confirmación", "Te llega una notificación y confirmas cada aporte.", !p.auto) { gp = p.copy(auto = false) }
                        ConfirmModeRow("Automático", "Se descuenta de la billetera en cada fecha y te avisamos.", p.auto) { gp = p.copy(auto = true) }
                    }
                }
                if (summary != null) {
                    Text(
                        summary, fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground,
                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)).padding(horizontal = 14.dp, vertical = 12.dp),
                        style = TextStyle(fontFeatureSettings = TNUM),
                    )
                }
                V2Button("Aplicar", enabled = amt > 0 && p.walletId != null, onClick = {
                    val next = d.plan?.nextDate?.takeIf { it >= LocalDate.now().toString() && d.plan.startDate == p.start } ?: p.start
                    onDraftChange(
                        d.copy(
                            plan = GoalPlan(
                                amount = amt, frequency = p.freq.interval, walletId = p.walletId!!, startDate = p.start, endMode = p.end,
                                count = if (p.end == GoalPlanEnd.COUNT) p.count else null, endDate = if (p.end == GoalPlanEnd.DATE) p.until.ifBlank { null } else null,
                                autoConfirm = p.auto, nextDate = next,
                            ),
                            planChanged = true,
                        ),
                    )
                    gp = null
                })
                if (d.plan != null) SheetTextAction("Quitar aporte periódico", colors.negative, { onDraftChange(d.copy(plan = null, planChanged = true)); gp = null }, weight = FontWeight.ExtraBold)
            }
        }
    }
}

val RecurrenceInterval.freqLabel: String get() = Freq.entries.first { it.interval == this }.label
