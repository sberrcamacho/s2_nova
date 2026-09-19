package com.s2nova.app.ui

import androidx.compose.ui.text.AnnotatedString
import kotlin.test.Test
import kotlin.test.assertEquals

class ThousandsGroupingVisualTransformationTest {
    private val transformation = ThousandsGroupingVisualTransformation()

    @Test
    fun `groups digits with a period every three places from the right`() {
        val result = transformation.filter(AnnotatedString("1234567"))
        assertEquals("1.234.567", result.text.text)
    }

    @Test
    fun `empty input stays empty`() {
        val result = transformation.filter(AnnotatedString(""))
        assertEquals("", result.text.text)
    }

    @Test
    fun `cursor offset mapping accounts for inserted separators`() {
        val result = transformation.filter(AnnotatedString("1234567"))
        val mapping = result.offsetMapping
        // "1234567" -> "1.234.567": cursor at the very end (7 digits typed)
        // must land after all 9 grouped characters, not 7.
        assertEquals(9, mapping.originalToTransformed(7))
        // Cursor right after the leading "1" (original offset 1) lands past
        // the separator "1." already inserted there, at transformed offset 2
        // — not before it — so typing continues after the "." rather than
        // getting stuck between "1" and ".".
        assertEquals(2, mapping.originalToTransformed(1))
        // Round-trip: transformed offset 9 (end of "1.234.567") maps back to
        // all 7 original digits.
        assertEquals(7, mapping.transformedToOriginal(9))
    }
}
