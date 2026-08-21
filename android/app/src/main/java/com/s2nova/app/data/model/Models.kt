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
enum class RecurrenceInterval { WEEKLY, MONTHLY, YEARLY }

// Set only on transactions representing money lent to, or borrowed from,
// someone else — tracked as outstanding until settled.
enum class LoanKind { LENT, BORROWED }

enum class WalletType { CASH, BANK, SAVINGS, CRYPTO, OTHER }

data class Wallet(
    val id: String,
    val name: String,
    val type: WalletType,
    val initialBalance: Double,
    val currentBalance: Double,
)

enum class CategoryId {
    FOOD, TRANSPORTATION, SHOPPING, HEALTH, EDUCATION, ENTERTAINMENT,
    BILLS, SUBSCRIPTIONS, SALARY, FREELANCE, OTHER,
}

enum class PaymentMethod { CASH, DEBIT_CARD, CREDIT_CARD, BANK_TRANSFER, NEQUI, DAVIPLATA }

data class Category(
    val id: CategoryId,
    val label: String,
    val icon: String,
    val color: Long,
    val isExpense: Boolean,
    val isIncome: Boolean,
)

data class PaymentMethodOption(val id: PaymentMethod, val label: String)

data class Transaction(
    val id: String,
    val walletId: String,
    val transferToWalletId: String? = null,
    val description: String,
    val amount: Double,
    val type: TransactionType,
    val status: TransactionStatus = TransactionStatus.COMPLETED,
    val category: CategoryId,
    val date: String, // ISO yyyy-MM-dd
    val paymentMethod: PaymentMethod,
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
)

data class NewTransactionInput(
    val walletId: String,
    val transferToWalletId: String? = null,
    val description: String,
    val amount: Double,
    val type: TransactionType,
    val status: TransactionStatus = TransactionStatus.COMPLETED,
    val category: CategoryId,
    val date: String,
    val paymentMethod: PaymentMethod,
    val merchant: String? = null,
    val note: String? = null,
    val productId: String? = null,
    val budgetId: String? = null,
    val goalId: String? = null,
    val loanKind: LoanKind? = null,
    val counterpartyName: String? = null,
    val dueDate: String? = null,
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
    val paymentMethod: PaymentMethod,
    val interval: RecurrenceInterval,
    val nextOccurrenceDate: String,
    val isDue: Boolean,
    val active: Boolean,
)

data class CategoryBudget(
    val id: String,
    val name: String? = null,
    val category: CategoryId,
    val limit: Double,
    val month: String, // YYYY-MM
)

data class Goal(
    val id: String,
    val name: String,
    val targetAmount: Double,
    val currentAmount: Double,
    val targetDate: String? = null,
)

enum class BudgetStatus { ON_TRACK, NEAR_LIMIT, OVER_BUDGET }

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
    val currency: Currency = Currency.COP,
    val language: AppLanguage = AppLanguage.ES,
)

data class User(
    val id: String,
    val name: String,
    val email: String,
    val phone: String,
    val city: String,
    val avatarInitials: String,
    val memberSince: String,
    val preferences: UserPreferences,
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

data class MonthlySummary(
    val month: String,
    val label: String,
    val income: Double,
    val expenses: Double,
) {
    val savings: Double get() = income - expenses
}
