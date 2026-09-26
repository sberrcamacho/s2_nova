package com.s2nova.app.data.repository

import com.s2nova.app.data.currentMonthKey
import com.s2nova.app.data.model.BudgetKind
import com.s2nova.app.data.model.BudgetPeriod
import com.s2nova.app.data.model.BudgetProgress
import com.s2nova.app.data.model.BudgetStatus
import com.s2nova.app.data.model.CategoryBudget
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ApiService
import com.s2nova.app.data.remote.BudgetDto
import com.s2nova.app.data.remote.CreateBudgetRequest
import com.s2nova.app.data.remote.UpdateBudgetRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID
import kotlin.math.roundToInt

internal fun BudgetDto.toBudgetProgress(categoryRepository: CategoryRepository): BudgetProgress? {
    val kind = runCatching { BudgetKind.valueOf(kind) }.getOrDefault(BudgetKind.CATEGORY)
    val category = categoryRepository.idForBackendId(categoryId)
    if (kind == BudgetKind.CATEGORY && category == null) return null
    val budget = CategoryBudget(
        id = id, name = name, kind = kind, category = category, icon = icon, walletIds = walletIds,
        period = runCatching { BudgetPeriod.valueOf(period) }.getOrDefault(BudgetPeriod.MONTHLY),
        startDate = startDate?.take(10), endDate = endDate?.take(10), limit = amount, month = month,
        assignedCount = assignedCount ?: 0,
    )
    val status = runCatching { BudgetStatus.valueOf(status) }.getOrDefault(BudgetStatus.ON_TRACK)
    return BudgetProgress(budget, spent, remaining, percentage, status)
}

// PLANS.md §4 thresholds: healthy < 65 %, watch 65–89 %, at risk ≥ 90 %,
// exceeded > 100 %.
fun budgetStatusOf(percentage: Int): BudgetStatus = when {
    percentage > 100 -> BudgetStatus.OVER_BUDGET
    percentage >= 90 -> BudgetStatus.AT_RISK
    percentage >= 65 -> BudgetStatus.NEAR_LIMIT
    else -> BudgetStatus.ON_TRACK
}

// Progress (spent/remaining/percentage/status) is computed server-side —
// backend/src/lib/budgetProgress.ts. Guest mode keeps the list in memory.
class BudgetRepository(
    private val categoryRepository: CategoryRepository,
    private val api: ApiService = ApiClient.api,
) {
    private val _budgetProgress = MutableStateFlow<List<BudgetProgress>>(emptyList())
    val budgetProgress: StateFlow<List<BudgetProgress>> = _budgetProgress.asStateFlow()

    suspend fun refresh(month: String = currentMonthKey()) {
        if (DemoModeFlag.active) return
        _budgetProgress.value = api.getBudgets(month).mapNotNull { it.toBudgetProgress(categoryRepository) }
    }

    fun loadDemo(budgetProgress: List<BudgetProgress>) {
        _budgetProgress.value = budgetProgress
    }

    // The category budget an expense in `category` paid from `walletId`
    // counts toward automatically (the read-only line in Nuevo movimiento).
    fun autoBudgetFor(category: CategoryId?, walletId: String?): BudgetProgress? =
        _budgetProgress.value.firstOrNull {
            it.budget.kind == BudgetKind.CATEGORY &&
                categoryRepository.isIn(category, it.budget.category) &&
                (it.budget.walletIds.isEmpty() || walletId in it.budget.walletIds)
        }

    fun customBudgets(): List<BudgetProgress> = _budgetProgress.value.filter { it.budget.kind == BudgetKind.CUSTOM }

    data class Draft(
        val kind: BudgetKind,
        val name: String?,
        val category: CategoryId?,
        val icon: String?,
        val walletIds: List<String>,
        val limit: Double,
        val period: BudgetPeriod,
        val startDate: String?,
        val endDate: String?,
    )

    private fun local(id: String, d: Draft, spent: Double, assigned: Int): BudgetProgress {
        val pct = if (d.limit > 0) (spent / d.limit * 100).roundToInt() else 0
        return BudgetProgress(
            CategoryBudget(id, d.name, d.kind, d.category, d.icon, d.walletIds, d.period, d.startDate, d.endDate, d.limit, currentMonthKey(), assigned),
            spent, d.limit - spent, pct, budgetStatusOf(pct),
        )
    }

    suspend fun create(d: Draft): BudgetProgress? {
        if (DemoModeFlag.active) {
            val p = local(UUID.randomUUID().toString(), d, 0.0, 0)
            _budgetProgress.value = _budgetProgress.value + p
            return p
        }
        val dto = api.createBudget(
            CreateBudgetRequest(
                kind = d.kind.name, name = d.name, categoryId = categoryRepository.backendIdFor(d.category),
                icon = d.icon, walletIds = d.walletIds, amount = d.limit, period = d.period.name,
                startDate = d.startDate, endDate = d.endDate,
            ),
        )
        val progress = dto.toBudgetProgress(categoryRepository) ?: return null
        _budgetProgress.value = _budgetProgress.value + progress
        return progress
    }

    // The backend answers 409 when the category already has a budget for an
    // overlapping period.
    suspend fun update(id: String, d: Draft) {
        if (DemoModeFlag.active) {
            _budgetProgress.value = _budgetProgress.value.map { if (it.budget.id == id) local(id, d, it.spent, it.budget.assignedCount) else it }
            return
        }
        val dto = api.updateBudget(
            id,
            UpdateBudgetRequest(
                name = d.name, amount = d.limit, categoryId = categoryRepository.backendIdFor(d.category), icon = d.icon,
                walletIds = d.walletIds, period = d.period.name, startDate = d.startDate, endDate = d.endDate,
            ),
        )
        val progress = dto.toBudgetProgress(categoryRepository) ?: return
        _budgetProgress.value = _budgetProgress.value.map { if (it.budget.id == id) progress else it }
    }

    suspend fun delete(id: String) {
        if (!DemoModeFlag.active) api.deleteBudget(id)
        _budgetProgress.value = _budgetProgress.value.filterNot { it.budget.id == id }
    }
}
