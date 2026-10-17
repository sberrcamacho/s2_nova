package com.s2nova.app.data

import org.junit.Test
import kotlin.test.assertEquals

class ReportRangeTest {
    @Test
    fun `counts and shifts months across years`() {
        assertEquals(4, ReportRange.monthsBetween("2025-11", "2026-02"))
        assertEquals(1, ReportRange.monthsBetween("2026-04", "2026-04"))
        assertEquals("2025-11", ReportRange.shift("2026-02", -3))
        assertEquals("2027-01", ReportRange.shift("2026-12", 1))
    }

    @Test
    fun `a range ending this month keeps following it, any other stays put`() {
        assertEquals("rolling:3", ReportRange.encode("2026-06", "2026-08", "2026-08"))
        assertEquals("fixed:2026-02:2026-04", ReportRange.encode("2026-02", "2026-04", "2026-08"))
        // A month later the rolling range has moved; the fixed one hasn't.
        assertEquals(ReportSelection.Span("2026-07", "2026-09"), ReportRange.decode("rolling:3", "2026-09"))
        assertEquals(ReportSelection.Span("2026-02", "2026-04"), ReportRange.decode("fixed:2026-02:2026-04", "2026-09"))
        // Nothing kept, or nothing valid: the last six months.
        assertEquals(ReportSelection.Span("2026-04", "2026-09"), ReportRange.decode(null, "2026-09"))
        assertEquals(ReportSelection.Span("2026-04", "2026-09"), ReportRange.decode("fixed:2026-08:2026-02", "2026-09"))
        assertEquals(ReportSelection.Span("2026-04", "2026-09"), ReportRange.decode("rolling:99", "2026-09"))
    }

    @Test
    fun `names the span in the segment`() {
        val es = listOf("Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic")
        assertEquals("Feb – Abr 2026", ReportRange.chipLabel("2026-02", "2026-04", es))
        assertEquals("Nov 25 – Feb 26", ReportRange.chipLabel("2025-11", "2026-02", es))
        assertEquals("Abr 2026", ReportRange.chipLabel("2026-04", "2026-04", es))
    }
}
