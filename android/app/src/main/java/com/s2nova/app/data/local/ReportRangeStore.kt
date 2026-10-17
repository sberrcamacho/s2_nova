package com.s2nova.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.first

private val Context.reportRangeDataStore by novaPreferencesDataStore(name = "s2nova_report_range")

// Reportes' range, kept until the user picks another (ReportRange.encode:
// "rolling:6" follows the current month, "fixed:2026-02:2026-04" doesn't).
class ReportRangeStore private constructor(context: Context) {
    private val context = context.applicationContext

    private object Keys {
        val RANGE = stringPreferencesKey("range")
    }

    suspend fun get(): String? = context.reportRangeDataStore.data.first()[Keys.RANGE]

    suspend fun set(value: String) {
        context.reportRangeDataStore.edit { it[Keys.RANGE] = value }
    }

    companion object {
        @Volatile private var instance: ReportRangeStore? = null

        fun getInstance(context: Context): ReportRangeStore =
            instance ?: synchronized(this) {
                instance ?: ReportRangeStore(context).also { instance = it }
            }
    }
}
