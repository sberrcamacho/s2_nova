package com.s2nova.app.data.repository

import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.testutil.apiService
import com.s2nova.app.ui.AppLang
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Test
import kotlin.test.assertEquals

class DisplayTitleTest {
    private val server = MockWebServer()
    private val categories = CategoryRepository(server.apiService()).also { it.loadDemo() }

    @After
    fun tearDown() {
        AppLang.set(AppLanguage.ES)
        server.shutdown()
    }

    @Test
    fun `a suggested title reads in the current language, whichever it was saved in`() {
        AppLang.set(AppLanguage.EN)
        assertEquals("Groceries", displayTitle("Mercado", TransactionType.EXPENSE, "exp.food.groceries", categories))
        assertEquals("Expense", displayTitle("Gasto", TransactionType.EXPENSE, null, categories))
        assertEquals("Transfer", displayTitle("Transferencia", TransactionType.TRANSFER, null, categories))
        AppLang.set(AppLanguage.ES)
        assertEquals("Mercado", displayTitle("Groceries", TransactionType.EXPENSE, "exp.food.groceries", categories))
        assertEquals("Ingreso", displayTitle("Income", TransactionType.INCOME, "inc.work.salary", categories))
    }

    @Test
    fun `a title the user wrote shows as typed`() {
        AppLang.set(AppLanguage.EN)
        assertEquals("Mercado del mes", displayTitle("Mercado del mes", TransactionType.EXPENSE, "exp.food.groceries", categories))
        assertEquals("Cafés", displayTitle("Cafés", TransactionType.EXPENSE, "exp.food.groceries", categories))
    }
}
