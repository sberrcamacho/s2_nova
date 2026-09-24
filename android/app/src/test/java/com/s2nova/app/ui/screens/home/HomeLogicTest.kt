package com.s2nova.app.ui.screens.home

import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.RecurrenceInterval
import com.s2nova.app.data.model.RecurringSeries
import com.s2nova.app.data.model.TransactionType
import org.junit.Test
import java.time.LocalDate
import kotlin.test.assertEquals

class HomeLogicTest {
    private val today = LocalDate.parse("2026-08-21")

    private fun series(id: String, next: String, active: Boolean = true) = RecurringSeries(
        id = id, name = id, type = TransactionType.EXPENSE, amount = 1.0, walletId = "w", category = CategoryId.BILLS,
        paymentMethod = PaymentMethod.CASH, interval = RecurrenceInterval.MONTHLY, nextOccurrenceDate = next,
        isDue = false, active = active,
    )

    @Test
    fun `upcoming keeps active series within 7 days, due and overdue first dated today`() {
        val items = upcomingWithin(
            listOf(
                series("netflix", "2026-08-24"),
                series("salary", "2026-09-01"), // beyond the horizon
                series("internet", "2026-08-26"),
                series("admin", "2026-08-21"),
                series("overdue", "2026-08-19"),
                series("paused", "2026-08-22", active = false),
                series("edge", "2026-08-28"), // exactly 7 days out
            ),
            today,
        )
        assertEquals(listOf("admin", "overdue", "netflix", "internet", "edge"), items.map { it.series.id })
        assertEquals(listOf(true, true, false, false, false), items.map { it.dueToday })
        assertEquals(today, items[1].date)
    }

    @Test
    fun `budget tone follows the 65 and 90 thresholds`() {
        assertEquals(BudgetTone.POSITIVE, budgetTone(64))
        assertEquals(BudgetTone.WARNING, budgetTone(65))
        assertEquals(BudgetTone.WARNING, budgetTone(89))
        assertEquals(BudgetTone.NEGATIVE, budgetTone(90))
    }
}
