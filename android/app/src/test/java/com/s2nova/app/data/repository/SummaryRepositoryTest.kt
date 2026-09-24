package com.s2nova.app.data.repository

import com.s2nova.app.testutil.apiService
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Test
import kotlin.test.assertEquals

class SummaryRepositoryTest {
    private val server = MockWebServer()

    @After
    fun tearDown() {
        server.shutdown()
        DemoModeFlag.set(false)
    }

    @Test
    fun `refresh sends the device date and maps the server totals`() = runTest {
        server.enqueue(
            MockResponse().setBody("""[{"month": "2026-08", "income": 4288500, "expenses": 1927100, "net": 2361400}]"""),
        )
        val repository = SummaryRepository(server.apiService())
        repository.refresh(count = 1, today = "2026-08-21")

        val request = server.takeRequest()
        assertEquals("/summary/months?count=1&today=2026-08-21", request.path)
        val month = repository.months.value.single()
        assertEquals("2026-08", month.month)
        assertEquals(4_288_500.0, month.income)
        assertEquals(1_927_100.0, month.expenses)
    }

    @Test
    fun `refresh no-ops in demo mode`() = runTest {
        DemoModeFlag.set(true)
        SummaryRepository(server.apiService()).refresh()
        assertEquals(0, server.requestCount)
    }
}
