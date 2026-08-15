package com.s2nova.app.data.repository

import com.s2nova.app.data.mock.seedNotifications
import com.s2nova.app.data.model.AppNotification
import com.s2nova.app.data.model.NotificationTone
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

// Mirrors the notification inbox implied by the Figma reference (not
// present in the current web app) — the barcode-scan flow posts here so a
// successful purchase registration is visibly reflected end-to-end.
class NotificationRepository {
    private val _notifications = MutableStateFlow(seedNotifications())
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
}
