package com.s2nova.app.ui.screens.settings

import com.s2nova.app.ui.StringKey
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class PasswordRulesTest {
    @Test
    fun `asks for the current password when the account has one`() {
        val errors = passwordErrors(needsCurrent = true, current = "", next = "nueva1234", confirm = "nueva1234")
        assertEquals(StringKey.SET_PW_ERR_CURRENT, errors.current)
        assertEquals(null, errors.next)
        assertEquals(null, errors.confirm)
    }

    @Test
    fun `an account without a password creates one without the current`() {
        assertTrue(passwordErrors(needsCurrent = false, current = "", next = "nueva1234", confirm = "nueva1234").none)
    }

    @Test
    fun `each problem is reported on its own field`() {
        val errors = passwordErrors(needsCurrent = true, current = "Actual123", next = "corta", confirm = "otra")
        assertEquals(null, errors.current)
        assertEquals(StringKey.SET_PW_ERR_RULES, errors.next)
        assertEquals(StringKey.SET_PW_ERR_MATCH, errors.confirm)
        assertEquals(StringKey.SET_PW_SAME, passwordErrors(true, "Actual123", "Actual123", "Actual123").next)
    }

    @Test
    fun `the checklist marks length, a number and the match`() {
        assertEquals(listOf(true, false, false), passwordRules("sinnumero", "").map { it.second })
        assertEquals(listOf(true, true, true), passwordRules("nueva1234", "nueva1234").map { it.second })
    }
}
