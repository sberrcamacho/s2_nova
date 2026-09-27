package com.s2nova.app.data

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

// Mirrors web/src/lib/date.ts — same ISO "yyyy-MM-dd" date strings and
// "yyyy-MM" month keys flow through both the web mock data and this one,
// so behavior (and any future backend contract) stays consistent.
// Dates read in the app language (es-CO / en-US).
private fun locale(): Locale =
    if (com.s2nova.app.ui.AppLang.current == com.s2nova.app.data.model.AppLanguage.EN) Locale.US else Locale.forLanguageTag("es-CO")

private fun english() = com.s2nova.app.ui.AppLang.current == com.s2nova.app.data.model.AppLanguage.EN

fun todayISO(): String = LocalDate.now().toString()

fun currentMonthKey(): String = todayISO().substring(0, 7)

fun isSameMonth(iso: String, monthKey: String): Boolean = iso.startsWith(monthKey)

fun monthLabel(monthKey: String): String {
    val parts = monthKey.split("-")
    val date = LocalDate.of(parts[0].toInt(), parts[1].toInt(), 1)
    val short = date.month.getDisplayName(TextStyle.SHORT, locale())
    return if (english()) short else short.lowercase(locale()).trimEnd('.') + "."
}

fun formatShortDate(iso: String): String = LocalDate.parse(iso).format(DateTimeFormatter.ofPattern(if (english()) "MMM d" else "d MMM", locale()))

fun formatLongDate(iso: String): String = LocalDate.parse(iso).format(DateTimeFormatter.ofPattern(if (english()) "MMM d, yyyy" else "d MMM yyyy", locale()))

// Uppercase "D DE MES" group-header label (e.g. "1 DE AGOSTO" / "AUGUST 1"),
// no year — mirrors the Movimientos mockup's day-group headers.
fun formatDayGroupDate(iso: String): String =
    LocalDate.parse(iso).format(DateTimeFormatter.ofPattern(if (english()) "MMMM d" else "d 'de' MMMM", locale())).uppercase(locale())

fun lastNMonthKeys(n: Int): List<String> {
    val now = LocalDate.now()
    return (n - 1 downTo 0).map { i ->
        val d = now.minusMonths(i.toLong())
        "%04d-%02d".format(d.year, d.monthValue)
    }
}

// The v2 mockup's own date copy in the app language: "21 ago" / "Aug 21"
// (fmtDate) and "21 de agosto de 2026" / "August 21, 2026" (fmtDateLong).
fun fmtDate(iso: String?): String {
    if (iso.isNullOrBlank()) return ""
    return com.s2nova.app.ui.shortDateLabel(iso.take(10), com.s2nova.app.ui.AppLang.current)
}

fun fmtDateLong(iso: String?): String {
    if (iso.isNullOrBlank()) return ""
    return com.s2nova.app.ui.longDateLabel(iso.take(10), com.s2nova.app.ui.AppLang.current)
}
