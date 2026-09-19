package com.s2nova.app.data.repository

import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.testutil.apiService
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class CategoryRepositoryTest {
    private val server = MockWebServer()

    @After
    fun tearDown() = server.shutdown()

    // Regression guard against the silent-drop bug: backendIdFor() matches
    // purely by CategoryId.name.lowercase() == slug (see CategoryRepository's
    // own doc comment) — if a real seeded category's slug ever drifts from
    // an enum name, every transaction/budget/goal in that category silently
    // vanishes from every screen (via toTransaction()/toBudgetProgress()'s
    // mapNotNull) instead of failing loudly.
    @Test
    fun `every CategoryId enum value resolves to a backend-seeded slug`() = runTest {
        val body = CategoryId.entries.joinToString(prefix = "[", postfix = "]", separator = ",") { id ->
            """{"id": "cat-${id.name.lowercase()}", "slug": "${id.name.lowercase()}", "name": "${id.name}", "icon": "x", "color": "#000", "kind": "EXPENSE"}"""
        }
        server.enqueue(MockResponse().setBody(body))
        val repository = CategoryRepository(server.apiService())
        repository.refresh()

        for (id in CategoryId.entries) {
            assertNotNull(repository.backendIdFor(id), "expected a backend id for $id")
        }
    }

    @Test
    fun `categoryIdForBackendId is the inverse of backendIdFor`() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """[{"id": "cat-food", "slug": "food", "name": "Comida", "icon": "x", "color": "#000", "kind": "EXPENSE"}]""",
            ),
        )
        val repository = CategoryRepository(server.apiService())
        repository.refresh()
        assertEquals("cat-food", repository.backendIdFor(CategoryId.FOOD))
        assertEquals(CategoryId.FOOD, repository.categoryIdForBackendId("cat-food"))
        assertNull(repository.categoryIdForBackendId("nonexistent"))
    }

    @Test
    fun `subcategoriesFor only returns rows whose parentId matches the resolved category`() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """
                [
                  {"id": "cat-food", "slug": "food", "name": "Comida", "icon": "x", "color": "#000", "kind": "EXPENSE"},
                  {"id": "sub-groceries", "slug": "food-groceries", "name": "Mercado", "icon": "x", "color": "#000", "kind": "EXPENSE", "parentId": "cat-food"},
                  {"id": "cat-transport", "slug": "transportation", "name": "Transporte", "icon": "x", "color": "#000", "kind": "EXPENSE"}
                ]
                """.trimIndent(),
            ),
        )
        val repository = CategoryRepository(server.apiService())
        repository.refresh()
        val subs = repository.subcategoriesFor(CategoryId.FOOD)
        assertEquals(listOf("sub-groceries"), subs.map { it.id })
        assertEquals(CategoryId.FOOD, repository.subcategoryById("sub-groceries")?.parentCategoryId)
    }
}
