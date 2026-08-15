package com.s2nova.app.data.mock

import com.s2nova.app.data.model.AppNotification
import com.s2nova.app.data.model.NotificationTone

// Mirrors web/src/data/notifications.ts
fun seedNotifications(): List<AppNotification> = listOf(
    AppNotification("n1", "Presupuesto casi al límite", "Ya usaste el 84% del presupuesto de Alimentación.", "Hace 2 h", read = false, tone = NotificationTone.WARNING),
    AppNotification("n2", "Salario recibido", "Se acreditó tu nómina mensual.", "Hace 1 día", read = false, tone = NotificationTone.POSITIVE),
    AppNotification("n3", "Compra registrada", "Se registró una compra escaneada en Éxito.", "Hace 2 días", read = true, tone = NotificationTone.INFO),
    AppNotification("n4", "Resumen mensual disponible", "Tu reporte del mes anterior ya está listo.", "Hace 3 días", read = true, tone = NotificationTone.INFO),
)
