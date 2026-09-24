package com.s2nova.app.data.repository

import com.s2nova.app.data.model.AppNotification
import com.s2nova.app.data.model.NotificationTone
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

// Local, one-off notices posted by this device (e.g. the scanner's
// "Compra registrada"). The actionable alerts — Programados due, open
// loans, budgets and goals near their limit — come from the backend's
// shared rule set instead; see AlertRepository. The bell sheet shows both.
class NotificationRepository {
    private val _notifications = MutableStateFlow<List<AppNotification>>(emptyList())
    val notifications: StateFlow<List<AppNotification>> = _notifications.asStateFlow()

    fun markAllRead() {
        _notifications.value = _notifications.value.map { it.copy(read = true) }
    }

    fun markRead(id: String) {
        _notifications.value = _notifications.value.map { if (it.id == id) it.copy(read = true) else it }
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
}
