package com.s2nova.app.data.repository

import com.s2nova.app.testutil.apiService
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class GoalRepositoryTest {
    private val server = MockWebServer()

    @After
    fun tearDown() {
        server.shutdown()
        DemoModeFlag.set(false)
    }

    // Regression: GoalRepository.toGoal() used to drop the backend's own
    // rounded percentage/remaining entirely, forcing every screen to
    // recompute a truncated value client-side. A naive client-side recompute
    // of currentAmount/targetAmount here would yield 50%, not 999 — so this
    // only passes if the server's own value is carried through untouched.
    @Test
    fun `refresh carries the backend's percentage and remaining through untouched`() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """
                [{
                  "id": "g1", "name": "Viaje", "targetAmount": 100000, "currentAmount": 50000,
                  "remaining": 50000, "percentage": 999,
                  "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z"
                }]
                """.trimIndent(),
            ),
        )
        val repository = GoalRepository(server.apiService())
        repository.refresh()
        val goal = repository.goals.value.single()
        assertEquals(999, goal.percentage)
        assertEquals(50000.0, goal.remaining)
    }

    @Test
    fun `create maps the response into the goals list`() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """
                {
                  "id": "g2", "name": "Carro", "targetAmount": 20000000, "currentAmount": 0,
                  "remaining": 20000000, "percentage": 0, "targetDate": "2027-01-01",
                  "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z"
                }
                """.trimIndent(),
            ),
        )
        val repository = GoalRepository(server.apiService())
        val goal = repository.create(name = "Carro", targetAmount = 20_000_000.0, targetDate = "2027-01-01")
        assertEquals("g2", goal?.id)
        assertEquals(listOf(goal), repository.goals.value)
    }

    @Test
    fun `mutators no-op in demo mode without calling the network`() = runTest {
        DemoModeFlag.set(true)
        val repository = GoalRepository(server.apiService())
        repository.refresh()
        val created = repository.create(name = "x", targetAmount = 1.0)
        assertEquals(0, server.requestCount)
        assertTrue(repository.goals.value.isEmpty())
        assertEquals(null, created)
    }

    // Regression: deleteGoal was declared with @DELETE plus @Body, which
    // Retrofit rejects before sending — a goal with funds could never be
    // deleted. It must go out as a DELETE carrying the destination.
    @Test
    fun `delete sends a DELETE with the return-to-origin body`() = runTest {
        server.enqueue(MockResponse().setResponseCode(204))
        val repository = GoalRepository(server.apiService())
        repository.delete("g1", returnToOrigin = true)
        val request = server.takeRequest()
        assertEquals("DELETE", request.method)
        assertTrue(request.path!!.endsWith("/goals/g1"))
        assertTrue(request.body.readUtf8().contains("\"returnToOrigin\":true"))
    }

    @Test
    fun `refresh maps each wallet's contribution`() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """
                [{
                  "id": "g1", "name": "Viaje", "targetAmount": 100000, "currentAmount": 25000,
                  "remaining": 75000, "percentage": 25,
                  "contributions": [{"accountId": "w1", "amount": 20000}, {"accountId": "w2", "amount": 5000}],
                  "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z"
                }]
                """.trimIndent(),
            ),
        )
        val repository = GoalRepository(server.apiService())
        repository.refresh()
        assertEquals(mapOf("w1" to 20000.0, "w2" to 5000.0), repository.goals.value.single().contributions)
    }
}
