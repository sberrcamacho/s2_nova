package com.s2nova.app.data

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToLong

// Mirrors web/src/lib/currency.ts — Colombian peso formatting: "$125.000",
// period as thousands separator, no decimals, no currency code.
private val COP_SYMBOLS = DecimalFormatSymbols(Locale.forLanguageTag("es-CO")).apply {
    groupingSeparator = '.'
}
private val COP_FORMAT = DecimalFormat("#,###", COP_SYMBOLS)

fun formatCOP(value: Double, signed: Boolean = false): String {
    val rounded = abs(value).roundToLong()
    val grouped = COP_FORMAT.format(rounded)
    val sign = if (value < 0) "-" else if (signed && value > 0) "+" else ""
    return "$sign$$grouped"
}
