package com.s2nova.app.data.repository

import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.RecurrenceInterval
import com.s2nova.app.testutil.apiService
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Test
import kotlin.test.assertEquals

class RecurringSeriesRepositoryTest {
    private val server = MockWebServer()

    @After
    fun tearDown() {
        server.shutdown()
        DemoModeFlag.set(false)
    }

    @Test
    fun `refresh maps the derived paymentMethod and interval through`() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """[{"id": "cat-food", "slug": "food", "name": "Comida", "icon": "food", "color": "#000", "kind": "EXPENSE"}]""",
            ),
        )
        val categoryRepository = CategoryRepository(server.apiService())
        categoryRepository.refresh()

        server.enqueue(
            MockResponse().setBody(
                """
                [{
                  "id": "r1", "name": "Netflix", "type": "EXPENSE", "amount": 45000, "accountId": "a1",
                  "categoryId": "cat-food", "paymentMethod": "BANK_TRANSFER", "interval": "MONTHLY",
                  "nextOccurrenceDate": "2026-04-01", "isDue": false, "active": true,
                  "createdAt": "2026-03-01T00:00:00.000Z", "updatedAt": "2026-03-01T00:00:00.000Z"
                }]
                """.trimIndent(),
            ),
        )
        val repository = RecurringSeriesRepository(categoryRepository, server.apiService())
        repository.refresh()
        val series = repository.series.value.single()
        assertEquals(PaymentMethod.BANK_TRANSFER, series.paymentMethod)
        assertEquals(RecurrenceInterval.MONTHLY, series.interval)
    }

    @Test
    fun `refresh no-ops in demo mode`() = runTest {
        DemoModeFlag.set(true)
        val categoryRepository = CategoryRepository(server.apiService())
        val repository = RecurringSeriesRepository(categoryRepository, server.apiService())
        repository.refresh()
        assertEquals(0, server.requestCount)
    }
}
