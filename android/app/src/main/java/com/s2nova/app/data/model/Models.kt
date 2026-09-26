package com.s2nova.app.data.model

enum class TransactionType { INCOME, EXPENSE, TRANSFER }

// COMPLETED transactions affect their wallet's balance immediately;
// PLANNED ("Upcoming") ones are recorded but don't move money yet.
enum class TransactionStatus { COMPLETED, PLANNED }

// Interval a RecurringSeries fires on. Only RecurringSeries carries this —
// a materialized Transaction just points back to its series via
// recurringSeriesId, it doesn't repeat its own interval (see
// RecurringSeries doc comment for why definition and occurrence are
// separate types).
enum class RecurrenceInterval { DAILY, WEEKLY, MONTHLY, YEARLY }

// Set only on transactions representing money lent to, or borrowed from,
// someone else — tracked as outstanding until settled.
enum class LoanKind { LENT, BORROWED }

// BANK_DEBIT/BANK_CREDIT replace the old flat BANK value — a bank wallet
// always needs the debit/credit distinction ("tarjeta" in the UI copy).
// NEQUI/DAVIPLATA are wallet types here, not payment methods — a user
// holds a balance in them, same as any other wallet. Mirrors backend's
// AccountType (backend/prisma/schema.prisma).
enum class WalletType { CASH, BANK_DEBIT, BANK_CREDIT, SAVINGS, CRYPTO, NEQUI, DAVIPLATA, OTHER }

data class Wallet(
    val id: String,
    val name: String,
    val type: WalletType,
    val initialBalance: Double,
    val currentBalance: Double,
    // ISO 4217 code; the balance is kept in it (CURRENCIES_AND_WALLETS.md).
    val currency: String = "COP",
    // Balance converted to the principal currency ("≈ $1.264.000").
    val principalBalance: Double = currentBalance,
    // Movements that go with it when deleted (two-step confirmation copy).
    val movements: Int = 0,
)

// A category node's stable dotted id from the taxonomy (s2-categories.js),
// e.g. "exp.food" or "exp.food.groceries" — never a display name. Resolve
// names, colors and glyphs through CategoryRepository.
typealias CategoryId = String

// A transaction's payment method is never chosen independently by the user
// — the backend derives it server-side from whichever wallet was picked
// (paymentMethodForAccountType in backend/src/routes/transactions.ts), so
// a wallet and "how it was paid" can never disagree. This client never
// sends or computes one (see NewTransactionInput below); this enum only
// exists to deserialize the value the server already computed, for
// display (TransactionRow/TransactionDetailScreen). DEBIT_CARD/CREDIT_CARD
// are kept only so historical/seeded rows still deserialize — no code path
// produces them anymore (a card wallet reads as BANK_TRANSFER).
enum class PaymentMethod { CASH, DEBIT_CARD, CREDIT_CARD, BANK_TRANSFER, NEQUI, DAVIPLATA }

data class PaymentMethodOption(val id: PaymentMethod, val label: String)

// One node of the category tree as the user sees it: built-in taxonomy
// nodes (with the user's rename/icon/hide overrides) plus their custom
// ones. `id` is the dotted id; `backendId` the server row's UUID (null in
// guest mode).
data class CategoryNode(
    val id: CategoryId,
    val backendId: String?,
    val income: Boolean,
    val parentId: CategoryId?,
    val name: String,
    val defaultName: String,
    val vis: String,
    val color: Long,
    val custom: Boolean,
    val hidden: Boolean,
    val usage: Int,
)

enum class CounterpartyKind(val label: String) {
    EMPLOYER("Empleador"), CLIENT("Cliente"), FAMILY("Familia"), FRIEND("Amigo"), OTHER("Otro"),
}

// The receipt attached to a movement (NEW_MOVEMENT.md §7), metadata only;
// the bytes are fetched on demand.
data class AttachmentMeta(
    val id: String,
    val isPdf: Boolean,
    val mime: String,
    val name: String,
    val size: Long,
    val createdAt: String,
)

data class Transaction(
    val id: String,
    val walletId: String,
    val transferToWalletId: String? = null,
    val description: String,
    val amount: Double,
    val type: TransactionType,
    val status: TransactionStatus = TransactionStatus.COMPLETED,
    // Parent node id; subcategoryId is the leaf's dotted id when one was picked.
    val category: CategoryId,
    val subcategoryId: CategoryId? = null,
    val date: String, // ISO yyyy-MM-dd
    val time: String = "12:00", // HH:mm, the movement's local time
    val paymentMethod: PaymentMethod,
    // Original currency of `amount`; walletAmount is what the wallet moved
    // by when it differs (fxRate = wallet units per 1 movement unit).
    val currency: String = "COP",
    val fxRate: Double? = null,
    val walletAmount: Double? = null,
    val counterpartyKind: CounterpartyKind? = null,
    val customBudgetId: String? = null,
    val attachment: AttachmentMeta? = null,
    val merchant: String? = null,
    val note: String? = null,
    val productId: String? = null,
    val budgetId: String? = null,
    val goalId: String? = null,
    val recurringSeriesId: String? = null,
    val loanKind: LoanKind? = null,
    val counterpartyName: String? = null,
    val dueDate: String? = null,
    val loanSettled: Boolean = false,
    val settledByTransactionId: String? = null,
    // Set on a settlement transaction created by settleLoan — points back
    // at the original Lent/Borrowed row. A loan's paid-so-far amount is the
    // sum of every transaction whose parentLoanId equals its id.
    val parentLoanId: String? = null,
)

// No paymentMethod field — the backend derives it from the wallet
// (accountId), never from client input; see PaymentMethod's doc comment.
data class NewTransactionInput(
    val walletId: String,
    val transferToWalletId: String? = null,
    val description: String,
    val amount: Double,
    val type: TransactionType,
    val status: TransactionStatus = TransactionStatus.COMPLETED,
    val category: CategoryId?,
    val subcategoryId: CategoryId? = null,
    val date: String,
    val time: String? = null,
    val currency: String? = null,
    val merchant: String? = null,
    val note: String? = null,
    val productId: String? = null,
    val budgetId: String? = null,
    val customBudgetId: String? = null,
    val goalId: String? = null,
    val loanKind: LoanKind? = null,
    val counterpartyName: String? = null,
    val counterpartyKind: CounterpartyKind? = null,
    val dueDate: String? = null,
    val repeat: RepeatRule? = null,
)

// "Repetir" (NEW_MOVEMENT.md §5). occurrences counts this movement too.
data class RepeatRule(
    val interval: RecurrenceInterval,
    val occurrences: Int? = null,
    val endDate: String? = null,
    val autoConfirm: Boolean = false,
)

// A recurring definition ("Netflix, $45,000/month") — kept separate from
// any actual Transaction it produces (see backend/prisma/schema.prisma's
// RecurringSeries doc comment). Materializing an occurrence is an
// explicit action (RecurringSeriesRepository.confirmOccurrence), never
// automatic, so reopening the app never creates a duplicate.
data class RecurringSeries(
    val id: String,
    val name: String,
    val type: TransactionType, // INCOME or EXPENSE only
    val amount: Double,
    val walletId: String,
    val category: CategoryId,
    val subcategoryId: CategoryId? = null,
    val paymentMethod: PaymentMethod,
    val interval: RecurrenceInterval,
    val nextOccurrenceDate: String,
    val isDue: Boolean,
    val active: Boolean,
    val currency: String = "COP",
    val occurrences: Int? = null,
    val occurrencesDone: Int = 0,
    val endDate: String? = null,
    val autoConfirm: Boolean = false,
)

enum class BudgetKind { CATEGORY, CUSTOM }

enum class BudgetPeriod { MONTHLY, CUSTOM }

// PLANS.md §4. CATEGORY budgets count expenses in `category` ("Todas" when
// it's a parent) from `walletIds` (all when empty); CUSTOM ones count the
// movements assigned to them.
data class CategoryBudget(
    val id: String,
    val name: String? = null,
    val kind: BudgetKind = BudgetKind.CATEGORY,
    val category: CategoryId? = null,
    val icon: String? = null,
    val walletIds: List<String> = emptyList(),
    val period: BudgetPeriod = BudgetPeriod.MONTHLY,
    val startDate: String? = null,
    val endDate: String? = null,
    val limit: Double,
    val month: String, // YYYY-MM
    val assignedCount: Int = 0,
)

data class Goal(
    val id: String,
    val name: String,
    val targetAmount: Double,
    val currentAmount: Double,
    // Server-computed (see backend/src/routes/goals.ts's computeProgress) —
    // never recompute these client-side from currentAmount/targetAmount, or
    // they drift from the backend's own rounding (regression: GoalRepository
    // used to drop both fields entirely, forcing every call site to
    // recompute a truncated percentage itself).
    val remaining: Double = 0.0,
    val percentage: Int = 0,
    val targetDate: String? = null,
    // Plan icon key (PLAN_ICONS), suggested from the name.
    val icon: String = "other",
    val initialAmount: Double = 0.0,
    val plan: GoalPlan? = null,
    // walletId -> amount that wallet contributed (for "Devolver a su origen").
    val contributions: Map<String, Double> = emptyMap(),
)

enum class GoalPlanEnd { GOAL, COUNT, DATE }

// "Aporte periódico" (PLANS.md §3).
data class GoalPlan(
    val amount: Double,
    val frequency: RecurrenceInterval,
    val walletId: String,
    val startDate: String,
    val endMode: GoalPlanEnd = GoalPlanEnd.GOAL,
    val count: Int? = null,
    val endDate: String? = null,
    val autoConfirm: Boolean = false,
    val nextDate: String = startDate,
    val active: Boolean = true,
    val due: Boolean = false,
)

// healthy < 65 %, watch 65–89 %, at risk ≥ 90 %, exceeded > 100 %.
enum class BudgetStatus { ON_TRACK, NEAR_LIMIT, AT_RISK, OVER_BUDGET }

data class BudgetProgress(
    val budget: CategoryBudget,
    val spent: Double,
    val remaining: Double,
    val percentage: Int,
    val status: BudgetStatus,
)

data class Product(
    val barcode: String,
    val name: String,
    val brand: String,
    val category: CategoryId,
    val price: Double,
    val unit: String,
)

enum class Currency { COP, USD }

enum class AppLanguage { ES, EN }

data class UserPreferences(
    val darkTheme: Boolean,
    val notifications: Boolean,
    val biometricLogin: Boolean,
    // Home hides the total balance behind a blur until tapped; Settings'
    // "Difuminar el saldo total" switch controls this default state.
    val blurBalance: Boolean = false,
    // Minutes of inactivity before the app re-asks for the password (or
    // biometrics) — 0 means "Nunca" (auto-lock disabled). See
    // ui/components/AppLockGate.kt for the enforcement. Defaults to 0, not
    // the DB row's own default of 5, so a missing/not-yet-fetched value
    // never silently turns on a password gate for an account whose PASSWORD
    // credential the user (e.g. a Google-primary user) doesn't use day to
    // day.
    val autoLockMinutes: Int = 0,
    val currency: Currency = Currency.COP,
    val language: AppLanguage = AppLanguage.ES,
    // Mini-guides already dismissed, and "Omitir guías" (ONBOARDING.md §3).
    val guidesSeen: Set<String> = emptySet(),
    val guidesOff: Boolean = false,
)

data class User(
    val id: String,
    val name: String,
    val email: String,
    val phone: String? = null,
    val city: String? = null,
    // false for a Google-only account that hasn't set a password yet —
    // gates whether Settings shows "change password" or "create password".
    val hasPassword: Boolean,
    val avatarInitials: String,
    val memberSince: String,
    val preferences: UserPreferences,
    // Total balance, budgets and reports are shown in it.
    val principalCurrency: String = "COP",
    val onboardingCompleted: Boolean = true,
)

// One of the user's currencies (Ajustes › Monedas). rate = principal units
// per 1 unit of this currency.
data class UserCurrency(
    val code: String,
    val name: String,
    val symbol: String,
    val decimals: Int,
    val isPrincipal: Boolean,
    val rate: Double,
    val wallets: Int,
)

enum class NotificationTone { POSITIVE, WARNING, INFO }

data class AppNotification(
    val id: String,
    val title: String,
    val message: String,
    val time: String,
    val read: Boolean,
    val tone: NotificationTone,
)

// One actionable condition from the shared rule set (backend GET /alerts),
// in the backend's priority order. Feeds both Inicio's alert card and the
// bell sheet; copy is rendered by the UI (see ui/AlertCopy.kt). `id` is
// stable per condition, so read/dismissed state can be kept locally.
sealed interface AppAlert {
    val id: String

    data class SeriesDue(
        override val id: String,
        val seriesId: String,
        val name: String,
        val type: TransactionType,
        val amount: Double,
        val category: CategoryId,
        val dueDate: String,
        val overdue: Boolean,
    ) : AppAlert

    data class LoanOpen(
        override val id: String,
        val transactionId: String,
        val loanKind: LoanKind,
        val counterpartyName: String?,
        val outstanding: Double,
        val dueDate: String,
        val overdue: Boolean,
    ) : AppAlert

    data class BudgetAtRisk(
        override val id: String,
        val budgetId: String,
        val name: String?,
        val category: CategoryId,
        val spent: Double,
        val limit: Double,
        val percentage: Int,
    ) : AppAlert

    data class GoalNear(
        override val id: String,
        val goalId: String,
        val name: String,
        val icon: String,
        val percentage: Int,
        val remaining: Double,
    ) : AppAlert

    // "Aporte programado a <meta>" — Confirmar aporte / Omitir esta vez.
    data class GoalPlanDue(
        override val id: String,
        val goalId: String,
        val name: String,
        val icon: String,
        val amount: Double,
        val currency: String,
        val walletId: String,
        val dueDate: String,
    ) : AppAlert

    // A "Programado" movement dated in the next 7 days.
    data class TxPlanned(
        override val id: String,
        val transactionId: String,
        val name: String,
        val category: String,
        val amount: Double,
        val currency: String,
        val walletName: String,
        val dueDate: String,
    ) : AppAlert

    // "Aporte automático registrado".
    data class GoalPlanAuto(
        override val id: String,
        val goalId: String,
        val name: String,
        val icon: String,
        val amount: Double,
        val currency: String,
        val walletName: String,
        val date: String,
    ) : AppAlert
}

data class MonthlySummary(
    val month: String,
    val label: String,
    val income: Double,
    val expenses: Double,
) {
    val savings: Double get() = income - expenses
}

// Reportes (GET /summary/report): the range's totals against the range
// before it, the monthly bars and the current month's spending per
// category — the same figures Web's Reportes shows.
data class ReportTotals(val income: Double, val expenses: Double, val savings: Double, val savingsRate: Int)

data class ReportCategory(val category: CategoryId, val amount: Double)

data class Report(
    val range: Int,
    val months: List<MonthlySummary>,
    val totals: ReportTotals,
    val previousTotals: ReportTotals,
    val categories: List<ReportCategory>,
)
