package com.s2nova.app.data.repository

import com.s2nova.app.data.model.Goal
import com.s2nova.app.data.model.GoalPlan
import com.s2nova.app.data.model.GoalPlanEnd
import com.s2nova.app.data.model.RecurrenceInterval
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ApiService
import com.s2nova.app.data.remote.CreateGoalRequest
import com.s2nova.app.data.remote.DeleteGoalRequest
import com.s2nova.app.data.remote.GoalContributeRequest
import com.s2nova.app.data.remote.GoalDto
import com.s2nova.app.data.remote.GoalPlanRequest
import com.s2nova.app.data.remote.UpdateGoalRequest
import com.s2nova.app.data.todayISO
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.time.LocalDate
import java.util.UUID
import kotlin.math.roundToInt

internal fun GoalDto.toGoal() = Goal(
    id = id,
    name = name,
    targetAmount = targetAmount,
    currentAmount = currentAmount,
    remaining = remaining,
    percentage = percentage,
    targetDate = targetDate?.take(10),
    icon = icon,
    initialAmount = initialAmount,
    plan = plan?.let {
        GoalPlan(
            amount = it.amount,
            frequency = RecurrenceInterval.valueOf(it.frequency),
            walletId = it.accountId,
            startDate = it.startDate.take(10),
            endMode = GoalPlanEnd.valueOf(it.endMode),
            count = it.count,
            endDate = it.endDate?.take(10),
            autoConfirm = it.autoConfirm,
            nextDate = it.nextDate.take(10),
            active = it.active,
            due = it.due,
        )
    },
    contributions = contributions.associate { it.accountId to it.amount },
)

fun GoalPlan.nextAfter(): String {
    val d = LocalDate.parse(nextDate)
    return when (frequency) {
        RecurrenceInterval.DAILY -> d.plusDays(1)
        RecurrenceInterval.WEEKLY -> d.plusWeeks(1)
        RecurrenceInterval.MONTHLY -> d.plusMonths(1)
        RecurrenceInterval.YEARLY -> d.plusYears(1)
    }.toString()
}

// Goals, "Abonar" and the "Aporte periódico" (PLANS.md §2–3), backed by
// backend/src/routes/goals.ts. Guest mode keeps them in memory.
class GoalRepository(private val api: ApiService = ApiClient.api) {
    private val _goals = MutableStateFlow<List<Goal>>(emptyList())
    val goals: StateFlow<List<Goal>> = _goals.asStateFlow()

    suspend fun refresh() {
        if (DemoModeFlag.active) return
        _goals.value = api.getGoals(todayISO()).map { it.toGoal() }
    }

    fun loadDemo(goals: List<Goal>) {
        _goals.value = goals
    }

    private fun recompute(g: Goal, current: Double = g.currentAmount): Goal {
        val pct = if (g.targetAmount > 0) (current / g.targetAmount * 100).roundToInt().coerceAtMost(999) else 0
        return g.copy(currentAmount = current, remaining = g.targetAmount - current, percentage = pct)
    }

    private fun replace(goal: Goal): Goal {
        _goals.value = _goals.value.map { if (it.id == goal.id) goal else it }
        return goal
    }

    private fun planRequest(p: GoalPlan) = GoalPlanRequest(p.amount, p.frequency.name, p.walletId, p.startDate, p.endMode.name, p.count, p.endDate, p.autoConfirm)

    // plan = null leaves no periodic contribution; on edit, planChanged says
    // whether to replace/remove the stored one.
    suspend fun create(name: String, icon: String, targetAmount: Double, initialAmount: Double, targetDate: String?, plan: GoalPlan?): Goal? {
        if (DemoModeFlag.active) {
            val g = recompute(Goal(UUID.randomUUID().toString(), name, targetAmount, initialAmount, targetDate = targetDate, icon = icon, initialAmount = initialAmount, plan = plan))
            _goals.value = _goals.value + g
            return g
        }
        var goal = api.createGoal(CreateGoalRequest(name, icon, targetAmount, initialAmount, targetDate)).toGoal()
        if (plan != null) goal = api.setGoalPlan(goal.id, planRequest(plan)).toGoal()
        _goals.value = _goals.value + goal
        return goal
    }

    suspend fun update(id: String, name: String, icon: String, targetAmount: Double, initialAmount: Double, targetDate: String?, plan: GoalPlan?, planChanged: Boolean): Goal? {
        if (DemoModeFlag.active) {
            val old = _goals.value.firstOrNull { it.id == id } ?: return null
            val current = old.currentAmount - old.initialAmount + initialAmount
            return replace(recompute(old.copy(name = name, icon = icon, targetAmount = targetAmount, initialAmount = initialAmount, targetDate = targetDate, plan = plan), current))
        }
        var goal = api.updateGoal(id, UpdateGoalRequest(name, icon, targetAmount, initialAmount, targetDate)).toGoal()
        if (planChanged) goal = (if (plan != null) api.setGoalPlan(id, planRequest(plan)) else api.removeGoalPlan(id)).toGoal()
        return replace(goal)
    }

    // "Abonar": a one-off contribution out of a wallet.
    suspend fun contribute(id: String, amount: Double, walletId: String): Goal? {
        if (DemoModeFlag.active) {
            val old = _goals.value.firstOrNull { it.id == id } ?: return null
            com.s2nova.app.data.AppContainer.walletRepository.adjustLocal(walletId, -amount)
            val contributions = old.contributions + (walletId to (old.contributions[walletId] ?: 0.0) + amount)
            return replace(recompute(old.copy(contributions = contributions), old.currentAmount + amount))
        }
        return replace(api.contributeToGoal(id, GoalContributeRequest(amount, walletId)).toGoal())
    }

    // "Confirmar aporte" / "Omitir esta vez" on a due periodic contribution.
    suspend fun confirmPlan(id: String): Goal? {
        if (DemoModeFlag.active) {
            val old = _goals.value.firstOrNull { it.id == id } ?: return null
            val plan = old.plan ?: return null
            val after = contribute(id, plan.amount, plan.walletId) ?: return null
            return replace(after.copy(plan = plan.copy(nextDate = plan.nextAfter(), due = false)))
        }
        return replace(api.confirmGoalPlan(id).toGoal())
    }

    suspend fun skipPlan(id: String): Goal? {
        if (DemoModeFlag.active) {
            val old = _goals.value.firstOrNull { it.id == id } ?: return null
            val plan = old.plan ?: return null
            return replace(old.copy(plan = plan.copy(nextDate = plan.nextAfter(), due = false)))
        }
        return replace(api.skipGoalPlan(id).toGoal())
    }

    // returnToAccountId / returnToOrigin decide where saved money goes
    // (backend creates real INCOME movements). Refresh wallets afterwards.
    suspend fun delete(id: String, returnToAccountId: String? = null, returnToOrigin: Boolean = false) {
        if (DemoModeFlag.active) {
            val g = _goals.value.firstOrNull { it.id == id }
            if (g != null) {
                val wallets = com.s2nova.app.data.AppContainer.walletRepository
                if (returnToOrigin) g.contributions.forEach { (w, a) -> wallets.adjustLocal(w, a) }
                else if (returnToAccountId != null) wallets.adjustLocal(returnToAccountId, g.currentAmount - g.initialAmount)
            }
            _goals.value = _goals.value.filterNot { it.id == id }
            return
        }
        val response = api.deleteGoal(id, DeleteGoalRequest(returnToAccountId, returnToOrigin.takeIf { it }))
        if (!response.isSuccessful) {
            throw retrofit2.HttpException(response)
        }
        _goals.value = _goals.value.filterNot { it.id == id }
    }
}
