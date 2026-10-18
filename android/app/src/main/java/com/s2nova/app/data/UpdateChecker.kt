package com.s2nova.app.data

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.s2nova.app.BuildConfig
import com.s2nova.app.R
import com.s2nova.app.data.notifications.AlertNotifier
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.tr
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

// The app is installed from the APK on GitHub Releases (the landing's
// "Descargar para Android"), so it asks GitHub for the latest release and
// tells the user when it is newer than this build: a sheet in the app
// (once per version) and, from a daily background check, a notification.
// Nothing about the user is sent; it is a plain public GET.
object UpdateChecker {
    private const val LATEST_URL = "https://api.github.com/repos/sberrcamacho/s2_nova/releases/latest"
    const val APK_URL = "https://github.com/sberrcamacho/s2_nova/releases/latest/download/s2-nova.apk"
    private const val APK_NAME = "s2-nova.apk"
    private const val PREFS = "s2nova_updates"
    private const val CHANNEL_ID = "updates"
    private const val WORK_NAME = "s2nova-update-check"
    private const val NOTIFICATION_ID = 7301
    // The app checks at most this often on its own; the worker, daily.
    private const val CHECK_EVERY_MS = 6L * 60 * 60 * 1000

    data class Release(val version: String, val url: String)

    private val _available = MutableStateFlow<Release?>(null)
    // A release newer than this build, once known.
    val available: StateFlow<Release?> = _available.asStateFlow()

    private val json = Json { ignoreUnknownKeys = true }
    private val client by lazy {
        OkHttpClient.Builder().connectTimeout(20, TimeUnit.SECONDS).readTimeout(20, TimeUnit.SECONDS).callTimeout(30, TimeUnit.SECONDS).build()
    }

    fun init(context: Context) {
        val ctx = context.applicationContext
        val channel = NotificationChannel(CHANNEL_ID, tr(StringKey.UPDATE_CHANNEL), NotificationManager.IMPORTANCE_DEFAULT)
            .apply { description = tr(StringKey.UPDATE_CHANNEL_DETAIL) }
        ctx.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        _available.value = saved(ctx)
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(
            WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<UpdateCheckWorker>(1, TimeUnit.DAYS)
                .setConstraints(Constraints(requiredNetworkType = NetworkType.CONNECTED))
                .build(),
        )
    }

    // Asks GitHub unless it did recently (`force`: always). Returns the
    // newer release, or null when this build is the latest; throws when
    // GitHub can't be reached.
    suspend fun check(context: Context, force: Boolean = false): Release? {
        val prefs = prefs(context)
        if (!force && System.currentTimeMillis() - prefs.getLong("checkedAt", 0) < CHECK_EVERY_MS) return _available.value
        val latest = withContext(Dispatchers.IO) { fetchLatest() }
        prefs.edit().putLong("checkedAt", System.currentTimeMillis()).putString("version", latest.version).putString("url", latest.url).apply()
        val newer = latest.takeIf { compareVersions(it.version, BuildConfig.VERSION_NAME) > 0 }
        _available.value = newer
        return newer
    }

    private fun fetchLatest(): Release {
        val request = Request.Builder().url(LATEST_URL).header("Accept", "application/vnd.github+json").build()
        client.newCall(request).execute().use { res ->
            check(res.isSuccessful) { "GitHub answered ${res.code}" }
            val body = json.parseToJsonElement(res.body!!.string()).jsonObject
            val tag = body["tag_name"]!!.jsonPrimitive.content
            val apk = body["assets"]?.jsonArray
                ?.map { it.jsonObject }
                ?.firstOrNull { it["name"]?.jsonPrimitive?.content == APK_NAME }
                ?.get("browser_download_url")?.jsonPrimitive?.content
            return Release(tag.removePrefix("v"), apk ?: APK_URL)
        }
    }

    // The in-app sheet: shown once per version (until "Más tarde").
    fun shouldPrompt(context: Context, release: Release): Boolean = prefs(context).getString("dismissed", null) != release.version

    fun dismiss(context: Context, release: Release) {
        prefs(context).edit().putString("dismissed", release.version).apply()
    }

    fun download(context: Context, release: Release) {
        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(release.url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
    }

    // From the background check: one notification per version.
    internal fun notifyIfNew(context: Context, release: Release) {
        val prefs = prefs(context)
        if (prefs.getString("notified", null) == release.version || !AlertNotifier.canPost(context)) return
        val open = PendingIntent.getActivity(
            context, NOTIFICATION_ID,
            Intent(Intent.ACTION_VIEW, Uri.parse(release.url)),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notification)
            .setColor(0xFF6622D6.toInt())
            .setContentTitle(tr(StringKey.UPDATE_NOTIF_TITLE))
            .setContentText(tr(StringKey.UPDATE_NOTIF_BODY).format(release.version))
            .setContentIntent(open)
            .addAction(0, tr(StringKey.UPDATE_DOWNLOAD), open)
            .setAutoCancel(true)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification) }
        prefs.edit().putString("notified", release.version).apply()
    }

    private fun saved(context: Context): Release? {
        val prefs = prefs(context)
        val version = prefs.getString("version", null) ?: return null
        val url = prefs.getString("url", null) ?: APK_URL
        return Release(version, url).takeIf { compareVersions(version, BuildConfig.VERSION_NAME) > 0 }
    }

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}

class UpdateCheckWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        // For the app language of the notification.
        AppContainer.init(applicationContext)
        val release = runCatching { UpdateChecker.check(applicationContext, force = true) }.getOrElse { return Result.retry() }
        if (release != null) UpdateChecker.notifyIfNew(applicationContext, release)
        return Result.success()
    }
}
