package com.s2nova.app.data.repository

import com.s2nova.app.data.model.Goal
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ApiService
import com.s2nova.app.data.remote.CreateGoalRequest
import com.s2nova.app.data.remote.DeleteGoalRequest
import com.s2nova.app.data.remote.GoalDto
import com.s2nova.app.data.remote.UpdateGoalRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

internal fun GoalDto.toGoal() = Goal(
    id = id,
    name = name,
    targetAmount = targetAmount.toDouble(),
    currentAmount = currentAmount.toDouble(),
    remaining = remaining.toDouble(),
    percentage = percentage,
    targetDate = targetDate?.take(10),
    themeIcon = themeIcon,
    contributions = contributions.associate { it.accountId to it.amount.toDouble() },
)

// `api` defaults to the real singleton so every production call site
// (AppContainer) is unaffected; tests pass a MockWebServer-backed ApiService
// instead — no DI framework involved, just a default constructor argument.
class GoalRepository(private val api: ApiService = ApiClient.api) {
    private val _goals = MutableStateFlow<List<Goal>>(emptyList())
    val goals: StateFlow<List<Goal>> = _goals.asStateFlow()

    suspend fun refresh() {
        if (DemoModeFlag.active) return
        _goals.value = api.getGoals().map { it.toGoal() }
    }

    // Overrides the in-memory list with fictitious data for local-only demo
    // mode — never calls the network. See AppContainer.enterDemoMode().
    fun loadDemo(goals: List<Goal>) {
        _goals.value = goals
    }

    suspend fun create(name: String, targetAmount: Double, targetDate: String? = null, themeIcon: String? = null): Goal? {
        if (DemoModeFlag.active) return null
        val dto = api.createGoal(CreateGoalRequest(name, targetAmount.toLong(), targetDate, themeIcon))
        val goal = dto.toGoal()
        _goals.value = _goals.value + goal
        return goal
    }

    suspend fun update(
        id: String,
        name: String? = null,
        targetAmount: Double? = null,
        targetDate: String? = null,
        themeIcon: String? = null,
    ): Goal? {
        if (DemoModeFlag.active) return null
        val dto = api.updateGoal(
            id,
            UpdateGoalRequest(name = name, targetAmount = targetAmount?.toLong(), targetDate = targetDate, themeIcon = themeIcon),
        )
        val goal = dto.toGoal()
        _goals.value = _goals.value.map { if (it.id == id) goal else it }
        return goal
    }

    // returnToAccountId is required by the backend only when the goal's
    // currentAmount > 0 (it creates a real INCOME transaction there for the
    // returned amount before deleting) — see backend/src/routes/goals.ts.
    // The caller should refresh AppContainer.walletRepository afterward
    // when returnToAccountId was passed, since that wallet's balance just
    // changed server-side.
    //
    // deleteGoal returns a raw Response<Unit>, which Retrofit does not
    // auto-throw for non-2xx codes — so a rejected request (e.g. the 422
    // when returnToAccountId is missing or points at a wallet that isn't
    // the user's) must be checked explicitly, or the goal gets dropped from
    // local state while still existing server-side and reappears on the
    // next refresh().
    suspend fun delete(id: String, returnToAccountId: String? = null, returnToOrigin: Boolean = false) {
        if (DemoModeFlag.active) return
        val response = api.deleteGoal(id, DeleteGoalRequest(returnToAccountId, returnToOrigin.takeIf { it }))
        if (!response.isSuccessful) {
            throw retrofit2.HttpException(response)
        }
        _goals.value = _goals.value.filterNot { it.id == id }
    }
}
