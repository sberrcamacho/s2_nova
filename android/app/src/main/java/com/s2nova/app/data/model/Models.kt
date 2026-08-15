package com.s2nova.app.data.model

enum class TransactionType { INCOME, EXPENSE }

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
    val description: String,
    val amount: Double,
    val type: TransactionType,
    val category: CategoryId,
    val date: String, // ISO yyyy-MM-dd
    val paymentMethod: PaymentMethod,
    val merchant: String? = null,
    val note: String? = null,
    val productId: String? = null,
)

data class NewTransactionInput(
    val description: String,
    val amount: Double,
    val type: TransactionType,
    val category: CategoryId,
    val date: String,
    val paymentMethod: PaymentMethod,
    val merchant: String? = null,
    val note: String? = null,
    val productId: String? = null,
)

data class CategoryBudget(
    val id: String,
    val category: CategoryId,
    val limit: Double,
    val month: String, // YYYY-MM
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

data class UserPreferences(
    val darkTheme: Boolean,
    val notifications: Boolean,
    val biometricLogin: Boolean,
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
