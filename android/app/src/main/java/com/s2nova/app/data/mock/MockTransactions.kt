package com.s2nova.app.data.mock

import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionType
import java.time.LocalDate
import kotlin.random.Random

// Mirrors the spirit of web/src/data/transactions.ts (deterministic mock
// history, not a literal port of its PRNG) — dates are relative to "today"
// so budgets/analytics always have live current-month data whenever the
// app is actually run, on either platform.
private data class ExpenseTemplate(val category: CategoryId, val description: String, val merchant: String, val amountRange: IntRange)

private val EXPENSE_TEMPLATES = listOf(
    ExpenseTemplate(CategoryId.FOOD, "Mercado semanal", "Éxito", 60_000..190_000),
    ExpenseTemplate(CategoryId.FOOD, "Comida rápida", "El Corral", 15_000..35_000),
    ExpenseTemplate(CategoryId.FOOD, "Domicilio", "Rappi", 20_000..45_000),
    ExpenseTemplate(CategoryId.TRANSPORTATION, "Gasolina", "Terpel", 50_000..90_000),
    ExpenseTemplate(CategoryId.TRANSPORTATION, "Viaje en app", "Didi", 8_000..22_000),
    ExpenseTemplate(CategoryId.SHOPPING, "Artículos para el hogar", "Homecenter", 40_000..160_000),
    ExpenseTemplate(CategoryId.SHOPPING, "Tecnología", "Falabella", 80_000..220_000),
    ExpenseTemplate(CategoryId.HEALTH, "Droguería", "Farmatodo", 20_000..75_000),
    ExpenseTemplate(CategoryId.EDUCATION, "Curso en línea", "Platzi", 40_000..90_000),
    ExpenseTemplate(CategoryId.ENTERTAINMENT, "Cine", "Cine Colombia", 15_000..40_000),
    ExpenseTemplate(CategoryId.BILLS, "Energía eléctrica", "EPM", 90_000..150_000),
    ExpenseTemplate(CategoryId.BILLS, "Acueducto y aseo", "EPM", 40_000..80_000),
    ExpenseTemplate(CategoryId.SUBSCRIPTIONS, "Streaming", "Netflix", 25_000..45_000),
    ExpenseTemplate(CategoryId.SUBSCRIPTIONS, "Música", "Spotify", 9_000..17_000),
)

private val PAYMENT_METHODS = listOf(
    PaymentMethod.CASH, PaymentMethod.DEBIT_CARD, PaymentMethod.CREDIT_CARD,
    PaymentMethod.BANK_TRANSFER, PaymentMethod.NEQUI,
)

fun seedTransactions(): List<Transaction> {
    val random = Random(20260814)
    val today = LocalDate.now()
    val list = mutableListOf<Transaction>()
    var counter = 0

    for (monthsAgo in 5 downTo 0) {
        val monthAnchor = today.minusMonths(monthsAgo.toLong())

        // Monthly salary, paid on the 1st.
        val salaryDate = monthAnchor.withDayOfMonth(1)
        if (!salaryDate.isAfter(today)) {
            list.add(
                Transaction(
                    id = "txn_${counter++}",
                    description = "Salario — Acme Corp",
                    amount = 4_200_000.0 + random.nextInt(-150_000, 250_000),
                    type = TransactionType.INCOME,
                    category = CategoryId.SALARY,
                    date = salaryDate.toString(),
                    paymentMethod = PaymentMethod.BANK_TRANSFER,
                    merchant = "Acme Corp",
                ),
            )
        }

        // Occasional freelance income.
        if (random.nextInt(100) < 40) {
            val day = random.nextInt(5, 25)
            val date = monthAnchor.withDayOfMonth(minOf(day, monthAnchor.lengthOfMonth()))
            if (!date.isAfter(today)) {
                list.add(
                    Transaction(
                        id = "txn_${counter++}",
                        description = "Proyecto freelance",
                        amount = (300_000..1_200_000).random(random).toDouble(),
                        type = TransactionType.INCOME,
                        category = CategoryId.FREELANCE,
                        date = date.toString(),
                        paymentMethod = PaymentMethod.BANK_TRANSFER,
                        merchant = "Cliente independiente",
                    ),
                )
            }
        }

        // 16-22 expenses spread across the month.
        val expenseCount = random.nextInt(16, 23)
        repeat(expenseCount) {
            val template = EXPENSE_TEMPLATES.random(random)
            val day = random.nextInt(1, monthAnchor.lengthOfMonth() + 1)
            val date = monthAnchor.withDayOfMonth(day)
            if (!date.isAfter(today)) {
                list.add(
                    Transaction(
                        id = "txn_${counter++}",
                        description = template.description,
                        amount = template.amountRange.random(random).toDouble(),
                        type = TransactionType.EXPENSE,
                        category = template.category,
                        date = date.toString(),
                        paymentMethod = PAYMENT_METHODS.random(random),
                        merchant = template.merchant,
                    ),
                )
            }
        }
    }

    return list.sortedByDescending { it.date }
}

private fun IntRange.random(random: Random): Int = random.nextInt(first, last + 1)
