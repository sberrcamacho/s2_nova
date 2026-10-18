package com.s2nova.app.data

import android.content.Context
import com.s2nova.app.BuildConfig
import com.s2nova.app.data.model.AppLanguage
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// "Novedades": what changed in each version (assets/changelog.json, written
// by scripts/gen-changelog.mjs from scripts/changelog.json, newest first).

@Serializable
data class LocalizedText(val es: String, val en: String) {
    fun of(language: AppLanguage): String = if (language == AppLanguage.EN) en else es
}

@Serializable
data class ChangelogItem(val image: String, val title: LocalizedText, val body: LocalizedText)

@Serializable
data class ChangelogVersion(
    val version: String,
    val date: String, // YYYY-MM-DD
    val items: List<ChangelogItem>,
    val also: List<LocalizedText> = emptyList(),
)

@Serializable
private data class ChangelogFile(val versions: List<ChangelogVersion>)

object Changelog {
    private val json = Json { ignoreUnknownKeys = true }
    @Volatile private var cached: List<ChangelogVersion>? = null

    fun parse(text: String): List<ChangelogVersion> = json.decodeFromString(ChangelogFile.serializer(), text).versions

    fun versions(context: Context): List<ChangelogVersion> =
        cached ?: runCatching { parse(context.assets.open("changelog.json").bufferedReader().use { it.readText() }) }
            .getOrDefault(emptyList())
            .also { cached = it }

    // This build's entry, if it has one.
    fun current(context: Context): ChangelogVersion? = versions(context).firstOrNull { it.version == BuildConfig.VERSION_NAME }
}

// Which version's "Novedades" this device has already shown. Shown once
// after an update; a fresh install starts with the tour instead.
object WhatsNewStore {
    private const val PREFS = "s2nova_whats_new"
    private const val SEEN = "seen"

    fun pending(context: Context): ChangelogVersion? {
        val current = Changelog.current(context) ?: return null
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val seen = prefs.getString(SEEN, null)
        if (seen == null && freshInstall(context)) {
            markSeen(context)
            return null
        }
        return current.takeIf { seen != it.version }
    }

    fun markSeen(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(SEEN, BuildConfig.VERSION_NAME).apply()
    }

    // Installed and never updated. An update from a version before this
    // store existed also has nothing saved, but was updated.
    private fun freshInstall(context: Context): Boolean = runCatching {
        val info = context.packageManager.getPackageInfo(context.packageName, 0)
        info.firstInstallTime == info.lastUpdateTime
    }.getOrDefault(true)
}

// "1.10.0" > "1.9.2"; a leading "v" (a release tag) is ignored.
fun compareVersions(a: String, b: String): Int {
    fun parts(v: String) = v.trim().removePrefix("v").split('.', '-').map { it.toIntOrNull() ?: 0 }
    val x = parts(a)
    val y = parts(b)
    for (i in 0 until maxOf(x.size, y.size)) {
        val d = (x.getOrElse(i) { 0 }).compareTo(y.getOrElse(i) { 0 })
        if (d != 0) return d
    }
    return 0
}
