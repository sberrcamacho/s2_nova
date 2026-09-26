package com.s2nova.app.data.repository

import com.s2nova.app.data.local.AlertStateStore
import com.s2nova.app.data.model.AppAlert
import com.s2nova.app.data.model.LoanKind
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.remote.AlertDto
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ApiService
import com.s2nova.app.data.todayISO
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

internal fun AlertDto.toAppAlert(categoryRepository: CategoryRepository): AppAlert? = runCatching {
    when (kind) {
        "SERIES_DUE" -> AppAlert.SeriesDue(
            id = id,
            seriesId = seriesId!!,
            name = name!!,
            type = TransactionType.valueOf(type!!),
            amount = amount!!,
            category = categoryRepository.idForBackendId(categoryId!!)!!,
            dueDate = dueDate!!.take(10),
            overdue = overdue,
        )
        "LOAN_OPEN" -> AppAlert.LoanOpen(
            id = id,
            transactionId = transactionId!!,
            loanKind = LoanKind.valueOf(loanKind!!),
            counterpartyName = counterpartyName,
            outstanding = outstanding!!,
            dueDate = dueDate!!.take(10),
            overdue = overdue,
        )
        "BUDGET_AT_RISK" -> AppAlert.BudgetAtRisk(
            id = id,
            budgetId = budgetId!!,
            name = name,
            category = categoryRepository.idForBackendId(categoryId!!)!!,
            spent = spent!!,
            limit = amount!!,
            percentage = percentage!!,
        )
        "GOAL_NEAR" -> AppAlert.GoalNear(
            id = id,
            goalId = goalId!!,
            name = name!!,
            icon = icon ?: "other",
            percentage = percentage!!,
            remaining = remaining!!,
        )
        "GOAL_PLAN_DUE" -> AppAlert.GoalPlanDue(
            id = id,
            goalId = goalId!!,
            name = name!!,
            icon = icon ?: "other",
            amount = amount!!,
            currency = currency ?: "COP",
            walletId = accountId!!,
            dueDate = dueDate!!.take(10),
        )
        "TX_PLANNED" -> AppAlert.TxPlanned(
            id = id,
            transactionId = transactionId!!,
            name = name.orEmpty(),
            category = categoryRepository.idForBackendId(categoryId) ?: "exp.other",
            amount = amount!!,
            currency = currency ?: "COP",
            walletName = walletName.orEmpty(),
            dueDate = dueDate!!.take(10),
        )
        "GOAL_PLAN_AUTO" -> AppAlert.GoalPlanAuto(
            id = id,
            goalId = goalId!!,
            name = name!!,
            icon = icon ?: "other",
            amount = amount!!,
            currency = currency ?: "COP",
            walletName = walletName ?: "",
            date = date!!.take(10),
        )
        // A kind added on the backend before this client knows it is
        // skipped rather than crashing the whole list.
        else -> null
    }
}.getOrNull()

// The alert card Inicio shows: the highest-priority alert (the backend
// already returns them in priority order) that is neither read in the bell
// nor dismissed from Inicio.
fun homeAlertOf(alerts: List<AppAlert>, readIds: Set<String>, dismissedIds: Set<String>): AppAlert? =
    alerts.firstOrNull { it.id !in readIds && it.id !in dismissedIds }

// The shared alert rule set (backend GET /alerts) — the single source for
// Inicio's alert card and the bell sheet, so both read the same conditions
// Web's "Alertas" grid does. Read/dismissed state is local to this device
// (AlertStateStore); `stateStore` is null in unit tests.
class AlertRepository(
    private val categoryRepository: CategoryRepository,
    private val api: ApiService = ApiClient.api,
    private val stateStore: AlertStateStore? = null,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var stateLoaded = false

    private val _alerts = MutableStateFlow<List<AppAlert>>(emptyList())
    val alerts: StateFlow<List<AppAlert>> = _alerts.asStateFlow()

    private val _readIds = MutableStateFlow<Set<String>>(emptySet())
    val readIds: StateFlow<Set<String>> = _readIds.asStateFlow()

    private val _dismissedIds = MutableStateFlow<Set<String>>(emptySet())
    val dismissedIds: StateFlow<Set<String>> = _dismissedIds.asStateFlow()

    // `today` is the device's calendar date: "due today" and the current
    // month are the user's, not the server's UTC clock.
    suspend fun refresh(today: String = todayISO()) {
        if (DemoModeFlag.active) return
        loadStateOnce()
        val alerts = api.getAlerts(today).mapNotNull { it.toAppAlert(categoryRepository) }
        _alerts.value = alerts
        // Forget state for conditions that no longer exist, so the stored
        // sets stay bounded to what the backend currently reports.
        val live = alerts.map { it.id }.toSet()
        _readIds.value = _readIds.value intersect live
        _dismissedIds.value = _dismissedIds.value intersect live
        persist()
    }

    // Overrides the list with fictitious data for local-only demo mode —
    // never calls the network. See AppContainer.enterDemoMode().
    fun loadDemo(alerts: List<AppAlert>) {
        _alerts.value = alerts
    }

    fun removeLocal(id: String) {
        _alerts.value = _alerts.value.filterNot { it.id == id }
    }

    fun markRead(id: String) {
        _readIds.value = _readIds.value + id
        persist()
    }

    fun markAllRead() {
        _readIds.value = _readIds.value + _alerts.value.map { it.id }
        persist()
    }

    fun dismissFromHome(id: String) {
        _dismissedIds.value = _dismissedIds.value + id
        persist()
    }

    private suspend fun loadStateOnce() {
        if (stateLoaded) return
        stateLoaded = true
        val (read, dismissed) = stateStore?.load() ?: return
        _readIds.value = _readIds.value + read
        _dismissedIds.value = _dismissedIds.value + dismissed
    }

    private fun persist() {
        val store = stateStore ?: return
        val read = _readIds.value
        val dismissed = _dismissedIds.value
        scope.launch { store.save(read, dismissed) }
    }
}
