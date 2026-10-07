package com.s2nova.app.ui.tour

import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.ui.nav.NovaDestinations
import com.s2nova.app.ui.stringFor
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ToursTest {
    @Test
    fun `each main screen has its own tour, and editing a movement has none`() {
        assertEquals(Tours.WELCOME, Tours.forRoute(NovaDestinations.HOME))
        assertEquals(Tours.MOVIMIENTOS, Tours.forRoute(NovaDestinations.TRANSACTIONS))
        assertEquals(Tours.PLANES, Tours.forRoute(NovaDestinations.BUDGETS_ROUTE))
        assertEquals(Tours.REPORTES, Tours.forRoute(NovaDestinations.REPORTS))
        assertEquals(Tours.BILLETERAS, Tours.forRoute(NovaDestinations.WALLETS))
        assertEquals(Tours.NUEVO, Tours.forRoute(NovaDestinations.ADD_TRANSACTION))
        assertNull(Tours.forRoute(NovaDestinations.EDIT_TRANSACTION))
        assertNull(Tours.forRoute(NovaDestinations.SETTINGS))
    }

    @Test
    fun `tour keys are the ones the backend accepts in guidesSeen`() {
        assertEquals(
            setOf("tour.welcome", "tour.movimientos", "tour.planes", "tour.reportes", "tour.billeteras", "tour.nuevo"),
            Tours.all.keys,
        )
    }

    @Test
    fun `tours stay short and every step has Spanish and English copy`() {
        Tours.all.values.forEach { steps ->
            assertTrue(steps.size in 1..7)
            steps.forEach { step ->
                AppLanguage.entries.forEach { lang ->
                    assertTrue(stringFor(step.title, lang).isNotBlank())
                    assertTrue(stringFor(step.body, lang).isNotBlank())
                }
            }
        }
    }

    @Test
    fun `steps whose element is missing are left out, centred ones stay`() {
        val steps = Tours.runnable(Tours.WELCOME) { it == "inicio.balance" }
        assertEquals(listOf(null, "inicio.balance"), steps.map { it.target })
    }

    @Test
    fun `a tour waits while none of its elements is on screen`() {
        assertTrue(Tours.runnable(Tours.WELCOME) { false }.isEmpty())
        assertTrue(Tours.runnable(Tours.REPORTES) { false }.isEmpty())
    }
}
