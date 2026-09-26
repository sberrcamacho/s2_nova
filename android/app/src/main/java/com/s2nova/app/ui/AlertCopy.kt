package com.s2nova.app.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.s2nova.app.data.formatShortDate
import com.s2nova.app.ui.components.categoryColor
import com.s2nova.app.data.model.AppAlert
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.Taxonomy
import com.s2nova.app.data.fmtDate
import com.s2nova.app.data.formatMoney
import com.s2nova.app.data.model.LoanKind
import com.s2nova.app.ui.components.categoryName
import com.s2nova.app.ui.components.glyphIcon
import com.s2nova.app.ui.components.hexColor
import com.s2nova.app.ui.components.iconFor
import com.s2nova.app.ui.screens.addtransaction.shortWallet

// Where tapping an alert (Inicio card or bell row) takes the user.
enum class AlertTarget { MOVIMIENTOS, PROGRAMADOS, PLANES_BUDGETS, PLANES_GOALS, PLANES_LOANS_LENT, PLANES_LOANS_BORROWED }

data class AlertPresentation(
    val title: String,
    val body: String,
    val icon: ImageVector,
    val color: Color,
    val target: AlertTarget,
    // Set on "Aporte programado": the notification shows "Confirmar aporte"
    // / "Omitir esta vez" for this goal.
    val confirmGoalId: String? = null,
)

// Copy per S2 Nova Android v2 mockup (notification builder): the same
// wording on the Inicio card and in the bell sheet.
fun presentAlert(alert: AppAlert, t: (StringKey) -> String, format: CurrencyFormatter): AlertPresentation = when (alert) {
    is AppAlert.SeriesDue -> AlertPresentation(
        title = if (alert.overdue) {
            t(StringKey.ALERT_SERIES_OVERDUE_TITLE).format(alert.name, formatShortDate(alert.dueDate))
        } else {
            t(StringKey.ALERT_SERIES_DUE_TITLE).format(alert.name)
        },
        body = t(StringKey.ALERT_SERIES_BODY).format(format(alert.amount)),
        icon = iconFor(alert.category),
        color = categoryColor(alert.category),
        target = AlertTarget.PROGRAMADOS,
    )
    is AppAlert.LoanOpen -> {
        val person = alert.counterpartyName ?: ""
        AlertPresentation(
            title = t(if (alert.loanKind == LoanKind.LENT) StringKey.ALERT_LOAN_LENT_TITLE else StringKey.ALERT_LOAN_BORROWED_TITLE).format(person),
            body = t(StringKey.ALERT_LOAN_BODY).format(format(alert.outstanding), formatShortDate(alert.dueDate)),
            // The mockup marks loans with the "Otros" glyph in the salary green.
            icon = iconFor("exp.other"),
            color = hexColor(Taxonomy.visColor("work")),
            target = if (alert.loanKind == LoanKind.LENT) AlertTarget.PLANES_LOANS_LENT else AlertTarget.PLANES_LOANS_BORROWED,
        )
    }
    is AppAlert.BudgetAtRisk -> AlertPresentation(
        title = t(StringKey.ALERT_BUDGET_TITLE).format(alert.name ?: categoryName(alert.category), alert.percentage),
        body = t(StringKey.ALERT_BUDGET_BODY).format(format(alert.spent), format(alert.limit)),
        icon = iconFor(alert.category),
        color = categoryColor(alert.category),
        target = AlertTarget.PLANES_BUDGETS,
    )
    is AppAlert.GoalNear -> {
        val p = Taxonomy.planIcon(alert.icon)
        AlertPresentation(
            title = t(StringKey.ALERT_GOAL_TITLE).format(alert.name, alert.percentage),
            body = t(StringKey.ALERT_GOAL_BODY).format(format(alert.remaining)),
            icon = glyphIcon(p.glyph),
            color = hexColor(p.color),
            target = AlertTarget.PLANES_GOALS,
        )
    }
    // PLANS.md §3 notifications.
    is AppAlert.GoalPlanDue -> {
        val p = Taxonomy.planIcon(alert.icon)
        val wallet = AppContainer.walletRepository.wallets.value.firstOrNull { it.id == alert.walletId }?.name?.let(::shortWallet) ?: ""
        val today = java.time.LocalDate.now().toString()
        AlertPresentation(
            title = "Aporte programado a " + alert.name,
            body = "Tienes un aporte de " + formatMoney(alert.amount, alert.currency) + " " + alert.currency + " para " + (if (alert.dueDate == today) "hoy" else "el " + fmtDate(alert.dueDate)) + " desde " + wallet + ".",
            icon = glyphIcon(p.glyph),
            color = hexColor(p.color),
            target = AlertTarget.PLANES_GOALS,
            confirmGoalId = alert.goalId,
        )
    }
    is AppAlert.TxPlanned -> AlertPresentation(
        title = alert.name.ifBlank { AppContainer.categoryRepository.name(alert.category) } + " se registra el " + fmtDate(alert.dueDate),
        body = formatMoney(alert.amount, alert.currency) + " · " + shortWallet(alert.walletName) + " · te pediremos confirmarlo",
        icon = iconFor(alert.category),
        color = categoryColor(alert.category),
        target = AlertTarget.MOVIMIENTOS,
    )
    is AppAlert.GoalPlanAuto -> {
        val p = Taxonomy.planIcon(alert.icon)
        AlertPresentation(
            title = "Aporte automático registrado",
            body = formatMoney(alert.amount, alert.currency) + " " + alert.currency + " a " + alert.name + " desde " + shortWallet(alert.walletName) + " · " + fmtDate(alert.date),
            icon = glyphIcon(p.glyph),
            color = hexColor(p.color),
            target = AlertTarget.PLANES_GOALS,
        )
    }
}
