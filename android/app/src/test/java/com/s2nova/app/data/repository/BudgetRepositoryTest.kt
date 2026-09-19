package com.s2nova.app.data.repository

import com.s2nova.app.data.model.BudgetStatus
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.testutil.apiService
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Test
import kotlin.test.assertEquals

class BudgetRepositoryTest {
    private val server = MockWebServer()

    @After
    fun tearDown() {
        server.shutdown()
        DemoModeFlag.set(false)
    }

    @Test
    fun `refresh maps server-computed spent, remaining, percentage and status through untouched`() = runTest {
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
                  "id": "b1", "categoryId": "cat-food", "amount": 200000, "spent": 170000, "remaining": 30000,
                  "percentage": 85, "status": "NEAR_LIMIT", "month": "2026-03",
                  "createdAt": "2026-03-01T00:00:00.000Z", "updatedAt": "2026-03-01T00:00:00.000Z"
                }]
                """.trimIndent(),
            ),
        )
        val repository = BudgetRepository(categoryRepository, server.apiService())
        repository.refresh("2026-03")
        val progress = repository.budgetProgress.value.single()
        assertEquals(CategoryId.FOOD, progress.budget.category)
        assertEquals(85, progress.percentage)
        assertEquals(BudgetStatus.NEAR_LIMIT, progress.status)
    }

    @Test
    fun `refresh no-ops in demo mode`() = runTest {
        DemoModeFlag.set(true)
        val categoryRepository = CategoryRepository(server.apiService())
        val repository = BudgetRepository(categoryRepository, server.apiService())
        repository.refresh()
        assertEquals(0, server.requestCount)
    }
}
