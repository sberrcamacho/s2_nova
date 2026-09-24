package com.s2nova.app.ui.screens.home

import com.s2nova.app.data.model.BudgetProgress
import com.s2nova.app.data.model.RecurringSeries
import java.time.LocalDate

// One row of Inicio's "Próximos 7 días": a series due today (or already
// overdue — it still needs a confirm) is dated today and flagged "HOY".
data class UpcomingItem(val series: RecurringSeries, val date: LocalDate, val dueToday: Boolean)

// Active Programados due within the next `days` days, due-today first, then
// by date (v2 mockup homeVals()).
fun upcomingWithin(series: List<RecurringSeries>, today: LocalDate, days: Long = 7): List<UpcomingItem> {
    val horizon = today.plusDays(days)
    return series
        .filter { it.active }
        .mapNotNull { item ->
            val next = runCatching { LocalDate.parse(item.nextOccurrenceDate) }.getOrNull() ?: return@mapNotNull null
            if (next.isAfter(horizon)) return@mapNotNull null
            val dueToday = !next.isAfter(today)
            UpcomingItem(item, if (dueToday) today else next, dueToday)
        }
        .sortedWith(compareByDescending<UpcomingItem> { it.dueToday }.thenBy { it.date })
}

// The three riskiest budgets, highest percentage first.
fun homeBudgets(budgets: List<BudgetProgress>): List<BudgetProgress> =
    budgets.sortedByDescending { it.percentage }.take(3)

enum class BudgetTone { POSITIVE, WARNING, NEGATIVE }

// Inicio's bar/percentage tone rule (STAGE-2-INICIO §3): >= 90 negative,
// >= 65 warning, else positive — a display rule, independent of the
// backend's `status` field.
fun budgetTone(percentage: Int): BudgetTone = when {
    percentage >= 90 -> BudgetTone.NEGATIVE
    percentage >= 65 -> BudgetTone.WARNING
    else -> BudgetTone.POSITIVE
}
