package com.s2nova.app.data.repository

import com.s2nova.app.data.model.CategoryId
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
        val repository = SummaryRepository(CategoryRepository(server.apiService()), server.apiService())
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
        SummaryRepository(CategoryRepository(server.apiService()), server.apiService()).refresh()
        assertEquals(0, server.requestCount)
    }

    @Test
    fun `report asks for the range and maps totals and categories`() = runTest {
        server.enqueue(MockResponse().setBody("""[{"id": "uuid-food", "slug": "food", "name": "Alimentación", "icon": "food", "color": "#000", "kind": "EXPENSE"}]"""))
        server.enqueue(
            MockResponse().setBody(
                """{"range": 3, "month": "2026-08",
                "months": [{"month": "2026-08", "income": 4288500, "expenses": 1927100, "net": 2361400}],
                "totals": {"income": 4288500, "expenses": 1927100, "savings": 2361400, "savingsRate": 55},
                "previousTotals": {"income": 4410000, "expenses": 2030000, "savings": 2380000, "savingsRate": 54},
                "categories": [{"categoryId": "uuid-food", "amount": 612400, "previousAmount": 0, "change": null, "rising": false}],
                "dailyAverage": 91767, "peakWeekday": 6, "fixedShare": 38, "runwayMonths": 8.4, "incomeSources": [],
                "netWorth": {"wallets": 0, "lent": {"outstanding": 0, "people": 0, "settled": 0}, "borrowed": {"outstanding": 0, "people": 0, "settled": 0}, "history": []}}""",
            ),
        )
        val categories = CategoryRepository(server.apiService()).also { it.refresh() }
        val report = SummaryRepository(categories, server.apiService()).report(range = 3, today = "2026-08-21")

        server.takeRequest()
        assertEquals("/summary/report?range=3&today=2026-08-21", server.takeRequest().path)
        assertEquals(55, report.totals.savingsRate)
        assertEquals(4_410_000.0, report.previousTotals.income)
        assertEquals("2026-08", report.months.single().month)
        assertEquals(CategoryId.FOOD, report.categories.single().category)
        assertEquals(612_400.0, report.categories.single().amount)
    }
}
