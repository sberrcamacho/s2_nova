package com.s2nova.app.data

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale
import kotlin.math.abs
import kotlin.math.round

// Multi-currency display (CURRENCIES_AND_WALLETS.md §2). Every amount shows
// its currency's symbol ("$", "US$", "€"…) with Colombian grouping
// ("$168.500", "US$5,99") — the mockup's fmtCur: decimals only when the
// value has them and the currency uses them.

data class CurrencyInfo(val code: String, val name: String, val symbol: String, val decimals: Int, val referenceRate: Double)

object Currencies {
    // referenceRate = COP per unit; the backend's fallback when it has no
    // rate of the day (backend/src/lib/currency.ts).
    val catalog: List<CurrencyInfo> = listOf(
        CurrencyInfo("COP", "Peso colombiano", "$", 0, 1.0),
        CurrencyInfo("USD", "Dólar estadounidense", "US$", 2, 3950.0),
        CurrencyInfo("EUR", "Euro", "€", 2, 4300.0),
        CurrencyInfo("MXN", "Peso mexicano", "MX$", 2, 215.0),
        CurrencyInfo("PEN", "Sol peruano", "S/", 2, 1050.0),
        CurrencyInfo("BRL", "Real brasileño", "R$", 2, 720.0),
        CurrencyInfo("GBP", "Libra esterlina", "£", 2, 5000.0),
        CurrencyInfo("CLP", "Peso chileno", "CLP$", 0, 4.2),
        CurrencyInfo("ARS", "Peso argentino", "AR$", 2, 4.0),
    )

    fun info(code: String?): CurrencyInfo = catalog.firstOrNull { it.code == code } ?: catalog.first()

    fun symbol(code: String?): String = info(code).symbol

    fun name(code: String?): String = info(code).name

    // 1 `from` in `to` units at the reference rate.
    fun referenceRate(from: String, to: String): Double = if (from == to) 1.0 else info(from).referenceRate / info(to).referenceRate

    // The device's regional currency (ONBOARDING.md §2).
    fun deviceCurrency(): String {
        val code = runCatching { java.util.Currency.getInstance(Locale.getDefault()).currencyCode }.getOrNull()
        return catalog.firstOrNull { it.code == code }?.code ?: "COP"
    }

    fun deviceCountry(): String = Locale.getDefault().getDisplayCountry(Locale.forLanguageTag("es")).ifBlank { "Colombia" }
}

private val SYMBOLS = DecimalFormatSymbols(Locale.forLanguageTag("es-CO")).apply {
    groupingSeparator = '.'
    decimalSeparator = ','
}
private val WHOLE = DecimalFormat("#,##0", SYMBOLS)
private val CENTS = DecimalFormat("#,##0.00", SYMBOLS)

fun formatMoney(value: Double, code: String = "COP", signed: Boolean = false): String {
    val c = Currencies.info(code)
    val v = abs(value)
    val cents = round(v * 100) / 100
    val frac = cents % 1.0 != 0.0
    val digits = if (frac && c.decimals > 0) CENTS.format(cents) else if (frac) CENTS.format(cents).trimEnd('0').trimEnd(',') else WHOLE.format(cents)
    val sign = if (value < 0) "−" else if (signed && value > 0) "+" else ""
    return sign + c.symbol + digits
}

// Plain grouped number without symbol ("168.500", "5,99").
fun groupNumber(value: Double): String {
    val cents = round(abs(value) * 100) / 100
    return if (cents % 1.0 != 0.0) CENTS.format(cents).trimEnd('0').trimEnd(',') else WHOLE.format(cents)
}
