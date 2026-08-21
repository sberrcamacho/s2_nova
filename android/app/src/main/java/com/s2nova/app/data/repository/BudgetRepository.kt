package com.s2nova.app.data.repository

import com.s2nova.app.data.currentMonthKey
import com.s2nova.app.data.model.BudgetProgress
import com.s2nova.app.data.model.BudgetStatus
import com.s2nova.app.data.model.CategoryBudget
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.BudgetDto
import com.s2nova.app.data.remote.CreateBudgetRequest
import com.s2nova.app.data.remote.UpdateBudgetRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

private fun BudgetDto.toBudgetProgress(categoryRepository: CategoryRepository): BudgetProgress? {
    val categoryId = categoryRepository.categoryIdForBackendId(categoryId) ?: return null
    val budget = CategoryBudget(id = id, name = name, category = categoryId, limit = amount.toDouble(), month = month)
    val status = runCatching { BudgetStatus.valueOf(status) }.getOrDefault(BudgetStatus.ON_TRACK)
    return BudgetProgress(budget, spent.toDouble(), remaining.toDouble(), percentage, status)
}

// Progress (spent/remaining/percentage/status) is computed server-side —
// see backend/src/routes/budgets.ts `computeSpent`, which also accounts for
// transactions linked directly via budgetId, not just category+month
// matching. Keeping that logic in one place (the backend) avoids it
// drifting from a client-side reimplementation.
class BudgetRepository(private val categoryRepository: CategoryRepository) {
    private val _budgetProgress = MutableStateFlow<List<BudgetProgress>>(emptyList())
    val budgetProgress: StateFlow<List<BudgetProgress>> = _budgetProgress.asStateFlow()

    suspend fun refresh(month: String = currentMonthKey()) {
        _budgetProgress.value = ApiClient.api.getBudgets(month).mapNotNull { it.toBudgetProgress(categoryRepository) }
    }

    suspend fun create(name: String?, category: CategoryId, limit: Double, month: String = currentMonthKey()): BudgetProgress? {
        val categoryBackendId = categoryRepository.backendIdFor(category) ?: return null
        val dto = ApiClient.api.createBudget(CreateBudgetRequest(name, categoryBackendId, limit.toLong(), month))
        val progress = dto.toBudgetProgress(categoryRepository) ?: return null
        _budgetProgress.value = _budgetProgress.value + progress
        return progress
    }

    suspend fun updateLimit(id: String, limit: Double) {
        val dto = ApiClient.api.updateBudget(id, UpdateBudgetRequest(amount = limit.toLong()))
        val progress = dto.toBudgetProgress(categoryRepository) ?: return
        _budgetProgress.value = _budgetProgress.value.map { if (it.budget.id == id) progress else it }
    }
}
