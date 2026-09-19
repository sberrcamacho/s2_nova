package com.s2nova.app.data.repository

import com.s2nova.app.data.model.WalletType
import com.s2nova.app.testutil.apiService
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class WalletRepositoryTest {
    private val server = MockWebServer()

    @After
    fun tearDown() {
        server.shutdown()
        DemoModeFlag.set(false)
    }

    @Test
    fun `refresh maps account balances and type`() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """
                [{
                  "id": "a1", "name": "Nu", "type": "BANK_DEBIT", "initialBalance": 100000, "currentBalance": 250000,
                  "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z"
                }]
                """.trimIndent(),
            ),
        )
        val repository = WalletRepository(server.apiService())
        repository.refresh()
        val wallet = repository.wallets.value.single()
        assertEquals(WalletType.BANK_DEBIT, wallet.type)
        assertEquals(250000.0, wallet.currentBalance)
    }

    @Test
    fun `an unrecognized wallet type falls back to OTHER instead of crashing`() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """
                [{
                  "id": "a1", "name": "Legacy", "type": "SOME_FUTURE_TYPE", "initialBalance": 0, "currentBalance": 0,
                  "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z"
                }]
                """.trimIndent(),
            ),
        )
        val repository = WalletRepository(server.apiService())
        repository.refresh()
        assertEquals(WalletType.OTHER, repository.wallets.value.single().type)
    }

    @Test
    fun `refresh no-ops in demo mode`() = runTest {
        DemoModeFlag.set(true)
        val repository = WalletRepository(server.apiService())
        repository.refresh()
        assertEquals(0, server.requestCount)
        assertTrue(repository.wallets.value.isEmpty())
    }
}
