package com.s2nova.app.data.repository

import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.remote.NotificationCaptureRequest
import com.s2nova.app.testutil.apiService
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class SuggestionRepositoryTest {
    private val server = MockWebServer()

    @After
    fun tearDown() {
        server.shutdown()
        DemoModeFlag.set(false)
    }

    private val body = """{"id": "s1", "sourceApp": "com.todo1.mobile", "appLabel": "Bancolombia", "type": "EXPENSE", "amount": 25000, "currency": "COP",
        "merchant": "EXITO", "categoryId": "uuid-groceries", "accountId": "a1", "occurredAt": "2026-10-17T14:05:00.000Z", "status": "PENDING", "parsedBy": "RULES"}"""

    @Test
    fun `sends a captured notification and reads what the server found`() = runTest {
        server.enqueue(MockResponse().setBody("""[{"id": "uuid-groceries", "slug": "exp.food.groceries", "name": "Mercado", "icon": "food", "color": "#000", "kind": "EXPENSE"}]"""))
        server.enqueue(MockResponse().setResponseCode(201).setBody("""{"suggestion": $body}"""))
        server.enqueue(MockResponse().setBody("""{"suggestion": null}"""))
        val categories = CategoryRepository(server.apiService()).also { it.refresh() }
        val repo = SuggestionRepository(categories, server.apiService())
        val request = NotificationCaptureRequest("com.todo1.mobile", "Bancolombia", "Bancolombia", "Compraste ${'$'}25.000 en EXITO", "2026-10-17T14:05:00Z", accountId = "a1", allowAi = true)

        val found = repo.capture(request)!!
        server.takeRequest()
        val sent = server.takeRequest()
        assertEquals("/suggestions/from-notification", sent.path)
        assertTrue(sent.body.readUtf8().contains("\"allowAi\":true"))
        assertEquals(TransactionType.EXPENSE, found.type)
        assertEquals(25_000.0, found.amount)
        assertEquals("exp.food.groceries", found.category)
        assertEquals("a1", found.walletId)
        // A code or promotion: nothing to suggest.
        assertNull(repo.capture(request))
    }

    @Test
    fun `dismissing and confirming take the suggestion off the list`() = runTest {
        server.enqueue(MockResponse().setBody("[$body]"))
        server.enqueue(MockResponse().setResponseCode(204))
        val repo = SuggestionRepository(CategoryRepository(server.apiService()), server.apiService())
        repo.refresh()
        assertEquals(1, repo.pending.value.size)
        repo.dismiss("s1")
        assertEquals(emptyList(), repo.pending.value)
        server.takeRequest()
        assertEquals("/suggestions/s1/dismiss", server.takeRequest().path)
    }

    @Test
    fun `a guest has none and never calls the server`() = runTest {
        DemoModeFlag.set(true)
        val repo = SuggestionRepository(CategoryRepository(server.apiService()), server.apiService())
        repo.refresh()
        assertEquals(emptyList(), repo.pending.value)
        assertEquals(0, server.requestCount)
    }
}
