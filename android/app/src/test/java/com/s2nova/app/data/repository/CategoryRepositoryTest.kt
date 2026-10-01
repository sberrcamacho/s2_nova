package com.s2nova.app.data.repository

import com.s2nova.app.data.Taxonomy
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

    private fun dto(id: String, slug: String, parentId: String? = null) =
        """{"id": "$id", "slug": "$slug", "name": "$slug", "icon": "x", "color": "#000", "kind": "EXPENSE"${if (parentId != null) ", \"parentId\": \"$parentId\"" else ""}}"""

    // Nodes are keyed by the taxonomy's dotted id, which is the backend row's
    // slug. If a seeded slug ever drifts from the bundled taxonomy, the row no
    // longer maps to a category and its movements vanish from every screen,
    // so every bundled id must survive a round trip through the backend rows.
    @Test
    fun `every bundled taxonomy id resolves to its backend row`() = runTest {
        val body = Taxonomy.nodes.joinToString(prefix = "[", postfix = "]", separator = ",") { n ->
            dto("row-${n.id}", n.id, n.parentId?.let { "row-$it" })
        }
        server.enqueue(MockResponse().setBody(body))
        val repository = CategoryRepository(server.apiService())
        repository.refresh()

        for (n in Taxonomy.nodes) {
            assertNotNull(repository.backendIdFor(n.id), "expected a backend id for ${n.id}")
            assertEquals(n.id, repository.idForBackendId("row-${n.id}"))
        }
    }

    @Test
    fun `idForBackendId is the inverse of backendIdFor`() = runTest {
        server.enqueue(MockResponse().setBody("[" + dto("cat-food", "exp.food") + "]"))
        val repository = CategoryRepository(server.apiService())
        repository.refresh()
        assertEquals("cat-food", repository.backendIdFor("exp.food"))
        assertEquals("exp.food", repository.idForBackendId("cat-food"))
        assertNull(repository.idForBackendId("nonexistent"))
    }

    @Test
    fun `children only returns rows whose parent matches`() = runTest {
        server.enqueue(
            MockResponse().setBody(
                "[" + listOf(
                    dto("cat-food", "exp.food"),
                    dto("sub-groceries", "exp.food.groceries", "cat-food"),
                    dto("cat-transport", "exp.transportation"),
                ).joinToString(",") + "]",
            ),
        )
        val repository = CategoryRepository(server.apiService())
        repository.refresh()
        assertEquals(listOf("exp.food.groceries"), repository.children("exp.food").map { it.id })
        assertEquals("exp.food", repository.node("exp.food.groceries")?.parentId)
    }
}
