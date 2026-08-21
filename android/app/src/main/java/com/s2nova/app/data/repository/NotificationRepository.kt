package com.s2nova.app.data.repository

import com.s2nova.app.data.model.AppNotification
import com.s2nova.app.data.model.BudgetProgress
import com.s2nova.app.data.model.BudgetStatus
import com.s2nova.app.data.model.Goal
import com.s2nova.app.data.model.NotificationTone
import com.s2nova.app.data.model.RecurringSeries
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.UUID

private val GOAL_MILESTONES = listOf(25, 50, 75, 100)

// Actionable-only, per the product requirement to avoid notification
// noise: budget nearing/over its limit, an upcoming recurring
// obligation due soon, and goal milestones — nothing generic. IDs are
// deterministic per underlying event (e.g. "budget_<id>_near",
// "goal_<id>_50") so recomputing on every refresh doesn't repost the same
// notification, satisfying "do not create excessive notifications"
// without needing separate persistence.
class NotificationRepository {
    private val _notifications = MutableStateFlow<List<AppNotification>>(emptyList())
    val notifications: StateFlow<List<AppNotification>> = _notifications.asStateFlow()

    fun markAllRead() {
        _notifications.value = _notifications.value.map { it.copy(read = true) }
    }

    fun add(title: String, message: String, tone: NotificationTone = NotificationTone.INFO) {
        val notification = AppNotification(
            id = "n_${UUID.randomUUID()}",
            title = title,
            message = message,
            time = "Ahora",
            read = false,
            tone = tone,
        )
        _notifications.value = listOf(notification) + _notifications.value
    }

    // Recomputes the actionable set from live data and merges it with
    // whatever's already in the inbox (preserving read state and any
    // scanner-posted notification), deduping by id.
    fun refreshFromData(budgets: List<BudgetProgress>, goals: List<Goal>, recurringSeries: List<RecurringSeries>) {
        val generated = mutableListOf<AppNotification>()
        val today = LocalDate.now()

        for (budget in budgets) {
            if (budget.status == BudgetStatus.OVER_BUDGET) {
                generated += notification(
                    id = "budget_${budget.budget.id}_over",
                    title = "Presupuesto excedido",
                    message = "Superaste tu presupuesto de \"${budget.budget.name ?: budget.budget.category.name}\" (${budget.percentage}%).",
                    tone = NotificationTone.WARNING,
                )
            } else if (budget.status == BudgetStatus.NEAR_LIMIT) {
                generated += notification(
                    id = "budget_${budget.budget.id}_near",
                    title = "Presupuesto cerca del límite",
                    message = "Ya usaste el ${budget.percentage}% de tu presupuesto de \"${budget.budget.name ?: budget.budget.category.name}\".",
                    tone = NotificationTone.WARNING,
                )
            }
        }

        for (goal in goals) {
            val percentage = if (goal.targetAmount > 0) ((goal.currentAmount / goal.targetAmount) * 100).toInt() else 0
            val milestone = GOAL_MILESTONES.lastOrNull { percentage >= it }
            if (milestone != null) {
                generated += notification(
                    id = "goal_${goal.id}_$milestone",
                    title = if (milestone >= 100) "¡Objetivo cumplido!" else "Progreso en tu objetivo",
                    message = if (milestone >= 100) "Alcanzaste tu objetivo \"${goal.name}\"." else "Vas al $milestone% de tu objetivo \"${goal.name}\".",
                    tone = if (milestone >= 100) NotificationTone.POSITIVE else NotificationTone.INFO,
                )
            }
        }

        for (series in recurringSeries) {
            if (!series.active) continue
            val dueDate = runCatching { LocalDate.parse(series.nextOccurrenceDate) }.getOrNull() ?: continue
            val daysUntilDue = ChronoUnit.DAYS.between(today, dueDate)
            if (daysUntilDue in 0..3) {
                val label = if (daysUntilDue == 0L) "hoy" else "en $daysUntilDue día(s)"
                generated += notification(
                    id = "recurring_${series.id}_${series.nextOccurrenceDate}",
                    title = "Próximo movimiento recurrente",
                    message = "\"${series.name}\" vence $label.",
                    tone = NotificationTone.INFO,
                )
            }
        }

        val existingIds = _notifications.value.map { it.id }.toSet()
        val newOnes = generated.filterNot { it.id in existingIds }
        if (newOnes.isNotEmpty()) {
            _notifications.value = newOnes + _notifications.value
        }
    }

    private fun notification(id: String, title: String, message: String, tone: NotificationTone) = AppNotification(
        id = id,
        title = title,
        message = message,
        time = "Ahora",
        read = false,
        tone = tone,
    )
}
