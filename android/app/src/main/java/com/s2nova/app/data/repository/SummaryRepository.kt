package com.s2nova.app.data.repository

import com.s2nova.app.data.model.MonthlySummary
import com.s2nova.app.data.monthLabel
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ApiService
import com.s2nova.app.data.todayISO
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

// Monthly income/expense totals computed by the backend (GET
// /summary/months) over every COMPLETED transaction — not the client's
// 200-row page — so Inicio shows the same month figures as Web.
class SummaryRepository(private val api: ApiService = ApiClient.api) {
    private val _months = MutableStateFlow<List<MonthlySummary>>(emptyList())

    // Oldest first; the last entry is the current month.
    val months: StateFlow<List<MonthlySummary>> = _months.asStateFlow()

    suspend fun refresh(count: Int = 1, today: String = todayISO()) {
        if (DemoModeFlag.active) return
        _months.value = api.getMonthSummaries(count, today).map {
            MonthlySummary(it.month, monthLabel(it.month), it.income.toDouble(), it.expenses.toDouble())
        }
    }

    // Overrides the list with fictitious data for local-only demo mode —
    // never calls the network. See AppContainer.enterDemoMode().
    fun loadDemo(months: List<MonthlySummary>) {
        _months.value = months
    }
}
