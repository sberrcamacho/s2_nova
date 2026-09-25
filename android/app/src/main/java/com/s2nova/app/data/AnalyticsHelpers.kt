package com.s2nova.app.data

import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.MonthlySummary
import com.s2nova.app.data.model.Report
import com.s2nova.app.data.model.ReportCategory
import com.s2nova.app.data.model.ReportTotals
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType

// Mirrors web/src/services/analyticsService.ts — pure functions over an
// already-loaded transaction list, since there's no network round trip to
// justify a suspend/coroutine-based API for mock data.
object AnalyticsHelpers {

    // PLANNED ("Upcoming") transactions haven't moved money yet — see
    // Transaction.status's doc comment — so every aggregate here must only
    // ever sum COMPLETED ones, the same rule the backend's own summaries
    // enforce server-side.
    private fun completedOnly(transactions: List<Transaction>) = transactions.filter { it.status == TransactionStatus.COMPLETED }

    fun monthlyHistory(transactions: List<Transaction>, months: Int = 6): List<MonthlySummary> =
        lastNMonthKeys(months).map { key -> summarizeMonth(transactions, key) }

    private fun summarizeMonth(transactions: List<Transaction>, monthKey: String): MonthlySummary {
        val items = completedOnly(transactions).filter { isSameMonth(it.date, monthKey) }
        val income = items.filter { it.type == TransactionType.INCOME }.sumOf { it.amount }
        val expenses = items.filter { it.type == TransactionType.EXPENSE }.sumOf { it.amount }
        return MonthlySummary(monthKey, monthLabel(monthKey), income, expenses)
    }

    // Demo mode's stand-in for GET /summary/report, with the backend's rules:
    // totals over the last `range` months against the `range` before them,
    // category spending for the current month only.
    fun report(transactions: List<Transaction>, range: Int): Report {
        val history = monthlyHistory(transactions, range * 2)
        fun totals(months: List<MonthlySummary>): ReportTotals {
            val income = months.sumOf { it.income }
            val expenses = months.sumOf { it.expenses }
            val rate = if (income > 0) Math.round((income - expenses) / income * 100).toInt() else 0
            return ReportTotals(income, expenses, income - expenses, rate)
        }
        return Report(
            range = range,
            months = history.drop(range),
            totals = totals(history.drop(range)),
            previousTotals = totals(history.take(range)),
            categories = categoryBreakdown(transactions).map { ReportCategory(it.category, it.amount) },
        )
    }

    data class CategoryBreakdownEntry(val category: CategoryId, val amount: Double, val percentage: Int)

    fun categoryBreakdown(transactions: List<Transaction>, monthKey: String = currentMonthKey()): List<CategoryBreakdownEntry> {
        val items = completedOnly(transactions).filter { it.type == TransactionType.EXPENSE && isSameMonth(it.date, monthKey) }
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
        completedOnly(transactions)
            .filter { it.type == TransactionType.EXPENSE && isSameMonth(it.date, monthKey) }
            .forEach { t ->
                val day = t.date.substring(8, 10).toInt()
                val week = ((day - 1) / 7).coerceAtMost(4)
                buckets[week] += t.amount
            }
        return buckets.mapIndexed { i, amount -> WeekPoint("Sem ${i + 1}", amount) }
    }
}
