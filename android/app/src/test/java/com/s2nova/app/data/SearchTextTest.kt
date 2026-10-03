package com.s2nova.app.data

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SearchTextTest {

    @Test
    fun `search ignores accents and case`() {
        assertTrue(matchesSearch("Café Tostao", "cafe"))
        assertTrue(matchesSearch("Alimentación · Mercado", "ALIMENTACION"))
        assertTrue(matchesSearch("cafe", "Café"))
    }

    @Test
    fun `every word must match, in any order`() {
        assertTrue(matchesSearch("Mercado semanal Éxito Bancolombia", "exito mercado"))
        assertFalse(matchesSearch("Mercado semanal Éxito", "mercado nequi"))
    }

    @Test
    fun `a blank query matches everything`() {
        assertTrue(matchesSearch("Arriendo", "   "))
    }
}
