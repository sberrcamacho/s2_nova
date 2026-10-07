package com.s2nova.app.data

import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType
import kotlin.test.Test
import kotlin.test.assertEquals

private fun txn(
    amount: Double,
    type: TransactionType,
    status: TransactionStatus = TransactionStatus.COMPLETED,
    date: String,
    category: CategoryId = "exp.other",
) = Transaction(
    id = "t-${date}-$amount-$type-$status-${category}-${System.nanoTime()}",
    walletId = "w1",
    description = "d",
    amount = amount,
    type = type,
    status = status,
    category = category,
    date = date,
    paymentMethod = PaymentMethod.CASH,
)

class AnalyticsHelpersTest {
    private val month = currentMonthKey()

    // Regression for bug: Home's balance and these aggregates used to sum
    // PLANNED ("Upcoming") transactions too, even though PLANNED explicitly
    // means "hasn't moved money yet" (see TransactionStatus's doc comment).
    @Test
    fun `monthlyHistory excludes PLANNED transactions from income and expenses`() {
        val transactions = listOf(
            txn(100_000.0, TransactionType.INCOME, TransactionStatus.COMPLETED, date = "$month-05"),
            txn(999_000.0, TransactionType.INCOME, TransactionStatus.PLANNED, date = "$month-06"),
            txn(30_000.0, TransactionType.EXPENSE, TransactionStatus.COMPLETED, date = "$month-07"),
            txn(888_000.0, TransactionType.EXPENSE, TransactionStatus.PLANNED, date = "$month-08"),
        )
        val summary = AnalyticsHelpers.monthlyHistory(transactions, months = 1).last()
        assertEquals(100_000.0, summary.income)
        assertEquals(30_000.0, summary.expenses)
    }

    @Test
    fun `categoryBreakdown excludes PLANNED and computes percentage of COMPLETED total`() {
        val transactions = listOf(
            txn(75_000.0, TransactionType.EXPENSE, TransactionStatus.COMPLETED, date = "$month-01", category = "exp.food"),
            txn(25_000.0, TransactionType.EXPENSE, TransactionStatus.COMPLETED, date = "$month-02", category = "exp.transportation"),
            txn(1_000_000.0, TransactionType.EXPENSE, TransactionStatus.PLANNED, date = "$month-03", category = "exp.shopping"),
        )
        val breakdown = AnalyticsHelpers.categoryBreakdown(transactions, monthKey = month)
        assertEquals(2, breakdown.size)
        val food = breakdown.first { it.category == "exp.food" }
        assertEquals(75_000.0, food.amount)
        assertEquals(75, food.percentage)
    }

    @Test
    fun `weeklySpending excludes PLANNED transactions`() {
        val transactions = listOf(
            txn(10_000.0, TransactionType.EXPENSE, TransactionStatus.COMPLETED, date = "$month-01"),
            txn(500_000.0, TransactionType.EXPENSE, TransactionStatus.PLANNED, date = "$month-02"),
        )
        val weeks = AnalyticsHelpers.weeklySpending(transactions, monthKey = month)
        assertEquals(10_000.0, weeks.sumOf { it.amount })
    }

    @Test
    fun `savingsTrend accumulates each month's COMPLETED savings`() {
        val transactions = listOf(
            txn(200_000.0, TransactionType.INCOME, TransactionStatus.COMPLETED, date = "$month-01"),
            txn(50_000.0, TransactionType.EXPENSE, TransactionStatus.COMPLETED, date = "$month-02"),
        )
        val trend = AnalyticsHelpers.savingsTrend(transactions, months = 1)
        assertEquals(150_000.0, trend.last().balance)
    }

    // Same rule as the backend's `changes`: this month up to today against
    // last month up to the same day, top 3 categories by absolute change.
    @Test
    fun `changes compares this month so far with the same days of last month`() {
        val e = TransactionType.EXPENSE
        val transactions = listOf(
            txn(300_000.0, e, date = "2026-08-05", category = "exp.food"),
            txn(500_000.0, e, date = "2026-08-20", category = "exp.food"), // after today
            txn(90_000.0, e, date = "2026-07-03", category = "exp.food"),
            txn(70_000.0, e, date = "2026-07-15", category = "exp.food"), // after the same day
            txn(40_000.0, e, date = "2026-08-02", category = "exp.fun"),
            txn(30_000.0, e, date = "2026-07-09", category = "exp.transport"),
            txn(10_000.0, e, date = "2026-08-01", category = "exp.health"),
            txn(5_000.0, e, date = "2026-07-01", category = "exp.health"),
            txn(20_000.0, e, date = "2026-08-04", category = "exp.home"),
            txn(20_000.0, e, date = "2026-07-04", category = "exp.home"), // no change
            txn(99_000.0, e, TransactionStatus.PLANNED, date = "2026-08-06", category = "exp.fun"),
        )
        val changes = AnalyticsHelpers.changes(transactions, today = "2026-08-10", principal = "COP")
        assertEquals(370_000.0, changes.current)
        assertEquals(145_000.0, changes.previous)
        assertEquals(listOf("exp.food" to 210_000.0, "exp.fun" to 40_000.0, "exp.transport" to -30_000.0), changes.categories.map { it.category to it.delta })
    }
}
