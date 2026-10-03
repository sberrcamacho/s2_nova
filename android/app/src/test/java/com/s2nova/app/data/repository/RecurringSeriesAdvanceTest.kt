package com.s2nova.app.data.repository

import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.RecurrenceInterval
import com.s2nova.app.data.model.RecurringSeries
import com.s2nova.app.data.model.TransactionType
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

// Guest mode's copy of the backend's recurrence date rule (lib/dates.ts,
// lib/recurring.ts).
class RecurringSeriesAdvanceTest {
    private fun series(next: String, interval: RecurrenceInterval = RecurrenceInterval.MONTHLY, occurrences: Int? = null, done: Int = 0, endDate: String? = null) =
        RecurringSeries(
            id = "s", name = "Arriendo", type = TransactionType.EXPENSE, amount = 1.0, walletId = "w", category = "exp.housing",
            paymentMethod = PaymentMethod.BANK_TRANSFER, interval = interval, nextOccurrenceDate = next, isDue = true, active = true,
            occurrences = occurrences, occurrencesDone = done, endDate = endDate,
        )

    @Test
    fun `monthly clamps to the end of a shorter month`() {
        val next = series("2026-01-31").advanced(today = "2026-01-31")
        assertEquals("2026-02-28", next.nextOccurrenceDate)
        assertEquals(1, next.occurrencesDone)
        assertTrue(next.active)
        assertFalse(next.isDue)
    }

    @Test
    fun `weekly and yearly step by their interval`() {
        assertEquals("2026-10-09", series("2026-10-02", RecurrenceInterval.WEEKLY).advanced("2026-10-02").nextOccurrenceDate)
        assertEquals("2029-02-28", series("2028-02-29", RecurrenceInterval.YEARLY).advanced("2028-02-29").nextOccurrenceDate)
    }

    @Test
    fun `a series ends at its count or its end date`() {
        assertFalse(series("2026-10-02", occurrences = 3, done = 2).advanced("2026-10-02").active)
        assertFalse(series("2026-10-02", endDate = "2026-10-31").advanced("2026-10-02").active)
        assertTrue(series("2026-10-02", endDate = "2026-11-02").advanced("2026-10-02").active)
    }

    @Test
    fun `an overdue series stays due until it catches up`() {
        assertTrue(series("2026-08-21").advanced(today = "2026-10-02").isDue)
    }
}
