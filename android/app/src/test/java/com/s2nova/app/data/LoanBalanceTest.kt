package com.s2nova.app.data

import org.junit.Test
import kotlin.test.assertEquals

// The same cases as backend/tests/unit/loans.spec.ts: guest mode must show
// the figures a real account gets.
class LoanBalanceTest {
    private fun loan(mode: LoanBalance.Mode = LoanBalance.Mode.NONE, rate: Double = 0.0, period: LoanBalance.Period = LoanBalance.Period.MONTHLY, from: String? = null) =
        LoanBalance.Terms(1_000_000, "2026-01-01", mode, rate, period, from)

    private fun pay(date: String, amount: Long) = LoanBalance.Payment(amount, date)

    @Test
    fun `without interest owes the principal minus what was paid`() {
        assertEquals(600_000, LoanBalance.balance(loan(), listOf(pay("2026-02-01", 400_000)), "2026-12-31").outstanding)
    }

    @Test
    fun `fixed adds the rate once and abonos pay that interest first`() {
        val terms = loan(LoanBalance.Mode.FIXED, 10.0)
        assertEquals(1_100_000, LoanBalance.balance(terms, emptyList(), "2030-01-01").outstanding)
        assertEquals(LoanBalance.Result(800_000, 100_000, 100_000, 800_000), LoanBalance.balance(terms, listOf(pay("2026-02-01", 300_000)), "2026-03-01"))
    }

    @Test
    fun `on balance accrues per day on the unpaid principal`() {
        val terms = loan(LoanBalance.Mode.ON_BALANCE, 2.0)
        assertEquals(1_060_000, LoanBalance.balance(terms, emptyList(), "2026-04-01").outstanding)
        assertEquals(520_000, LoanBalance.balance(terms, listOf(pay("2026-01-31", 500_000)), "2026-01-31").principalOutstanding)
        assertEquals(530_400, LoanBalance.balance(terms, listOf(pay("2026-01-31", 500_000)), "2026-03-02").outstanding)
        assertEquals(1_010_000, LoanBalance.balance(loan(LoanBalance.Mode.ON_BALANCE, 36.5, LoanBalance.Period.ANNUAL), emptyList(), "2026-01-11").outstanding)
    }

    @Test
    fun `charges nothing before the start date`() {
        val terms = loan(LoanBalance.Mode.ON_BALANCE, 3.0, from = "2026-03-01")
        assertEquals(1_000_000, LoanBalance.balance(terms, emptyList(), "2026-02-28").outstanding)
        assertEquals(0, LoanBalance.balance(terms, listOf(pay("2026-02-15", 1_000_000)), "2026-12-31").outstanding)
        assertEquals(1_030_000, LoanBalance.balance(terms, emptyList(), "2026-03-31").outstanding)
    }
}
