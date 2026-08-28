package com.s2nova.app.data.mock

import com.s2nova.app.data.currentMonthKey
import com.s2nova.app.data.model.BudgetProgress
import com.s2nova.app.data.model.BudgetStatus
import com.s2nova.app.data.model.CategoryBudget
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.Goal
import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.RecurrenceInterval
import com.s2nova.app.data.model.RecurringSeries
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.model.User
import com.s2nova.app.data.model.UserPreferences
import com.s2nova.app.data.model.Wallet
import com.s2nova.app.data.model.WalletType
import java.time.LocalDate

// Fictitious, internally-consistent sample data for the local-only "demo
// mode" toggle (Settings > Modo demo) — lets a signed-in user preview how
// charts/screens look with a populated account without touching the real
// backend. Every date is computed relative to LocalDate.now() so the last-
// 6-months charts (AnalyticsHelpers.monthlyHistory) always populate
// correctly regardless of when demo mode is turned on. Never sent to the
// server — see AppContainer.enterDemoMode().
object DemoData {

    private const val WALLET_CASH = "demo-wallet-cash"
    private const val WALLET_DEBIT = "demo-wallet-debit"
    private const val WALLET_SAVINGS = "demo-wallet-savings"

    // A distinct local persona (not the signed-in user) so it's obvious the
    // app is showing fictitious data — preferences are filled in by
    // AppContainer.enterDemoMode() from whoever was really signed in, so
    // toggling demo mode doesn't jarringly flip the language/theme/currency.
    fun user(preferences: UserPreferences) = User(
        id = "demo-local-user",
        name = "Cuenta Demo",
        email = "cuenta.demo@dispositivo.local",
        hasPassword = false,
        avatarInitials = "CD",
        memberSince = LocalDate.now().toString(),
        preferences = preferences,
    )

    val wallets = listOf(
        Wallet(id = WALLET_CASH, name = "Efectivo", type = WalletType.CASH, initialBalance = 300_000.0, currentBalance = 420_000.0),
        Wallet(id = WALLET_DEBIT, name = "Bancolombia", type = WalletType.BANK_DEBIT, initialBalance = 2_000_000.0, currentBalance = 8_927_300.0),
        Wallet(id = WALLET_SAVINGS, name = "Nu", type = WalletType.SAVINGS, initialBalance = 4_000_000.0, currentBalance = 6_800_000.0),
    )

    val transactions: List<Transaction> = buildList {
        val today = LocalDate.now()
        // Six months of income + everyday expenses, most recent month first.
        for (i in 0..5) {
            val monthStart = today.minusMonths(i.toLong()).withDayOfMonth(1)
            val iso = { day: Int -> monthStart.withDayOfMonth(day.coerceAtMost(monthStart.lengthOfMonth())).toString() }

            add(income(iso(1), 4_400_000.0, "Salario mensual", "Nómina — Grupo Éxito"))
            if (i % 2 == 0) add(income(iso(15), 800_000.0, "Proyecto freelance", "Cliente independiente", CategoryId.FREELANCE))

            add(expense(iso(3), 380_000.0, "Mercado del mes", "Éxito", CategoryId.FOOD))
            add(expense(iso(12), 180_000.0, "Almuerzos y domicilios", "Rappi", CategoryId.FOOD))
            add(expense(iso(6), 160_000.0, "Transporte app", "Uber", CategoryId.TRANSPORTATION))
            add(expense(iso(20), 90_000.0, "Gasolina", "Terpel", CategoryId.TRANSPORTATION))
            add(expense(iso(9), 220_000.0, "Ropa y accesorios", "Falabella", CategoryId.SHOPPING))
            add(expense(iso(18), 150_000.0, "Cine y salidas", "Cine Colombia", CategoryId.ENTERTAINMENT))
            add(expense(iso(5), 130_000.0, "Consulta médica", "EPS Sura", CategoryId.HEALTH))
            add(expense(iso(2), 260_000.0, "Servicios públicos", "EPM", CategoryId.BILLS))
            add(expense(iso(8), 45_000.0, "Netflix", "Netflix", CategoryId.SUBSCRIPTIONS))
            add(expense(iso(8), 109_000.0, "Internet y celular", "Claro", CategoryId.SUBSCRIPTIONS))
        }
    }.sortedByDescending { it.date }

    val budgetProgress: List<BudgetProgress> = listOf(
        budget(CategoryId.FOOD, limit = 700_000.0, spent = 560_000.0),
        budget(CategoryId.TRANSPORTATION, limit = 300_000.0, spent = 250_000.0),
        budget(CategoryId.SHOPPING, limit = 250_000.0, spent = 300_000.0),
        budget(CategoryId.ENTERTAINMENT, limit = 200_000.0, spent = 150_000.0),
    )

    val goals = listOf(
        Goal(id = "demo-goal-1", name = "Fondo de emergencia", targetAmount = 10_000_000.0, currentAmount = 7_000_000.0),
        Goal(id = "demo-goal-2", name = "Viaje a Cartagena", targetAmount = 3_000_000.0, currentAmount = 1_320_000.0),
    )

    val recurringSeries: List<RecurringSeries> = run {
        val nextMonth1st = LocalDate.now().plusMonths(1).withDayOfMonth(1).toString()
        val next8th = LocalDate.now().withDayOfMonth(8).let { if (it.isBefore(LocalDate.now())) it.plusMonths(1) else it }.toString()
        listOf(
            RecurringSeries(
                id = "demo-recurring-salario", name = "Salario", type = TransactionType.INCOME, amount = 4_400_000.0,
                walletId = WALLET_DEBIT, category = CategoryId.SALARY, paymentMethod = PaymentMethod.BANK_TRANSFER,
                interval = RecurrenceInterval.MONTHLY, nextOccurrenceDate = nextMonth1st, isDue = false, active = true,
            ),
            RecurringSeries(
                id = "demo-recurring-netflix", name = "Netflix", type = TransactionType.EXPENSE, amount = 45_000.0,
                walletId = WALLET_DEBIT, category = CategoryId.SUBSCRIPTIONS, paymentMethod = PaymentMethod.BANK_TRANSFER,
                interval = RecurrenceInterval.MONTHLY, nextOccurrenceDate = next8th, isDue = false, active = true,
            ),
            RecurringSeries(
                id = "demo-recurring-internet", name = "Internet y celular", type = TransactionType.EXPENSE, amount = 109_000.0,
                walletId = WALLET_DEBIT, category = CategoryId.SUBSCRIPTIONS, paymentMethod = PaymentMethod.BANK_TRANSFER,
                interval = RecurrenceInterval.MONTHLY, nextOccurrenceDate = next8th, isDue = false, active = true,
            ),
            RecurringSeries(
                id = "demo-recurring-gym", name = "Gimnasio", type = TransactionType.EXPENSE, amount = 80_000.0,
                walletId = WALLET_CASH, category = CategoryId.HEALTH, paymentMethod = PaymentMethod.CASH,
                interval = RecurrenceInterval.MONTHLY, nextOccurrenceDate = next8th, isDue = false, active = false,
            ),
        )
    }

    private fun income(date: String, amount: Double, description: String, merchant: String, category: CategoryId = CategoryId.SALARY) = Transaction(
        id = "demo-${date}-$description".hashCode().toString(),
        walletId = WALLET_DEBIT,
        description = description,
        amount = amount,
        type = TransactionType.INCOME,
        status = TransactionStatus.COMPLETED,
        category = category,
        date = date,
        paymentMethod = PaymentMethod.BANK_TRANSFER,
        merchant = merchant,
    )

    private fun expense(date: String, amount: Double, description: String, merchant: String, category: CategoryId) = Transaction(
        id = "demo-${date}-$description".hashCode().toString(),
        walletId = if (category == CategoryId.HEALTH) WALLET_CASH else WALLET_DEBIT,
        description = description,
        amount = amount,
        type = TransactionType.EXPENSE,
        status = TransactionStatus.COMPLETED,
        category = category,
        date = date,
        paymentMethod = if (category == CategoryId.HEALTH) PaymentMethod.CASH else PaymentMethod.BANK_TRANSFER,
        merchant = merchant,
    )

    private fun budget(category: CategoryId, limit: Double, spent: Double): BudgetProgress {
        val remaining = limit - spent
        val percentage = if (limit > 0) ((spent / limit) * 100).toInt() else 0
        val status = when {
            percentage >= 100 -> BudgetStatus.OVER_BUDGET
            percentage >= 80 -> BudgetStatus.NEAR_LIMIT
            else -> BudgetStatus.ON_TRACK
        }
        return BudgetProgress(
            budget = CategoryBudget(id = "demo-budget-${category.name}", category = category, limit = limit, month = currentMonthKey()),
            spent = spent,
            remaining = remaining,
            percentage = percentage,
            status = status,
        )
    }
}
