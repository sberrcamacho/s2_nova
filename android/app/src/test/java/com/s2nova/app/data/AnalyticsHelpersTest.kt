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
    category: CategoryId = CategoryId.OTHER,
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
            txn(75_000.0, TransactionType.EXPENSE, TransactionStatus.COMPLETED, date = "$month-01", category = CategoryId.FOOD),
            txn(25_000.0, TransactionType.EXPENSE, TransactionStatus.COMPLETED, date = "$month-02", category = CategoryId.TRANSPORTATION),
            txn(1_000_000.0, TransactionType.EXPENSE, TransactionStatus.PLANNED, date = "$month-03", category = CategoryId.SHOPPING),
        )
        val breakdown = AnalyticsHelpers.categoryBreakdown(transactions, monthKey = month)
        assertEquals(2, breakdown.size)
        val food = breakdown.first { it.category == CategoryId.FOOD }
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
}
