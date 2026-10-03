package com.s2nova.app.ui.screens.addtransaction

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class OverdraftTest {
    private fun after(balance: Double = 100.0, spend: Double = 30.0, refund: Double = 0.0, credit: Boolean = false, future: Boolean = false) =
        overdraftAfter(balance, spend, refund, credit, future)

    @Test
    fun `warns only when the movement leaves the wallet below zero`() {
        assertNull(after())
        assertNull(after(spend = 100.0))
        assertEquals(-50.0, after(spend = 150.0))
        assertEquals(-30.0, after(balance = -20.0, spend = 10.0))
    }

    @Test
    fun `skips credit cards, scheduled movements and edits that free money`() {
        assertNull(after(spend = 150.0, credit = true))
        assertNull(after(spend = 150.0, future = true))
        // Editing a 150 expense already counted (balance -50) down to 120.
        assertNull(after(balance = -50.0, spend = 120.0, refund = 150.0))
        assertEquals(-70.0, after(balance = -50.0, spend = 170.0, refund = 150.0))
    }
}
