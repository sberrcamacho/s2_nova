package com.s2nova.app.data.notifications

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.s2nova.app.MainActivity
import com.s2nova.app.R
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.remote.NotificationCaptureRequest
import com.s2nova.app.data.repository.MovementSuggestion
import com.s2nova.app.ui.StringKey
import com.s2nova.app.data.formatMoney
import com.s2nova.app.ui.tr
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import retrofit2.HttpException
import java.time.Instant

// "Registrar desde notificaciones": with the user's consent and Android's
// notification access, notifications from the bank and wallet apps the user
// picked are read and sent to the backend, which reads the movement in them
// (routes/suggestions.ts) for the user to confirm under "Por confirmar".
//
// A captured notification waits in a small on-device queue (excluded from
// backups, dropped after a week or on sign-out) until the session can be
// used without ending it: past "Cierre automático" the server would close
// it, so the queue is sent the next time the app opens instead.
object NotificationCapture {
    private const val SETTINGS = "s2nova_capture"
    private const val QUEUE = "s2nova_capture_queue"
    private const val CHANNEL_ID = "suggestions"
    private const val WORK_NAME = "s2nova-capture"
    private const val MAX_QUEUE = 50
    private const val MAX_AGE_MS = 7L * 24 * 60 * 60 * 1000
    const val EXTRA_SUGGESTION = "s2nova.suggestion"
    const val ACTION_DISMISS = "com.s2nova.app.DISMISS_SUGGESTION"

    private val json = Json { ignoreUnknownKeys = true }
    private var appContext: Context? = null

    @Serializable
    data class Settings(
        val enabled: Boolean = false,
        val allowAi: Boolean = false,
        // Package → the wallet its movements go to (null: ask on confirm).
        val apps: Map<String, String?> = emptyMap(),
        val labels: Map<String, String> = emptyMap(),
    )

    @Serializable
    data class Captured(val packageName: String, val appLabel: String, val title: String, val text: String, val postedAt: Long)

    fun init(context: Context) {
        val ctx = context.applicationContext
        appContext = ctx
        val channel = NotificationChannel(CHANNEL_ID, tr(StringKey.CAPTURE_CHANNEL), NotificationManager.IMPORTANCE_DEFAULT)
            .apply { description = tr(StringKey.CAPTURE_CHANNEL_DETAIL) }
        ctx.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    fun settings(context: Context = appContext!!): Settings =
        prefs(context, SETTINGS).getString("settings", null)?.let { runCatching { json.decodeFromString<Settings>(it) }.getOrNull() } ?: Settings()

    fun saveSettings(settings: Settings, context: Context = appContext!!) {
        prefs(context, SETTINGS).edit().putString("settings", json.encodeToString(Settings.serializer(), settings)).apply()
    }

    // Android's switch for this app under "Acceso a notificaciones".
    fun accessGranted(context: Context = appContext!!): Boolean =
        androidx.core.app.NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)

    // A suggestion handled anywhere (opened, confirmed or dismissed) takes
    // its "¿Registrar…?" notification with it.
    fun cancel(id: String) {
        val ctx = appContext ?: return
        runCatching { NotificationManagerCompat.from(ctx).cancel(id.hashCode()) }
    }

    // Signing out: nothing more is read or sent for that account.
    fun clear() {
        val ctx = appContext ?: return
        prefs(ctx, QUEUE).edit().clear().apply()
        saveSettings(Settings(), ctx)
    }

    internal fun enqueue(context: Context, item: Captured) {
        synchronized(this) {
            val list = queue(context).filterNot { it.packageName == item.packageName && it.postedAt == item.postedAt } + item
            saveQueue(context, list.takeLast(MAX_QUEUE))
        }
        WorkManager.getInstance(context).enqueueUniqueWork(
            WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<CaptureWorker>().setConstraints(Constraints(requiredNetworkType = NetworkType.CONNECTED)).build(),
        )
    }

    // Sends what is queued. `notify`: post "¿Registrar…?" for each new
    // suggestion (from the background; the open app shows them on Inicio).
    suspend fun flush(context: Context = appContext!!, notify: Boolean = false) {
        val now = System.currentTimeMillis()
        val pending = synchronized(this) { queue(context).filter { now - it.postedAt < MAX_AGE_MS } }
        if (pending.isEmpty()) return
        val settings = settings(context)
        val sent = mutableSetOf<Captured>()
        for (item in pending) {
            val result = runCatching {
                AppContainer.suggestionRepository.capture(
                    NotificationCaptureRequest(
                        packageName = item.packageName,
                        appLabel = item.appLabel,
                        title = item.title,
                        text = item.text,
                        postedAt = Instant.ofEpochMilli(item.postedAt).toString(),
                        accountId = settings.apps[item.packageName],
                        allowAi = settings.allowAi,
                    ),
                )
            }
            val error = result.exceptionOrNull()
            // A rejected one (4xx) won't succeed later either; a network
            // failure stays queued.
            if (error == null || (error is HttpException && error.code() in 400..499)) sent += item
            if (notify) result.getOrNull()?.let { post(context, it) }
        }
        synchronized(this) { saveQueue(context, queue(context).filter { it !in sent && now - it.postedAt < MAX_AGE_MS }) }
    }

    private fun post(context: Context, s: MovementSuggestion) {
        if (!AlertNotifier.canPost(context)) return
        val money = formatMoney(s.amount, s.currency)
        val title = tr(if (s.type == TransactionType.INCOME) StringKey.CAPTURE_ASK_INCOME else StringKey.CAPTURE_ASK_EXPENSE).format(money)
        val body = listOfNotNull(s.merchant, s.appLabel).joinToString(" · ")
        val open = PendingIntent.getActivity(
            context, s.id.hashCode(),
            Intent(context, MainActivity::class.java).putExtra(EXTRA_SUGGESTION, s.id).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val dismiss = PendingIntent.getBroadcast(
            context, s.id.hashCode(),
            Intent(context, SuggestionActionReceiver::class.java).setAction(ACTION_DISMISS).putExtra(EXTRA_SUGGESTION, s.id),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notification)
            .setColor(0xFF6622D6.toInt())
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(open)
            .addAction(0, tr(StringKey.CAPTURE_REGISTER), open)
            .addAction(0, tr(StringKey.CAPTURE_DISMISS), dismiss)
            // Amounts stay off the lock screen.
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setAutoCancel(true)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(s.id.hashCode(), notification) }
    }

    private fun prefs(context: Context, name: String) = context.getSharedPreferences(name, Context.MODE_PRIVATE)

    private fun queue(context: Context): List<Captured> =
        prefs(context, QUEUE).getString("items", null)?.let { runCatching { json.decodeFromString<List<Captured>>(it) }.getOrNull() } ?: emptyList()

    private fun saveQueue(context: Context, items: List<Captured>) {
        prefs(context, QUEUE).edit().putString("items", json.encodeToString(kotlinx.serialization.builtins.ListSerializer(Captured.serializer()), items)).apply()
    }
}

// Reads notifications from the apps the user picked, nothing else. Android
// binds it only while the user allows "Acceso a notificaciones".
class NotificationCaptureService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val settings = runCatching { NotificationCapture.settings(applicationContext) }.getOrNull() ?: return
        if (!settings.enabled || sbn.packageName !in settings.apps) return
        val n = sbn.notification ?: return
        // Progress, calls and group summaries are not movements.
        if (n.flags and Notification.FLAG_ONGOING_EVENT != 0 || n.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
        val extras = n.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString().orEmpty()
        if (text.isBlank() && title.isBlank()) return
        val label = settings.labels[sbn.packageName] ?: sbn.packageName
        NotificationCapture.enqueue(applicationContext, NotificationCapture.Captured(sbn.packageName, label.take(80), title.take(300), text.take(1000), sbn.postTime))
    }
}

class CaptureWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        AppContainer.init(applicationContext)
        // Only while the session can be used without ending it; otherwise
        // the queue goes out when the app next opens.
        if (AlertNotifier.sessionUsable(applicationContext)) runCatching { NotificationCapture.flush(applicationContext, notify = true) }
        return Result.success()
    }
}

// "Descartar" on a "¿Registrar…?" notification.
class SuggestionActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(NotificationCapture.EXTRA_SUGGESTION) ?: return
        NotificationManagerCompat.from(context).cancel(id.hashCode())
        AppContainer.init(context.applicationContext)
        val done = goAsync()
        AppContainer.appScope.launch {
            if (AlertNotifier.sessionUsable(context.applicationContext)) runCatching { AppContainer.suggestionRepository.dismiss(id) }
            done.finish()
        }
    }
}

// The suggestion a tapped notification asks to open, for the nav graph.
object SuggestionLaunch {
    val requested = kotlinx.coroutines.flow.MutableStateFlow<String?>(null)

    fun request(id: String) {
        requested.value = id
    }
}
