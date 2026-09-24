package com.s2nova.app.data.repository

import com.s2nova.app.data.model.AppAlert
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.LoanKind
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.testutil.apiService
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull

class AlertRepositoryTest {
    private val server = MockWebServer()

    @After
    fun tearDown() {
        server.shutdown()
        DemoModeFlag.set(false)
    }

    private suspend fun categories(): CategoryRepository {
        server.enqueue(
            MockResponse().setBody(
                """
                [{"id": "cat-bills", "slug": "bills", "name": "Servicios", "icon": "bills", "color": "#000", "kind": "EXPENSE"}]
                """.trimIndent(),
            ),
        )
        return CategoryRepository(server.apiService()).also { it.refresh() }
    }

    private val alertsBody = """
        [
          {"id": "series:s1:2026-08-21", "kind": "SERIES_DUE", "seriesId": "s1", "name": "Administración", "type": "EXPENSE",
           "amount": 380000, "categoryId": "cat-bills", "dueDate": "2026-08-21T00:00:00.000Z", "overdue": false},
          {"id": "loan:t1", "kind": "LOAN_OPEN", "transactionId": "t1", "loanKind": "LENT", "counterpartyName": "Camilo Restrepo",
           "outstanding": 420000, "dueDate": "2026-09-15T00:00:00.000Z", "overdue": false},
          {"id": "budget:b1:2026-08", "kind": "BUDGET_AT_RISK", "budgetId": "b1", "name": null, "categoryId": "cat-bills",
           "spent": 412000, "amount": 450000, "percentage": 92},
          {"id": "goal:g1", "kind": "GOAL_NEAR", "goalId": "g1", "name": "Viaje", "themeIcon": "TRAVEL", "percentage": 94, "remaining": 60000},
          {"id": "future:x", "kind": "SOMETHING_NEW"}
        ]
    """.trimIndent()

    @Test
    fun `refresh maps every known kind in server order and skips unknown ones`() = runTest {
        val repository = AlertRepository(categories(), server.apiService())
        server.enqueue(MockResponse().setBody(alertsBody))
        repository.refresh(today = "2026-08-21")

        server.takeRequest() // categories
        assertEquals("/alerts?today=2026-08-21", server.takeRequest().path)

        val alerts = repository.alerts.value
        assertEquals(listOf("series:s1:2026-08-21", "loan:t1", "budget:b1:2026-08", "goal:g1"), alerts.map { it.id })
        val series = assertIs<AppAlert.SeriesDue>(alerts[0])
        assertEquals(TransactionType.EXPENSE, series.type)
        assertEquals(CategoryId.BILLS, series.category)
        assertEquals("2026-08-21", series.dueDate)
        val loan = assertIs<AppAlert.LoanOpen>(alerts[1])
        assertEquals(LoanKind.LENT, loan.loanKind)
        assertEquals(420_000.0, loan.outstanding)
        val budget = assertIs<AppAlert.BudgetAtRisk>(alerts[2])
        assertEquals(450_000.0, budget.limit)
        assertEquals(92, budget.percentage)
    }

    @Test
    fun `home alert skips alerts read in the bell or dismissed from Inicio`() = runTest {
        val repository = AlertRepository(categories(), server.apiService())
        server.enqueue(MockResponse().setBody(alertsBody))
        repository.refresh(today = "2026-08-21")

        fun home() = homeAlertOf(repository.alerts.value, repository.readIds.value, repository.dismissedIds.value)
        assertEquals("series:s1:2026-08-21", home()?.id)
        repository.markRead("series:s1:2026-08-21")
        assertEquals("loan:t1", home()?.id)
        repository.dismissFromHome("loan:t1")
        assertEquals("budget:b1:2026-08", home()?.id)
        repository.markAllRead()
        assertNull(home())
    }

    @Test
    fun `refresh forgets read and dismissed ids for conditions that no longer exist`() = runTest {
        val repository = AlertRepository(categories(), server.apiService())
        server.enqueue(MockResponse().setBody(alertsBody))
        repository.refresh(today = "2026-08-21")
        repository.markRead("loan:t1")
        repository.dismissFromHome("goal:g1")

        server.enqueue(
            MockResponse().setBody(
                """[{"id": "loan:t1", "kind": "LOAN_OPEN", "transactionId": "t1", "loanKind": "BORROWED", "outstanding": 1, "dueDate": "2026-09-15", "overdue": false}]""",
            ),
        )
        repository.refresh(today = "2026-08-22")
        assertEquals(setOf("loan:t1"), repository.readIds.value)
        assertEquals(emptySet(), repository.dismissedIds.value)
    }

    @Test
    fun `refresh no-ops in demo mode`() = runTest {
        DemoModeFlag.set(true)
        AlertRepository(CategoryRepository(server.apiService()), server.apiService()).refresh()
        assertEquals(0, server.requestCount)
    }
}
