package com.s2nova.app.data

// Reportes' range: any span of up to 24 months the user picks (backend GET
// /summary/report from/to; web's lib/reportRange.ts). Preset is the
// backend's older `range` (Inicio's six-month balance bars still use it).
sealed interface ReportSelection {
    data class Preset(val months: Int) : ReportSelection
    data class Span(val from: String, val to: String) : ReportSelection
}

object ReportRange {
    const val MAX_MONTHS = 24

    // "2026-04" + 3 → "2026-07".
    fun shift(key: String, delta: Int): String {
        val index = key.substring(0, 4).toInt() * 12 + key.substring(5, 7).toInt() - 1 + delta
        return "%04d-%02d".format(Math.floorDiv(index, 12), Math.floorMod(index, 12) + 1)
    }

    // Months in from..to, both included.
    fun monthsBetween(from: String, to: String): Int =
        (to.substring(0, 4).toInt() - from.substring(0, 4).toInt()) * 12 + to.substring(5, 7).toInt() - from.substring(5, 7).toInt() + 1

    // The default: the last six months, this one included.
    const val DEFAULT_MONTHS = 6

    // How a picked span is kept: one ending this month keeps following the
    // current month ("rolling:6", the last six months), any other stays put
    // ("fixed:2026-02:2026-04").
    fun encode(from: String, to: String, currentMonth: String): String =
        if (to == currentMonth) "rolling:${monthsBetween(from, to)}" else "fixed:$from:$to"

    // The months a kept range covers today; anything unreadable or no longer
    // valid is the default.
    fun decode(value: String?, currentMonth: String): ReportSelection.Span {
        val parts = value?.split(":").orEmpty()
        val key = Regex("""\d{4}-(0[1-9]|1[0-2])""")
        val months = parts.getOrNull(1)?.toIntOrNull()
        if (parts.size == 2 && parts[0] == "rolling" && months != null && months in 1..MAX_MONTHS) {
            return ReportSelection.Span(shift(currentMonth, -months + 1), currentMonth)
        }
        if (parts.size == 3 && parts[0] == "fixed" && key.matches(parts[1]) && key.matches(parts[2]) &&
            parts[1] <= parts[2] && parts[2] <= currentMonth && monthsBetween(parts[1], parts[2]) <= MAX_MONTHS
        ) {
            return ReportSelection.Span(parts[1], parts[2])
        }
        return ReportSelection.Span(shift(currentMonth, -DEFAULT_MONTHS + 1), currentMonth)
    }

    // The range button's label: "Feb – Abr 2026", or "Nov 25 – Feb 26"
    // across years; one month is "Abr 2026". `months` are the short names.
    fun chipLabel(from: String, to: String, months: List<String>): String {
        fun name(key: String) = months[key.substring(5, 7).toInt() - 1]
        return when {
            from == to -> "${name(from)} ${from.take(4)}"
            from.take(4) == to.take(4) -> "${name(from)} – ${name(to)} ${to.take(4)}"
            else -> "${name(from)} ${from.substring(2, 4)} – ${name(to)} ${to.substring(2, 4)}"
        }
    }
}
