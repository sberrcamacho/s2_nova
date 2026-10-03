package com.s2nova.app.data.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.s2nova.app.MainActivity
import com.s2nova.app.R
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.Currency
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.repository.DemoModeFlag
import com.s2nova.app.data.repository.toAppAlert
import com.s2nova.app.data.todayISO
import com.s2nova.app.ui.CurrencyFormatter
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.presentAlert
import com.s2nova.app.ui.tr
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.time.LocalDate
import java.util.concurrent.TimeUnit

// System notifications for the shared alerts (Programados due, loans,
// budgets and goals), shown only while Ajustes › Notificaciones is on and
// Android allows them.
//
// A periodic worker posts each alert once. With a usable session it reads
// the live rule set (GET /alerts). When it can't — "Cierre automático"
// ends the session minutes after the app closes — it falls back to the
// Programados' next dates saved the last time the app synced, so a
// payment due today is still announced.
object AlertNotifier {
    private const val CHANNEL_ID = "alerts"
    private const val WORK_NAME = "s2nova-alerts"
    private const val PREFS = "s2nova_alert_notifications"
    private const val KEY_SNAPSHOT = "snapshot"
    private const val KEY_NOTIFIED = "notified"
    private const val SCHEDULE_DAYS = 31L

    private val json = Json { ignoreUnknownKeys = true }
    private var appContext: Context? = null

    @Serializable
    data class Reminder(val id: String, val date: String, val title: String, val body: String)

    @Serializable
    data class Snapshot(
        val enabled: Boolean = false,
        val currency: String = "COP",
        val autoLockMinutes: Int = 5,
        val reminders: List<Reminder> = emptyList(),
    )

    fun init(context: Context) {
        val ctx = context.applicationContext
        appContext = ctx
        val channel = NotificationChannel(CHANNEL_ID, tr(StringKey.NOTIF_CHANNEL_ALERTS), NotificationManager.IMPORTANCE_DEFAULT)
            .apply { description = tr(StringKey.NOTIF_CHANNEL_ALERTS_DETAIL) }
        ctx.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(
            WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<AlertNotificationWorker>(3, TimeUnit.HOURS).build(),
        )
    }

    fun canPost(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return false
        return NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    // Saved after every foreground sync: the user's switch, the format the
    // copy needs and the Programados' next dates for the offline fallback.
    fun syncFromApp() {
        val ctx = appContext ?: return
        if (DemoModeFlag.active) return
        val user = AppContainer.authRepository.currentUser.value ?: return
        val format = CurrencyFormatter(user.preferences.currency)
        val today = LocalDate.now()
        val until = today.plusDays(SCHEDULE_DAYS)
        val reminders = AppContainer.recurringSeriesRepository.series.value
            .filter { it.active && !it.autoConfirm }
            .mapNotNull { s ->
                val date = runCatching { LocalDate.parse(s.nextOccurrenceDate.take(10)) }.getOrNull() ?: return@mapNotNull null
                if (date.isAfter(until)) return@mapNotNull null
                Reminder(
                    id = "series:${s.id}:$date",
                    date = date.toString(),
                    title = tr(StringKey.ALERT_SERIES_DUE_TITLE).format(s.name),
                    body = tr(StringKey.ALERT_SERIES_BODY).format(format(s.amount)),
                )
            }
        save(ctx, Snapshot(user.preferences.notifications, user.preferences.currency.name, user.preferences.autoLockMinutes, reminders))
    }

    fun setEnabled(enabled: Boolean) {
        val ctx = appContext ?: return
        save(ctx, load(ctx).copy(enabled = enabled))
    }

    // Signing out: nothing more is announced for that account.
    fun clear() {
        val ctx = appContext ?: return
        prefs(ctx).edit().clear().apply()
        NotificationManagerCompat.from(ctx).cancelAll()
    }

    internal suspend fun run(context: Context) {
        val snapshot = load(context)
        if (!snapshot.enabled || !canPost(context)) return
        val today = todayISO()
        val notified = prefs(context).getStringSet(KEY_NOTIFIED, emptySet()).orEmpty().toMutableSet()

        val live = liveAlerts(context, snapshot, today)
        val due = live ?: snapshot.reminders
            .filter { it.date <= today && it.date >= LocalDate.parse(today).minusDays(1).toString() }
            .map { Triple(it.id, it.title, it.body) }

        // Re-read: the live /me may have just turned the switch off.
        if (!load(context).enabled) return
        due.filter { it.first !in notified }.forEach { (id, title, body) ->
            post(context, id, title, body)
            notified += id
        }
        // Bounded to what can still be announced.
        val keep = due.map { it.first }.toSet() + snapshot.reminders.map { it.id }
        prefs(context).edit().putStringSet(KEY_NOTIFIED, notified.filterTo(mutableSetOf()) { it in keep }).apply()
    }

    // The backend's alerts as (id, title, body), or null when the session
    // can't be used without ending it.
    private suspend fun liveAlerts(context: Context, snapshot: Snapshot, today: String): List<Triple<String, String, String>>? {
        if (AppContainer.sessionStore.refreshTokenOnce() == null) return null
        // Past "Cierre automático" the server would end the session; leave
        // that to the next app start.
        val idle = AppContainer.idleTimeoutStore.persistedIdleMillis()
        if (snapshot.autoLockMinutes > 0 && (idle == null || idle >= snapshot.autoLockMinutes * 60_000L)) return null
        return runCatching {
            val me = ApiClient.api.me()
            val prefs = me.preferences
            val currency = runCatching { Currency.valueOf(prefs?.currency ?: snapshot.currency) }.getOrDefault(Currency.COP)
            save(context, snapshot.copy(enabled = prefs?.notifications ?: snapshot.enabled, currency = currency.name, autoLockMinutes = prefs?.autoLockMinutes ?: snapshot.autoLockMinutes))
            runCatching { AppContainer.categoryRepository.refresh() }
            val format = CurrencyFormatter(currency)
            val read = AppContainer.alertStateStore.load().first
            ApiClient.api.getAlerts(today)
                .mapNotNull { it.toAppAlert(AppContainer.categoryRepository) }
                .filter { it.id !in read }
                .map { alert -> presentAlert(alert, ::tr, format).let { Triple(alert.id, it.title, it.body) } }
        }.getOrNull()
    }

    private fun post(context: Context, id: String, title: String, body: String) {
        val open = PendingIntent.getActivity(
            context, 0,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notification)
            .setColor(0xFF6622D6.toInt())
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(id.hashCode(), notification) }
    }

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun load(context: Context): Snapshot =
        prefs(context).getString(KEY_SNAPSHOT, null)?.let { runCatching { json.decodeFromString<Snapshot>(it) }.getOrNull() } ?: Snapshot()

    private fun save(context: Context, snapshot: Snapshot) {
        prefs(context).edit().putString(KEY_SNAPSHOT, json.encodeToString(Snapshot.serializer(), snapshot)).apply()
    }
}

class AlertNotificationWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        AppContainer.init(applicationContext)
        runCatching { AlertNotifier.run(applicationContext) }
        return Result.success()
    }
}
