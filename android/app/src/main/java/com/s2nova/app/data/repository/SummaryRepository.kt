package com.s2nova.app.data.repository

import com.s2nova.app.data.AnalyticsHelpers
import com.s2nova.app.data.model.BalancePoint
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.MonthlySummary
import com.s2nova.app.data.model.Report
import com.s2nova.app.data.model.ReportCategory
import com.s2nova.app.data.model.ReportChange
import com.s2nova.app.data.model.ReportChanges
import com.s2nova.app.data.model.ReportTotals
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.monthLabel
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ApiService
import com.s2nova.app.data.remote.MonthSummaryDto
import com.s2nova.app.data.remote.ReportTotalsDto
import com.s2nova.app.data.todayISO
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

// Monthly income/expense totals computed by the backend (GET
// /summary/months) over every COMPLETED transaction — not the client's
// 200-row page — so Inicio shows the same month figures as Web.
class SummaryRepository(
    private val categories: CategoryRepository,
    private val api: ApiService = ApiClient.api,
) {
    private val _months = MutableStateFlow<List<MonthlySummary>>(emptyList())

    // Oldest first; the last entry is the current month. Two months by
    // default: Inicio's stat tiles compare this month with the previous one.
    val months: StateFlow<List<MonthlySummary>> = _months.asStateFlow()

    suspend fun refresh(count: Int = 2, today: String = todayISO()) {
        if (DemoModeFlag.active) return
        _months.value = api.getMonthSummaries(count, today).map(::toSummary)
    }

    // Reportes for a 3/6/12-month range ending with `today`'s month. Demo
    // mode derives the same shape from the fictitious transactions instead.
    suspend fun report(range: Int, today: String = todayISO(), demoTransactions: () -> List<Transaction> = { emptyList() }): Report {
        if (DemoModeFlag.active) return AnalyticsHelpers.report(demoTransactions(), range, com.s2nova.app.data.AppContainer.currencyRepository.principal)
        val body = api.getReport(range, today)
        return Report(
            range = body.range,
            months = body.months.map(::toSummary),
            totals = toTotals(body.totals),
            previousTotals = toTotals(body.previousTotals),
            categories = body.categories.map {
                ReportCategory(categories.idForBackendId(it.categoryId) ?: "exp.other", it.amount)
            },
            changes = body.changes?.let { c ->
                ReportChanges(
                    c.current,
                    c.previous,
                    c.categories.map { ReportChange(categories.idForBackendId(it.categoryId) ?: "exp.other", it.current, it.previous) },
                )
            } ?: ReportChanges(0.0, 0.0, emptyList()),
            balanceHistory = body.netWorth?.history.orEmpty().map { BalancePoint(it.month, it.balance) },
        )
    }

    private val _balances = MutableStateFlow<List<BalancePoint>>(emptyList())

    // Inicio's hero bars: the wallets' balance at each of the last six
    // month closes, from the report (demo mode derives it from the
    // fictitious movements and today's wallet total).
    val balances: StateFlow<List<BalancePoint>> = _balances.asStateFlow()

    suspend fun refreshBalances(walletTotal: Double, demoTransactions: () -> List<Transaction> = { emptyList() }) {
        _balances.value = if (DemoModeFlag.active) {
            AnalyticsHelpers.balanceHistory(demoTransactions(), walletTotal, 6, com.s2nova.app.data.AppContainer.currencyRepository.principal)
        } else {
            report(6).balanceHistory
        }
    }

    private fun toSummary(dto: MonthSummaryDto) = MonthlySummary(dto.month, monthLabel(dto.month), dto.income.toDouble(), dto.expenses.toDouble())

    private fun toTotals(dto: ReportTotalsDto) = ReportTotals(dto.income.toDouble(), dto.expenses.toDouble(), dto.savings.toDouble(), dto.savingsRate)

    // Overrides the list with fictitious data for local-only demo mode —
    // never calls the network. See AppContainer.enterDemoMode().
    fun loadDemo(months: List<MonthlySummary>) {
        _months.value = months
    }
}
