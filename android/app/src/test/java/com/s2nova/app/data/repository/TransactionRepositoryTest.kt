package com.s2nova.app.data.repository

import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.testutil.apiService
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class TransactionRepositoryTest {
    private val server = MockWebServer()

    private suspend fun categoryRepositoryWithFood(): CategoryRepository {
        server.enqueue(
            MockResponse().setBody(
                """[{"id": "cat-food", "slug": "food", "name": "Comida", "icon": "food", "color": "#000", "kind": "EXPENSE"}]""",
            ),
        )
        val categoryRepository = CategoryRepository(server.apiService())
        categoryRepository.refresh()
        return categoryRepository
    }

    @After
    fun tearDown() {
        server.shutdown()
        DemoModeFlag.set(false)
    }

    @Test
    fun `refresh maps a transaction dto into the domain model via the category bridge`() = runTest {
        val categoryRepository = categoryRepositoryWithFood()
        server.enqueue(
            MockResponse().setBody(
                """
                [{
                  "id": "t1", "accountId": "a1", "type": "EXPENSE", "status": "COMPLETED", "amount": 30000,
                  "categoryId": "cat-food", "paymentMethod": "CASH", "description": "Almuerzo", "date": "2026-03-01",
                  "createdAt": "2026-03-01T00:00:00.000Z", "updatedAt": "2026-03-01T00:00:00.000Z"
                }]
                """.trimIndent(),
            ),
        )
        val repository = TransactionRepository(categoryRepository, server.apiService())
        repository.refresh()
        val transaction = repository.transactions.value.single()
        assertEquals(CategoryId.FOOD, transaction.category)
        assertEquals(30000.0, transaction.amount)
        assertEquals(TransactionStatus.COMPLETED, transaction.status)
    }

    @Test
    fun `a transaction whose category is unknown to this client is silently dropped, not crashed on`() = runTest {
        val categoryRepository = categoryRepositoryWithFood()
        server.enqueue(
            MockResponse().setBody(
                """
                [{
                  "id": "t1", "accountId": "a1", "type": "EXPENSE", "status": "COMPLETED", "amount": 30000,
                  "categoryId": "cat-unknown", "paymentMethod": "CASH", "description": "?", "date": "2026-03-01",
                  "createdAt": "2026-03-01T00:00:00.000Z", "updatedAt": "2026-03-01T00:00:00.000Z"
                }]
                """.trimIndent(),
            ),
        )
        val repository = TransactionRepository(categoryRepository, server.apiService())
        repository.refresh()
        assertTrue(repository.transactions.value.isEmpty())
    }

    @Test
    fun `outstandingFor is the loan amount minus every settlement linked via parentLoanId`() {
        val categoryRepository = CategoryRepository(server.apiService())
        val loan = transaction(id = "loan1", amount = 100_000.0)
        val partial = transaction(id = "settle1", amount = 40_000.0, parentLoanId = "loan1")
        val repository = TransactionRepository(categoryRepository, server.apiService())
        repository.loadDemo(listOf(loan, partial))
        assertEquals(40_000.0, repository.paidSoFar("loan1"))
        assertEquals(60_000.0, repository.outstandingFor(loan))
    }

    @Test
    fun `refresh no-ops in demo mode`() = runTest {
        DemoModeFlag.set(true)
        val categoryRepository = CategoryRepository(server.apiService())
        val repository = TransactionRepository(categoryRepository, server.apiService())
        repository.refresh()
        assertEquals(0, server.requestCount)
    }

    private fun transaction(id: String, amount: Double, parentLoanId: String? = null) = Transaction(
        id = id,
        walletId = "w1",
        description = "d",
        amount = amount,
        type = TransactionType.EXPENSE,
        category = CategoryId.OTHER,
        date = "2026-03-01",
        paymentMethod = PaymentMethod.CASH,
        loanKind = if (parentLoanId == null) com.s2nova.app.data.model.LoanKind.LENT else null,
        parentLoanId = parentLoanId,
    )
}
