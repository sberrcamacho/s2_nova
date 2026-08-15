package com.s2nova.app.data

import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.MonthlySummary
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionType

// Mirrors web/src/services/analyticsService.ts — pure functions over an
// already-loaded transaction list, since there's no network round trip to
// justify a suspend/coroutine-based API for mock data.
object AnalyticsHelpers {

    fun monthlyHistory(transactions: List<Transaction>, months: Int = 6): List<MonthlySummary> =
        lastNMonthKeys(months).map { key -> summarizeMonth(transactions, key) }

    private fun summarizeMonth(transactions: List<Transaction>, monthKey: String): MonthlySummary {
        val items = transactions.filter { isSameMonth(it.date, monthKey) }
        val income = items.filter { it.type == TransactionType.INCOME }.sumOf { it.amount }
        val expenses = items.filter { it.type == TransactionType.EXPENSE }.sumOf { it.amount }
        return MonthlySummary(monthKey, monthLabel(monthKey), income, expenses)
    }

    data class CategoryBreakdownEntry(val category: CategoryId, val amount: Double, val percentage: Int)

    fun categoryBreakdown(transactions: List<Transaction>, monthKey: String = currentMonthKey()): List<CategoryBreakdownEntry> {
        val items = transactions.filter { it.type == TransactionType.EXPENSE && isSameMonth(it.date, monthKey) }
        val total = items.sumOf { it.amount }
        return items.groupBy { it.category }
            .map { (category, txns) ->
                val amount = txns.sumOf { it.amount }
                CategoryBreakdownEntry(category, amount, if (total > 0) ((amount / total) * 100).toInt() else 0)
            }
            .sortedByDescending { it.amount }
    }

    data class SavingsPoint(val month: String, val label: String, val balance: Double)

    fun savingsTrend(transactions: List<Transaction>, months: Int = 6): List<SavingsPoint> {
        var balance = 0.0
        return monthlyHistory(transactions, months).map { m ->
            balance += m.savings
            SavingsPoint(m.month, m.label, balance)
        }
    }

    data class WeekPoint(val label: String, val amount: Double)

    fun weeklySpending(transactions: List<Transaction>, monthKey: String = currentMonthKey()): List<WeekPoint> {
        val buckets = DoubleArray(5)
        transactions
            .filter { it.type == TransactionType.EXPENSE && isSameMonth(it.date, monthKey) }
            .forEach { t ->
                val day = t.date.substring(8, 10).toInt()
                val week = ((day - 1) / 7).coerceAtMost(4)
                buckets[week] += t.amount
            }
        return buckets.mapIndexed { i, amount -> WeekPoint("Sem ${i + 1}", amount) }
    }
}
