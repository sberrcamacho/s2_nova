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
import com.s2nova.app.data.remote.GoalExceedsRemaining
import com.s2nova.app.data.remote.asGoalExceeds
import com.s2nova.app.data.Currencies
import com.s2nova.app.data.model.NewTransactionInput
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.todayISO
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.time.LocalDate
import java.util.UUID
import kotlin.math.roundToInt

// Amounts are compared with a cent's slack, so "Completar" never trips
// on floating-point noise.
private const val EPSILON = 0.005

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

    // "Abonar": a one-off contribution out of a wallet, up to what the goal
    // still needs (more throws GoalExceedsRemaining, as the backend refuses
    // it). In guest mode it is a real movement, as on the backend, so it
    // shows in Movimientos and moves the wallet in its own currency.
    suspend fun contribute(id: String, amount: Double, walletId: String): Goal? {
        if (DemoModeFlag.active) {
            val old = _goals.value.firstOrNull { it.id == id } ?: return null
            val left = leftOf(old)
            if (amount > left + EPSILON) throw GoalExceedsRemaining(left)
            com.s2nova.app.data.AppContainer.transactionRepository.add(
                NewTransactionInput(
                    walletId = walletId,
                    description = "Aporte a ${old.name}",
                    amount = amount,
                    type = TransactionType.EXPENSE,
                    category = "exp.other",
                    date = todayISO(),
                    currency = com.s2nova.app.data.AppContainer.currencyRepository.principal,
                    goalId = id,
                ),
            )
            return _goals.value.firstOrNull { it.id == id }
        }
        val key = requestKeys.getOrPut("contribute:$id:$walletId:$amount") { java.util.UUID.randomUUID().toString() }
        val goal = try {
            api.contributeToGoal(id, GoalContributeRequest(amount, walletId), key).toGoal()
        } catch (error: retrofit2.HttpException) {
            throw error.asGoalExceeds()
        }
        return replace(goal).also { requestKeys.remove("contribute:$id:$walletId:$amount") }
    }

    private fun leftOf(goal: Goal): Double = (goal.targetAmount - goal.currentAmount).coerceAtLeast(0.0)

    // Guest mode mirrors the backend: a completed movement linked to a goal
    // counts toward it, and can't pass what the goal still needs.
    private fun counts(tx: Transaction) = tx.goalId != null && tx.status == TransactionStatus.COMPLETED && tx.type != TransactionType.TRANSFER

    private fun principalAmountOf(tx: Transaction): Double {
        val principal = com.s2nova.app.data.AppContainer.currencyRepository.principal
        return tx.amount * Currencies.referenceRate(tx.currency, principal)
    }

    fun checkDemo(tx: Transaction) {
        if (!counts(tx)) return
        val goal = _goals.value.firstOrNull { it.id == tx.goalId } ?: return
        val left = leftOf(goal)
        if (principalAmountOf(tx) > left + EPSILON) throw GoalExceedsRemaining(left)
    }

    // direction 1 adds a guest movement to its goal's progress, -1 takes it out.
    fun applyDemo(tx: Transaction, direction: Int) {
        if (!counts(tx)) return
        val goal = _goals.value.firstOrNull { it.id == tx.goalId } ?: return
        val walletMoved = (tx.walletAmount ?: tx.amount) * direction
        val contributions = goal.contributions + (tx.walletId to (goal.contributions[tx.walletId] ?: 0.0) + walletMoved)
        replace(recompute(goal.copy(contributions = contributions), goal.currentAmount + principalAmountOf(tx) * direction))
    }

    // One Idempotency-Key per pending abono / aporte, kept until it goes
    // through: a retry (by OkHttp or by the user after an error) reuses it,
    // so the server never records it twice.
    private val requestKeys = java.util.concurrent.ConcurrentHashMap<String, String>()

    // "Confirmar aporte" / "Omitir esta vez" on a due periodic contribution.
    suspend fun confirmPlan(id: String): Goal? {
        if (DemoModeFlag.active) {
            val old = _goals.value.firstOrNull { it.id == id } ?: return null
            val plan = old.plan ?: return null
            // The plan's amount, cut to what is left; a reached goal ends its plan.
            val left = leftOf(old)
            if (left <= 0.0) return replace(old.copy(plan = plan.copy(active = false, due = false)))
            val after = contribute(id, minOf(plan.amount, left), plan.walletId) ?: return null
            return replace(after.copy(plan = plan.copy(nextDate = plan.nextAfter(), due = false)))
        }
        val key = requestKeys.getOrPut("confirm:$id") { java.util.UUID.randomUUID().toString() }
        val goal = try {
            api.confirmGoalPlan(id, requestKey = key).toGoal()
        } catch (error: retrofit2.HttpException) {
            throw error.asGoalExceeds()
        }
        return replace(goal).also { requestKeys.remove("confirm:$id") }
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
