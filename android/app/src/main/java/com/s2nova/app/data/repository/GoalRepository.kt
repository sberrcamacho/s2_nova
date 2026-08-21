package com.s2nova.app.data.repository

import com.s2nova.app.data.model.Goal
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.CreateGoalRequest
import com.s2nova.app.data.remote.GoalDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

private fun GoalDto.toGoal() = Goal(
    id = id,
    name = name,
    targetAmount = targetAmount.toDouble(),
    currentAmount = currentAmount.toDouble(),
    targetDate = targetDate?.take(10),
)

class GoalRepository {
    private val _goals = MutableStateFlow<List<Goal>>(emptyList())
    val goals: StateFlow<List<Goal>> = _goals.asStateFlow()

    suspend fun refresh() {
        _goals.value = ApiClient.api.getGoals().map { it.toGoal() }
    }

    suspend fun create(name: String, targetAmount: Double, targetDate: String? = null): Goal {
        val dto = ApiClient.api.createGoal(CreateGoalRequest(name, targetAmount.toLong(), targetDate))
        val goal = dto.toGoal()
        _goals.value = _goals.value + goal
        return goal
    }

    suspend fun delete(id: String) {
        ApiClient.api.deleteGoal(id)
        _goals.value = _goals.value.filterNot { it.id == id }
    }
}
