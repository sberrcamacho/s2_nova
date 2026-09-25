package com.s2nova.app.ui

import com.s2nova.app.data.model.AppLanguage
import java.time.LocalDate

// The mockup's own date labels (fmtDate / fmtDateLong), shared by the v2
// screens so "24 ago" and "24 de agosto de 2026" read the same everywhere.

private val MONTHS_ABBR_ES = listOf("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")
private val MONTHS_ABBR_EN = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
private val MONTHS_LONG_ES = listOf("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre")
private val MONTHS_LONG_EN = listOf("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")

// Mockup fmtDate: "24 ago".
fun shortDateLabel(iso: String, language: AppLanguage): String {
    val date = LocalDate.parse(iso)
    return if (language == AppLanguage.EN) "${MONTHS_ABBR_EN[date.monthValue - 1]} ${date.dayOfMonth}"
    else "${date.dayOfMonth} ${MONTHS_ABBR_ES[date.monthValue - 1]}"
}

// Mockup fmtDateLong: "24 de agosto de 2026".
fun longDateLabel(iso: String, language: AppLanguage): String {
    val date = LocalDate.parse(iso)
    return if (language == AppLanguage.EN) "${MONTHS_LONG_EN[date.monthValue - 1]} ${date.dayOfMonth}, ${date.year}"
    else "${date.dayOfMonth} de ${MONTHS_LONG_ES[date.monthValue - 1]} de ${date.year}"
}

// "nov 2024" (Perfil's "desde nov 2024").
fun monthYearShortLabel(iso: String, language: AppLanguage): String {
    val date = LocalDate.parse(iso.take(10))
    val month = if (language == AppLanguage.EN) MONTHS_ABBR_EN[date.monthValue - 1] else MONTHS_ABBR_ES[date.monthValue - 1]
    return "$month ${date.year}"
}
