package com.s2nova.app.data

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

// Mirrors web/src/lib/date.ts — same ISO "yyyy-MM-dd" date strings and
// "yyyy-MM" month keys flow through both the web mock data and this one,
// so behavior (and any future backend contract) stays consistent.
private val LOCALE_ES = Locale.forLanguageTag("es-CO")
private val SHORT_DATE = DateTimeFormatter.ofPattern("d MMM", LOCALE_ES)
private val LONG_DATE = DateTimeFormatter.ofPattern("d MMM yyyy", LOCALE_ES)
private val DAY_GROUP_DATE = DateTimeFormatter.ofPattern("d 'de' MMMM", LOCALE_ES)

fun todayISO(): String = LocalDate.now().toString()

fun currentMonthKey(): String = todayISO().substring(0, 7)

fun isSameMonth(iso: String, monthKey: String): Boolean = iso.startsWith(monthKey)

fun monthLabel(monthKey: String): String {
    val parts = monthKey.split("-")
    val date = LocalDate.of(parts[0].toInt(), parts[1].toInt(), 1)
    return date.month.getDisplayName(TextStyle.SHORT, LOCALE_ES).lowercase(LOCALE_ES).trimEnd('.') + "."
}

fun formatShortDate(iso: String): String = LocalDate.parse(iso).format(SHORT_DATE)

fun formatLongDate(iso: String): String = LocalDate.parse(iso).format(LONG_DATE)

// Uppercase "D DE MES" group-header label (e.g. "1 DE AGOSTO"), no year — mirrors the
// Movimientos mockup's day-group headers.
fun formatDayGroupDate(iso: String): String = LocalDate.parse(iso).format(DAY_GROUP_DATE).uppercase(LOCALE_ES)

fun lastNMonthKeys(n: Int): List<String> {
    val now = LocalDate.now()
    return (n - 1 downTo 0).map { i ->
        val d = now.minusMonths(i.toLong())
        "%04d-%02d".format(d.year, d.monthValue)
    }
}

// The v2 mockup's own date copy: "21 ago" (fmtDate) and "21 de agosto de
// 2026" (fmtDateLong) — month names are fixed Spanish UI copy.
val MONTHS_ES = listOf("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre")
val MONTHS_ABBR = listOf("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")

fun fmtDate(iso: String?): String {
    if (iso.isNullOrBlank()) return ""
    val d = LocalDate.parse(iso.take(10))
    return "${d.dayOfMonth} ${MONTHS_ABBR[d.monthValue - 1]}"
}

fun fmtDateLong(iso: String?): String {
    if (iso.isNullOrBlank()) return ""
    val d = LocalDate.parse(iso.take(10))
    return "${d.dayOfMonth} de ${MONTHS_ES[d.monthValue - 1]} de ${d.year}"
}
