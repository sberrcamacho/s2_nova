package com.s2nova.app.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.s2nova.app.data.formatShortDate
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.data.model.AppAlert
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.LoanKind
import com.s2nova.app.ui.components.goalCategoryFor
import com.s2nova.app.ui.components.iconFor

// Where tapping an alert (Inicio card or bell row) takes the user.
enum class AlertTarget { PROGRAMADOS, PLANES_BUDGETS, PLANES_GOALS, PLANES_LOANS_LENT, PLANES_LOANS_BORROWED }

data class AlertPresentation(
    val title: String,
    val body: String,
    val icon: ImageVector,
    val color: Color,
    val target: AlertTarget,
)

private fun categoryColor(id: CategoryId): Color = Color(categoryMap[id]?.color ?: 0xFF9C9CAA)

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
            icon = iconFor(CategoryId.OTHER),
            color = categoryColor(CategoryId.SALARY),
            target = if (alert.loanKind == LoanKind.LENT) AlertTarget.PLANES_LOANS_LENT else AlertTarget.PLANES_LOANS_BORROWED,
        )
    }
    is AppAlert.BudgetAtRisk -> AlertPresentation(
        title = t(StringKey.ALERT_BUDGET_TITLE).format(alert.name ?: t(categoryStringKey(alert.category)), alert.percentage),
        body = t(StringKey.ALERT_BUDGET_BODY).format(format(alert.spent), format(alert.limit)),
        icon = iconFor(alert.category),
        color = categoryColor(alert.category),
        target = AlertTarget.PLANES_BUDGETS,
    )
    is AppAlert.GoalNear -> {
        val goalCategory = goalCategoryFor(alert.themeIcon)
        AlertPresentation(
            title = t(StringKey.ALERT_GOAL_TITLE).format(alert.name, alert.percentage),
            body = t(StringKey.ALERT_GOAL_BODY).format(format(alert.remaining)),
            icon = goalCategory?.icon ?: iconFor(CategoryId.OTHER),
            color = goalCategory?.let { Color(it.color) } ?: categoryColor(CategoryId.OTHER),
            target = AlertTarget.PLANES_GOALS,
        )
    }
}
