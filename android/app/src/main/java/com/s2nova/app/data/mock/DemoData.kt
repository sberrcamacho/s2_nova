package com.s2nova.app.data.mock

import com.s2nova.app.data.AnalyticsHelpers
import com.s2nova.app.data.Currencies
import com.s2nova.app.data.currentMonthKey
import com.s2nova.app.data.model.AppAlert
import com.s2nova.app.data.model.AttachmentMeta
import com.s2nova.app.data.model.BudgetKind
import com.s2nova.app.data.model.BudgetPeriod
import com.s2nova.app.data.model.BudgetProgress
import com.s2nova.app.data.model.CategoryBudget
import com.s2nova.app.data.model.CounterpartyKind
import com.s2nova.app.data.model.Goal
import com.s2nova.app.data.model.GoalPlan
import com.s2nova.app.data.model.GoalPlanEnd
import com.s2nova.app.data.model.LoanKind
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
import com.s2nova.app.data.repository.budgetStatusOf
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.roundToInt

// The guest account ("Continuar como invitado", ONBOARDING.md §1): the v2
// mockup's shared seed data (wallets incl. a USD wallet, movements with
// receipts, budgets incl. custom ones, goals with periodic contributions,
// loans, Programados). Dates keep their distance from the mockup's "today"
// (21 Aug 2026) relative to the real today, so the month views populate.
// Never sent to the server.
object DemoData {
    private val MOCK_TODAY: LocalDate = LocalDate.of(2026, 8, 21)
    private fun d(iso: String): String = LocalDate.now().plusDays(ChronoUnit.DAYS.between(MOCK_TODAY, LocalDate.parse(iso))).toString()

    const val BANCOLOMBIA = "demo-bancolombia"
    const val NEQUI = "demo-nequi"
    const val EFECTIVO = "demo-efectivo"
    const val WISE = "demo-wise"

    fun user(preferences: UserPreferences) = User(
        id = "demo-local-user",
        name = "Invitado",
        email = "invitado@s2nova.local",
        hasPassword = false,
        avatarInitials = "IN",
        memberSince = LocalDate.now().toString(),
        preferences = preferences.copy(guidesSeen = emptySet(), guidesOff = false),
        principalCurrency = "COP",
    )

    val currencies = listOf("COP", "USD", "EUR")

    val wallets = listOf(
        Wallet(BANCOLOMBIA, "Bancolombia — Ahorros", WalletType.SAVINGS, 13_740_000.0, 13_740_000.0, "COP", 13_740_000.0, 5),
        Wallet(NEQUI, "Nequi", WalletType.NEQUI, 1_982_300.0, 1_982_300.0, "COP", 1_982_300.0, 1),
        Wallet(EFECTIVO, "Efectivo", WalletType.CASH, 425_000.0, 425_000.0, "COP", 425_000.0, 1),
        Wallet(WISE, "Wise — Dólares", WalletType.SAVINGS, 320.0, 320.0, "USD", 320.0 * Currencies.referenceRate("USD", "COP"), 1),
    )

    private fun tx(
        id: String, date: String, time: String, title: String, cat: String, sub: String?, wallet: String, amount: Double,
        type: TransactionType = TransactionType.EXPENSE, currency: String = "COP", merchant: String? = null,
        from: String? = null, fromKind: CounterpartyKind? = null, planned: Boolean = false, attach: AttachmentMeta? = null, series: String? = null,
    ) = Transaction(
        id = id, walletId = wallet, description = title, amount = amount, type = type,
        status = if (planned) TransactionStatus.PLANNED else TransactionStatus.COMPLETED,
        category = cat, subcategoryId = sub, date = d(date), time = time, paymentMethod = PaymentMethod.BANK_TRANSFER,
        currency = currency, fxRate = if (currency == "USD" && wallet != WISE) 3950.0 else null,
        walletAmount = if (currency == "USD" && wallet != WISE) amount * 3950.0 else null,
        merchant = merchant, counterpartyName = from, counterpartyKind = fromKind, attachment = attach, recurringSeriesId = series,
    )

    val transactions: List<Transaction> = listOf(
        tx("demo-101", "2026-09-01", "08:00", "Arriendo", "exp.housing", "exp.housing.rent", BANCOLOMBIA, 1_450_000.0, planned = true, series = "demo-series-rent"),
        tx("demo-102", "2026-08-28", "09:00", "Cuota del curso de inglés", "exp.education", "exp.education.courses", NEQUI, 180_000.0, planned = true),
        tx("demo-1", "2026-08-21", "09:12", "Mercado semanal", "exp.food", "exp.food.groceries", BANCOLOMBIA, 168_500.0, merchant = "Éxito",
            attach = AttachmentMeta("demo-att-1", false, "image/jpeg", "recibo-exito.jpg", 1_200_000, d("2026-08-21"))),
        tx("demo-2", "2026-08-21", "07:48", "Café", "exp.food", "exp.food.cafes", EFECTIVO, 21_000.0, merchant = "Tostao"),
        tx("demo-3", "2026-08-20", "22:15", "Spotify", "exp.entertainment", "exp.entertainment.streaming", BANCOLOMBIA, 5.99, currency = "USD", merchant = "Spotify"),
        tx("demo-4", "2026-08-20", "10:30", "Internet y celular", "exp.utilities", "exp.utilities.internet", BANCOLOMBIA, 109_000.0, merchant = "Claro",
            attach = AttachmentMeta("demo-att-4", true, "application/pdf", "factura-claro-ago.pdf", 240_000, d("2026-08-20"))),
        tx("demo-5", "2026-08-18", "16:05", "Diseño de logo", "inc.work", "inc.work.freelance", WISE, 200.0, TransactionType.INCOME, "USD",
            from = "Andrés Gómez", fromKind = CounterpartyKind.CLIENT),
        tx("demo-6", "2026-08-01", "06:00", "Salario mensual", "inc.work", "inc.work.salary", BANCOLOMBIA, 4_400_000.0, TransactionType.INCOME,
            from = "Grupo Éxito", fromKind = CounterpartyKind.EMPLOYER),
    ) + listOf(
        // Préstamos (Planes › Préstamos).
        Transaction(
            id = "demo-loan-1", walletId = BANCOLOMBIA, description = "Préstamo a Camilo", amount = 420_000.0, type = TransactionType.EXPENSE,
            category = "exp.other", date = d("2026-08-05"), paymentMethod = PaymentMethod.BANK_TRANSFER, loanKind = LoanKind.LENT,
            counterpartyName = "Camilo Restrepo", dueDate = d("2026-09-15"),
        ),
        Transaction(
            id = "demo-loan-2", walletId = NEQUI, description = "Préstamo a Ana María", amount = 200_000.0, type = TransactionType.EXPENSE,
            category = "exp.other", date = d("2026-07-10"), paymentMethod = PaymentMethod.BANK_TRANSFER, loanKind = LoanKind.LENT,
            counterpartyName = "Ana María Ruiz", loanSettled = true,
        ),
        Transaction(
            id = "demo-loan-2-pay", walletId = NEQUI, description = "Pago recibido de Ana María Ruiz", amount = 200_000.0, type = TransactionType.INCOME,
            category = "exp.other", date = d("2026-08-02"), paymentMethod = PaymentMethod.BANK_TRANSFER, parentLoanId = "demo-loan-2",
        ),
    )

    // The month's spend per leaf (the mockup's MONTH_SPEND ledger), so the
    // category budgets show the same progress as the mockup.
    private val monthSpend = mapOf(
        "exp.food" to 612_400.0, "exp.housing" to 232_000.0, "exp.utilities" to 180_000.0, "exp.shopping" to 318_500.0,
        "exp.entertainment.streaming" to 84_800.0, "exp.transportation" to 95_500.0,
    )

    private fun progress(budget: CategoryBudget, spent: Double): BudgetProgress {
        val pct = if (budget.limit > 0) (spent / budget.limit * 100).roundToInt() else 0
        return BudgetProgress(budget, spent, budget.limit - spent, pct, budgetStatusOf(pct))
    }

    val budgetProgress: List<BudgetProgress> = listOf(
        CategoryBudget("demo-b1", "Vivienda", category = "exp.housing", limit = 250_000.0, month = currentMonthKey()),
        CategoryBudget("demo-b2", "Streaming", category = "exp.entertainment.streaming", limit = 90_000.0, month = currentMonthKey()),
        CategoryBudget("demo-b3", "Alimentación", category = "exp.food", limit = 900_000.0, month = currentMonthKey()),
        CategoryBudget("demo-b4", "Servicios públicos", category = "exp.utilities", limit = 200_000.0, month = currentMonthKey()),
        CategoryBudget("demo-b5", "Transporte", category = "exp.transportation", limit = 150_000.0, month = currentMonthKey()),
        CategoryBudget("demo-b6", "Compras", category = "exp.shopping", limit = 780_000.0, month = currentMonthKey()),
    ).map { progress(it, monthSpend[it.category] ?: 0.0) } + listOf(
        progress(
            CategoryBudget("demo-b7", "Viaje de fin de año", BudgetKind.CUSTOM, icon = "travel", period = BudgetPeriod.CUSTOM,
                startDate = d("2026-12-01"), endDate = d("2027-01-15"), limit = 2_500_000.0, month = currentMonthKey(), assignedCount = 3),
            640_000.0,
        ),
        progress(
            CategoryBudget("demo-b8", "Cumpleaños de Sofía", BudgetKind.CUSTOM, icon = "events", period = BudgetPeriod.CUSTOM,
                startDate = d("2026-08-10"), endDate = d("2026-08-31"), limit = 300_000.0, month = currentMonthKey(), assignedCount = 2),
            120_000.0,
        ),
    )

    private fun goal(id: String, name: String, target: Double, icon: String, initial: Double, due: String?, contributions: Map<String, Double>, plan: GoalPlan?): Goal {
        val current = initial + contributions.values.sum()
        return Goal(id, name, target, current, target - current, (current / target * 100).roundToInt(), due?.let(::d), icon, initial, plan, contributions)
    }

    val goals = listOf(
        goal("demo-g1", "Fondo de emergencia", 12_000_000.0, "savings", 0.0, null,
            mapOf(BANCOLOMBIA to 6_000_000.0, NEQUI to 1_800_000.0, EFECTIVO to 600_000.0),
            GoalPlan(100_000.0, RecurrenceInterval.WEEKLY, NEQUI, d("2026-06-01"), autoConfirm = true, nextDate = d("2026-08-24"))),
        goal("demo-g2", "Viaje a Perú", 4_500_000.0, "travel", 500_000.0, "2027-06-30",
            mapOf(BANCOLOMBIA to 700_000.0, NEQUI to 780_000.0),
            GoalPlan(250_000.0, RecurrenceInterval.MONTHLY, BANCOLOMBIA, d("2026-05-21"), nextDate = d("2026-08-21"), due = true)),
        goal("demo-g3", "Portátil nuevo", 5_200_000.0, "technology", 1_000_000.0, "2026-10-31", mapOf(BANCOLOMBIA to 3_680_000.0), null),
        goal("demo-g4", "Especialización", 3_000_000.0, "education", 0.0, null, mapOf(NEQUI to 300_000.0, EFECTIVO to 150_000.0), null),
    )

    private fun series(id: String, name: String, amount: Double, income: Boolean, cat: String, sub: String?, next: String, active: Boolean = true) = RecurringSeries(
        id = id, name = name, type = if (income) TransactionType.INCOME else TransactionType.EXPENSE, amount = amount,
        walletId = BANCOLOMBIA, category = cat, subcategoryId = sub, paymentMethod = PaymentMethod.BANK_TRANSFER,
        interval = RecurrenceInterval.MONTHLY, nextOccurrenceDate = d(next), isDue = LocalDate.parse(d(next)) <= LocalDate.now(), active = active,
    )

    val recurringSeries = listOf(
        series("demo-s1", "Netflix", 45_000.0, false, "exp.entertainment", "exp.entertainment.streaming", "2026-08-24"),
        series("demo-s2", "Internet y celular", 109_000.0, false, "exp.utilities", "exp.utilities.internet", "2026-08-26"),
        series("demo-s3", "Administración", 232_000.0, false, "exp.housing", "exp.housing.maintenance", "2026-08-21"),
        series("demo-s4", "Salario mensual", 4_400_000.0, true, "inc.work", "inc.work.salary", "2026-09-01"),
        series("demo-s5", "Gimnasio", 89_000.0, false, "exp.health", null, "2026-09-05", active = false),
    )

    val monthSummaries = AnalyticsHelpers.monthlyHistory(transactions, 1)

    val alerts: List<AppAlert> = listOf(
        AppAlert.SeriesDue("series:demo-s3", "demo-s3", "Administración", TransactionType.EXPENSE, 232_000.0, "exp.housing", d("2026-08-21"), false),
        AppAlert.LoanOpen("loan:demo-loan-1", "demo-loan-1", LoanKind.LENT, "Camilo Restrepo", 420_000.0, d("2026-09-15"), false),
    ) + budgetProgress
        .filter { it.budget.kind == BudgetKind.CATEGORY && it.percentage >= 90 }
        .sortedByDescending { it.percentage }
        .map {
            AppAlert.BudgetAtRisk(
                id = "budget:${it.budget.id}:${it.budget.month}",
                budgetId = it.budget.id,
                name = it.budget.name,
                category = it.budget.category!!,
                spent = it.spent,
                limit = it.budget.limit,
                percentage = it.percentage,
            )
        } + listOf(
        AppAlert.GoalNear("goal:demo-g3", "demo-g3", "Portátil nuevo", "technology", 90, 520_000.0),
        AppAlert.GoalPlanDue("goalplan:demo-g2", "demo-g2", "Viaje a Perú", "travel", 250_000.0, "COP", BANCOLOMBIA, LocalDate.now().toString()),
        AppAlert.GoalPlanAuto("goalauto:demo-g1", "demo-g1", "Fondo de emergencia", "savings", 100_000.0, "COP", "Nequi", d("2026-08-17")),
        AppAlert.TxPlanned("planned:demo-102", "demo-102", "Cuota del curso de inglés", "exp.education.courses", 180_000.0, "COP", "Nequi", d("2026-08-28")),
    )
}
