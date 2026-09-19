package com.s2nova.app.data

import com.s2nova.app.data.model.Currency
import kotlin.test.Test
import kotlin.test.assertEquals

class CurrencyUtilsTest {

    @Test
    fun `formatCOP groups thousands with a period and no decimals`() {
        assertEquals("$125.000", formatCOP(125000.0))
        assertEquals("$1.234.567", formatCOP(1234567.0))
    }

    @Test
    fun `formatCOP rounds to the nearest peso`() {
        assertEquals("$125.000", formatCOP(124999.6))
        assertEquals("$124.999", formatCOP(124999.4))
    }

    @Test
    fun `formatCOP prefixes a sign only when requested and value is nonzero`() {
        assertEquals("-$50.000", formatCOP(-50000.0))
        assertEquals("$50.000", formatCOP(50000.0, signed = false))
        assertEquals("+$50.000", formatCOP(50000.0, signed = true))
        assertEquals("$0", formatCOP(0.0, signed = true))
    }

    @Test
    fun `formatUSD converts using the fixed COP_PER_USD reference rate`() {
        assertEquals("$1.00", formatUSD(COP_PER_USD))
        assertEquals("$2.50", formatUSD(COP_PER_USD * 2.5))
        assertEquals("-$1.00", formatUSD(-COP_PER_USD))
    }

    @Test
    fun `formatCurrency dispatches on the Currency enum`() {
        assertEquals(formatCOP(80000.0), formatCurrency(80000.0, Currency.COP))
        assertEquals(formatUSD(80000.0), formatCurrency(80000.0, Currency.USD))
    }
}
