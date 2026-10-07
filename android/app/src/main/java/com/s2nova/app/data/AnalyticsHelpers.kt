package com.s2nova.app.data

import com.s2nova.app.data.model.BalancePoint
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.MonthlySummary
import com.s2nova.app.data.model.Report
import com.s2nova.app.data.model.ReportCategory
import com.s2nova.app.data.model.ReportChange
import com.s2nova.app.data.model.ReportChanges
import com.s2nova.app.data.model.ReportTotals
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType

// Mirrors web/src/services/analyticsService.ts — pure functions over an
// already-loaded transaction list, since there's no network round trip to
// justify a suspend/coroutine-based API for mock data.
object AnalyticsHelpers {
    // The demo account's principal (DemoData's principalCurrency).
    private const val DEMO_PRINCIPAL = "COP"

    // PLANNED ("Upcoming") transactions haven't moved money yet — see
    // Transaction.status's doc comment — so every aggregate here must only
    // ever sum COMPLETED ones, the same rule the backend's own summaries
    // enforce server-side.
    private fun completedOnly(transactions: List<Transaction>) = transactions.filter { it.status == TransactionStatus.COMPLETED }

    // Every aggregate is in the principal currency, like the backend's: a
    // US$5,99 expense adds ≈ $23.661, not $6 (it used to be summed as is).
    private fun inPrincipal(t: Transaction, principal: String) = t.amount * Currencies.referenceRate(t.currency, principal)

    fun monthlyHistory(transactions: List<Transaction>, months: Int = 6, principal: String = DEMO_PRINCIPAL): List<MonthlySummary> =
        lastNMonthKeys(months).map { key -> summarizeMonth(transactions, key, principal) }

    private fun summarizeMonth(transactions: List<Transaction>, monthKey: String, principal: String): MonthlySummary {
        val items = completedOnly(transactions).filter { isSameMonth(it.date, monthKey) }
        val income = items.filter { it.type == TransactionType.INCOME }.sumOf { inPrincipal(it, principal) }
        val expenses = items.filter { it.type == TransactionType.EXPENSE }.sumOf { inPrincipal(it, principal) }
        return MonthlySummary(monthKey, monthLabel(monthKey), income, expenses)
    }

    // Demo mode's stand-in for GET /summary/report, with the backend's rules:
    // totals over the last `range` months against the `range` before them,
    // category spending for the current month only.
    fun report(transactions: List<Transaction>, range: Int, principal: String = DEMO_PRINCIPAL, today: String = todayISO()): Report {
        val history = monthlyHistory(transactions, range * 2, principal)
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
            categories = categoryBreakdown(transactions, principal = principal).map { ReportCategory(it.category, it.amount) },
            changes = changes(transactions, today, principal),
        )
    }

    // The backend's `changes`: this month up to today against last month up
    // to the same day (capped at its last day), per parent category; the
    // top 3 by absolute change, leaving out the ones that didn't move.
    fun changes(transactions: List<Transaction>, today: String = todayISO(), principal: String = DEMO_PRINCIPAL): ReportChanges {
        val date = java.time.LocalDate.parse(today)
        val previous = date.minusMonths(1)
        val cutoff = minOf(date.dayOfMonth, previous.lengthOfMonth())
        val currentKey = today.substring(0, 7)
        val previousKey = previous.toString().substring(0, 7)
        val now = mutableMapOf<CategoryId, Double>()
        val before = mutableMapOf<CategoryId, Double>()
        completedOnly(transactions).filter { it.type == TransactionType.EXPENSE }.forEach { t ->
            val day = t.date.substring(8, 10).toInt()
            when {
                isSameMonth(t.date, currentKey) && day <= date.dayOfMonth -> now.merge(t.category, inPrincipal(t, principal), Double::plus)
                isSameMonth(t.date, previousKey) && day <= cutoff -> before.merge(t.category, inPrincipal(t, principal), Double::plus)
            }
        }
        val categories = (now.keys + before.keys)
            .map { ReportChange(it, now[it] ?: 0.0, before[it] ?: 0.0) }
            .filter { it.delta != 0.0 }
            .sortedByDescending { kotlin.math.abs(it.delta) }
            .take(3)
        return ReportChanges(now.values.sum(), before.values.sum(), categories)
    }

    // The backend's netWorth.history balances: today's wallet total minus
    // what income and expenses moved after each month's close (transfers
    // only move money between wallets).
    fun balanceHistory(transactions: List<Transaction>, walletTotal: Double, months: Int = 6, principal: String = DEMO_PRINCIPAL, today: String = todayISO()): List<BalancePoint> {
        val moved = completedOnly(transactions).filter { it.type != TransactionType.TRANSFER && it.date <= today }
        return lastNMonthKeys(months).map { key ->
            val after = moved.filter { it.date.substring(0, 7) > key }
                .sumOf { (if (it.type == TransactionType.INCOME) 1 else -1) * inPrincipal(it, principal) }
            BalancePoint(key, walletTotal - after)
        }
    }

    data class CategoryBreakdownEntry(val category: CategoryId, val amount: Double, val percentage: Int)

    fun categoryBreakdown(transactions: List<Transaction>, monthKey: String = currentMonthKey(), principal: String = DEMO_PRINCIPAL): List<CategoryBreakdownEntry> {
        val items = completedOnly(transactions).filter { it.type == TransactionType.EXPENSE && isSameMonth(it.date, monthKey) }
        val total = items.sumOf { inPrincipal(it, principal) }
        return items.groupBy { it.category }
            .map { (category, txns) ->
                val amount = txns.sumOf { inPrincipal(it, principal) }
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
        return buckets.mapIndexed { i, amount -> WeekPoint(com.s2nova.app.ui.tr(com.s2nova.app.ui.StringKey.REP_WEEK, i + 1), amount) }
    }
}
