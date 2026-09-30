package com.s2nova.app.data

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.round

// Multi-currency display (CURRENCIES_AND_WALLETS.md §2). Every amount shows
// its currency's symbol ("$", "US$", "€"…) with Colombian grouping
// ("$168.500", "US$5,99") — the mockup's fmtCur: decimals only when the
// value has them and the currency uses them.

data class CurrencyInfo(val code: String, val nameEs: String, val nameEn: String, val symbol: String, val decimals: Int, val referenceRate: Double) {
    val name: String get() = if (com.s2nova.app.ui.AppLang.current == com.s2nova.app.data.model.AppLanguage.EN) nameEn else nameEs
}

object Currencies {
    // referenceRate = COP per unit; the backend's fallback when it has no
    // rate of the day (backend/src/lib/currency.ts).
    val catalog: List<CurrencyInfo> = listOf(
        CurrencyInfo("COP", "Peso colombiano", "Colombian peso", "$", 0, 1.0),
        CurrencyInfo("USD", "Dólar estadounidense", "US dollar", "US$", 2, 3950.0),
        CurrencyInfo("EUR", "Euro", "Euro", "€", 2, 4300.0),
        CurrencyInfo("MXN", "Peso mexicano", "Mexican peso", "MX$", 2, 215.0),
        CurrencyInfo("PEN", "Sol peruano", "Peruvian sol", "S/", 2, 1050.0),
        CurrencyInfo("BRL", "Real brasileño", "Brazilian real", "R$", 2, 720.0),
        CurrencyInfo("GBP", "Libra esterlina", "Pound sterling", "£", 2, 5000.0),
        CurrencyInfo("CLP", "Peso chileno", "Chilean peso", "CLP$", 0, 4.2),
        CurrencyInfo("ARS", "Peso argentino", "Argentine peso", "AR$", 2, 4.0),
    )

    fun info(code: String?): CurrencyInfo = catalog.firstOrNull { it.code == code } ?: catalog.first()

    fun symbol(code: String?): String = info(code).symbol

    // In the app language; `fallback` (the backend's name) for a code
    // outside the catalog.
    fun name(code: String?, fallback: String? = null): String =
        catalog.firstOrNull { it.code == code }?.name ?: fallback ?: info(code).name

    // 1 `from` in `to` units at the reference rate.
    fun referenceRate(from: String, to: String): Double = if (from == to) 1.0 else info(from).referenceRate / info(to).referenceRate

    // The device's regional currency (ONBOARDING.md §2).
    fun deviceCurrency(): String {
        val code = runCatching { java.util.Currency.getInstance(Locale.getDefault()).currencyCode }.getOrNull()
        return catalog.firstOrNull { it.code == code }?.code ?: "COP"
    }

    fun deviceCountry(): String {
        val lang = if (com.s2nova.app.ui.AppLang.current == com.s2nova.app.data.model.AppLanguage.EN) "en" else "es"
        return Locale.getDefault().getDisplayCountry(Locale.forLanguageTag(lang)).ifBlank { "Colombia" }
    }
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

// A converted "≈" figure: rounded to the currency's own decimals, since a
// conversion never lands on an exact amount ("≈ $23.661", not "$23.660,5").
fun formatApprox(value: Double, code: String): String {
    val decimals = Currencies.info(code).decimals
    val factor = Math.pow(10.0, decimals.toDouble())
    // Half-up like the web's Math.round; kotlin.math.round is half-even
    // (23.660,5 would show as $23.660 here and $23.661 on the web).
    return formatMoney(floor(value * factor + 0.5) / factor, code)
}

// Plain grouped number without symbol ("168.500", "5,99").
fun groupNumber(value: Double): String {
    val cents = round(abs(value) * 100) / 100
    return if (cents % 1.0 != 0.0) CENTS.format(cents).trimEnd('0').trimEnd(',') else WHOLE.format(cents)
}
