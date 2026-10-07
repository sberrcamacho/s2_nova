package com.s2nova.app.data.mock

import com.s2nova.app.data.AnalyticsHelpers
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.testutil.initTaxonomy
import java.io.File
import java.time.LocalDate
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class GuestSeedTest {
    @BeforeTest
    fun load() {
        initTaxonomy()
        val text = listOf("src/main/assets/guest_seed.json", "app/src/main/assets/guest_seed.json").map(::File).first { it.exists() }.readText()
        GuestSeed.initFrom(text)
    }

    @Test
    fun `resolves month-anchored, day-relative and next-occurrence dates as web does`() {
        assertEquals("2026-02-28", GuestSeed.resolve("M:-1:31", LocalDate.parse("2026-03-15")))
        assertEquals("2026-02-28", GuestSeed.resolve("M:0:L", LocalDate.parse("2026-02-10")))
        assertEquals("2025-11-01", GuestSeed.resolve("M:-11:1", LocalDate.parse("2026-10-07")))
        assertEquals("2026-02-23", GuestSeed.resolve("T:-8", LocalDate.parse("2026-03-03")))
        assertEquals("2026-02-28", GuestSeed.resolve("D:-1", LocalDate.parse("2026-03-31")))
        assertEquals("2026-10-05", GuestSeed.resolve("N:5", LocalDate.parse("2026-10-04")))
        assertEquals("2026-11-05", GuestSeed.resolve("N:5", LocalDate.parse("2026-10-05")))
    }

    // The same figures web's guestSeed.spec.ts expects for this day.
    @Test
    fun `derives the balances, budgets, goals and alerts web derives on 2026-10-07`() {
        val account = GuestSeed.account(LocalDate.parse("2026-10-07"))
        assertEquals(
            listOf("guest-bancolombia" to 15_849_029.0, "guest-nequi" to 474_400.0, "guest-efectivo" to 509_200.0, "guest-visa" to -1_018_800.0, "guest-wise" to 1_116.0, "guest-revolut" to 121.5),
            account.wallets.map { it.id to it.currentBalance },
        )
        val spent = account.budgets.associate { it.budget.id to it.spent }
        assertEquals(587_800.0, spent["guest-budget-food"])
        assertEquals(396_700.0, spent["guest-budget-restaurants"])
        assertEquals(55_000.0, spent["guest-budget-transport"])
        assertEquals(185_000.0, spent["guest-budget-sofia"])
        assertEquals(
            listOf("guest-goal-emergencia" to 4_300_000.0, "guest-goal-peru" to 2_145_000.0, "guest-goal-portatil" to 4_750_000.0, "guest-goal-especializacion" to 900_000.0, "guest-goal-bici" to 1_800_000.0),
            account.goals.map { it.id to it.currentAmount },
        )
        assertEquals(
            listOf("series:guest-series-admin", "loan:guest-loan-daniela", "loan:guest-loan-camilo", "budget:guest-budget-restaurants", "goal:guest-goal-portatil", "goalplan:guest-goal-peru", "goalauto", "planned", "planned"),
            account.alerts.map { a -> a.id.split(":").let { if (it[0] in setOf("goalauto", "planned")) it[0] else "${it[0]}:${it[1]}" } },
        )
        // Newest first, as the backend lists them.
        assertEquals(account.transactions.sortedByDescending { it.date }.map { it.date }, account.transactions.map { it.date })
        // The receipts carry real files.
        assertEquals(2, account.files.size)
        assertTrue(account.files.values.all { it.size > 500 })
    }

    @Test
    fun `every month has one salary on any day`() {
        for (day in listOf("2026-10-01", "2026-10-31", "2027-02-28", "2027-03-01")) {
            val today = LocalDate.parse(day)
            val account = GuestSeed.account(today)
            for (i in 0L..11L) {
                val month = today.minusMonths(i).toString().substring(0, 7)
                val salaries = account.transactions.count { it.type == TransactionType.INCOME && it.subcategoryId == "inc.work.salary" && it.date.startsWith(month) }
                assertEquals(1, salaries, "$day: $month")
            }
            assertTrue(account.wallets.filter { it.id != "guest-visa" }.all { it.currentBalance > 0 }, day)
            assertTrue(AnalyticsHelpers.changes(account.transactions, day, "COP").current >= 0.0)
        }
    }
}
