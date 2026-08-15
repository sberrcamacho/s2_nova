package com.s2nova.app.data.repository

import com.s2nova.app.data.currentMonthKey
import com.s2nova.app.data.isSameMonth
import com.s2nova.app.data.mock.seedBudgets
import com.s2nova.app.data.model.BudgetProgress
import com.s2nova.app.data.model.BudgetStatus
import com.s2nova.app.data.model.CategoryBudget
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

// Mirrors web/src/services/budgetService.ts
class BudgetRepository {
    private val _budgets = MutableStateFlow(seedBudgets())
    val budgets: StateFlow<List<CategoryBudget>> = _budgets.asStateFlow()

    fun setLimit(category: CategoryId, limit: Double, month: String = currentMonthKey()) {
        val existing = _budgets.value.find { it.category == category && it.month == month }
        _budgets.value = if (existing != null) {
            _budgets.value.map { if (it === existing) it.copy(limit = limit) else it }
        } else {
            _budgets.value + CategoryBudget("bud_${category}_$month", category, limit, month)
        }
    }

    fun progressFor(budget: CategoryBudget, transactions: List<Transaction>): BudgetProgress {
        val spent = transactions
            .filter { it.type == TransactionType.EXPENSE && it.category == budget.category && isSameMonth(it.date, budget.month) }
            .sumOf { it.amount }
        val percentage = if (budget.limit > 0) ((spent / budget.limit) * 100).toInt().coerceAtMost(999) else 0
        val status = when {
            percentage >= 100 -> BudgetStatus.OVER_BUDGET
            percentage >= 80 -> BudgetStatus.NEAR_LIMIT
            else -> BudgetStatus.ON_TRACK
        }
        return BudgetProgress(budget, spent, budget.limit - spent, percentage, status)
    }

    fun progressList(transactions: List<Transaction>, month: String = currentMonthKey()): List<BudgetProgress> =
        _budgets.value.filter { it.month == month }.map { progressFor(it, transactions) }
}
