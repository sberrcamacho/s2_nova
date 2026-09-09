package com.s2nova.app.data.repository

import com.s2nova.app.data.model.Goal
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.CreateGoalRequest
import com.s2nova.app.data.remote.DeleteGoalRequest
import com.s2nova.app.data.remote.GoalDto
import com.s2nova.app.data.remote.UpdateGoalRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

private fun GoalDto.toGoal() = Goal(
    id = id,
    name = name,
    targetAmount = targetAmount.toDouble(),
    currentAmount = currentAmount.toDouble(),
    targetDate = targetDate?.take(10),
    themeIcon = themeIcon,
)

class GoalRepository {
    private val _goals = MutableStateFlow<List<Goal>>(emptyList())
    val goals: StateFlow<List<Goal>> = _goals.asStateFlow()

    suspend fun refresh() {
        if (DemoModeFlag.active) return
        _goals.value = ApiClient.api.getGoals().map { it.toGoal() }
    }

    // Overrides the in-memory list with fictitious data for local-only demo
    // mode — never calls the network. See AppContainer.enterDemoMode().
    fun loadDemo(goals: List<Goal>) {
        _goals.value = goals
    }

    suspend fun create(name: String, targetAmount: Double, targetDate: String? = null, themeIcon: String? = null): Goal? {
        if (DemoModeFlag.active) return null
        val dto = ApiClient.api.createGoal(CreateGoalRequest(name, targetAmount.toLong(), targetDate, themeIcon))
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
        val dto = ApiClient.api.updateGoal(
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
    suspend fun delete(id: String, returnToAccountId: String? = null) {
        if (DemoModeFlag.active) return
        ApiClient.api.deleteGoal(id, DeleteGoalRequest(returnToAccountId))
        _goals.value = _goals.value.filterNot { it.id == id }
    }
}
