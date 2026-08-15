package com.s2nova.app.data

import com.s2nova.app.data.model.Currency
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

// US dollar display formatting: "$125,000.00" — a display-format switch
// only (same underlying amount, no real COP→USD conversion since there is
// no backend/FX rate).
private val USD_FORMAT = DecimalFormat("#,##0.00", DecimalFormatSymbols(Locale.US))

fun formatUSD(value: Double, signed: Boolean = false): String {
    val grouped = USD_FORMAT.format(abs(value))
    val sign = if (value < 0) "-" else if (signed && value > 0) "+" else ""
    return "$sign$$grouped"
}

// Currency-aware entry point, used wherever the user's format preference
// (UserPreferences.currency) should drive how an amount is displayed.
fun formatCurrency(value: Double, currency: Currency, signed: Boolean = false): String =
    if (currency == Currency.USD) formatUSD(value, signed) else formatCOP(value, signed)
