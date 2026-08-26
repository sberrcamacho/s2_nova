package com.s2nova.app.data.remote

import kotlinx.serialization.Serializable

// Wire shapes for backend/src/routes/*.ts — kept 1:1 with the JSON those
// routes actually return/accept (see ARCHITECTURE.md §5). Field names are
// already camelCase on the wire, so no @SerialName mapping is needed.

@Serializable
data class RegisterRequest(val name: String, val email: String, val password: String)

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class RefreshRequest(val refreshToken: String? = null)

@Serializable
data class GoogleLoginRequest(val idToken: String)

@Serializable
data class UserDto(val id: String, val name: String, val email: String)

@Serializable
data class SessionResponse(val accessToken: String, val refreshToken: String? = null, val user: UserDto)

@Serializable
data class MePreferencesDto(
    val language: String,
    val currency: String,
    val theme: String,
    val notifications: Boolean,
    val biometricLogin: Boolean,
    val onboardingCompleted: Boolean,
    val tutorialCompleted: Boolean,
)

@Serializable
data class MeResponse(
    val id: String,
    val name: String,
    val email: String,
    val createdAt: String,
    val hasPassword: Boolean = false,
    val preferences: MePreferencesDto? = null,
)

@Serializable
data class UpdatePreferencesRequest(
    val language: String? = null,
    val currency: String? = null,
    val theme: String? = null,
    val notifications: Boolean? = null,
    val biometricLogin: Boolean? = null,
    val onboardingCompleted: Boolean? = null,
    val tutorialCompleted: Boolean? = null,
)

// The account model is deliberately minimal — name, email, password/Google
// login only (see ARCHITECTURE.md's account-fields decision). Editing name
// or email requires currentPassword (see backend/src/routes/me.ts) except
// for a Google-only user renaming themselves, who has no password to prove
// yet.
@Serializable
data class UpdateProfileRequest(
    val name: String? = null,
    val email: String? = null,
    val currentPassword: String? = null,
)

// currentPassword is omitted (null) only when the user has no PASSWORD
// identity yet (Google-only account setting a password for the first
// time) — see backend/src/routes/me.ts's POST /me/password.
@Serializable
data class ChangePasswordRequest(
    val currentPassword: String? = null,
    val newPassword: String,
)

@Serializable
data class AccountDto(
    val id: String,
    val name: String,
    val type: String,
    val initialBalance: Long,
    val currentBalance: Long,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class CreateAccountRequest(val name: String, val type: String, val initialBalance: Long)

@Serializable
data class UpdateAccountRequest(val name: String? = null, val type: String? = null)

@Serializable
data class CategoryDto(val id: String, val slug: String, val name: String, val icon: String, val color: String, val kind: String)

@Serializable
data class TransactionDto(
    val id: String,
    val accountId: String,
    val transferToAccountId: String? = null,
    val type: String,
    val status: String,
    val amount: Long,
    val categoryId: String,
    val productId: String? = null,
    val budgetId: String? = null,
    val goalId: String? = null,
    val recurringSeriesId: String? = null,
    val loanKind: String? = null,
    val counterpartyName: String? = null,
    val dueDate: String? = null,
    val loanSettledAt: String? = null,
    val settledByTransactionId: String? = null,
    val paymentMethod: String,
    val description: String,
    val merchant: String? = null,
    val note: String? = null,
    val date: String,
    val createdAt: String,
    val updatedAt: String,
)

// No paymentMethod field — the backend derives it from accountId's wallet
// type (see backend/src/routes/transactions.ts's paymentMethodForAccountType),
// never from the client. TransactionDto still carries the derived value on
// reads.
@Serializable
data class CreateTransactionRequest(
    val accountId: String,
    val transferToAccountId: String? = null,
    val type: String,
    val status: String = "COMPLETED",
    val amount: Long,
    val categoryId: String,
    val productId: String? = null,
    val budgetId: String? = null,
    val goalId: String? = null,
    val loanKind: String? = null,
    val counterpartyName: String? = null,
    val dueDate: String? = null,
    val description: String,
    val merchant: String? = null,
    val note: String? = null,
    val date: String,
)

@Serializable
data class UpdateTransactionRequest(
    val amount: Long? = null,
    val categoryId: String? = null,
    val budgetId: String? = null,
    val goalId: String? = null,
    val status: String? = null,
    val description: String? = null,
    val merchant: String? = null,
    val note: String? = null,
    val date: String? = null,
)

@Serializable
data class SettleLoanRequest(val date: String? = null)

@Serializable
data class SettleLoanResponse(val original: TransactionDto, val settlement: TransactionDto)

@Serializable
data class RecurringSeriesDto(
    val id: String,
    val name: String,
    val type: String,
    val amount: Long,
    val accountId: String,
    val categoryId: String,
    val paymentMethod: String,
    val interval: String,
    val nextOccurrenceDate: String,
    val isDue: Boolean,
    val active: Boolean,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class CreateRecurringSeriesRequest(
    val name: String,
    val type: String,
    val amount: Long,
    val accountId: String,
    val categoryId: String,
    val interval: String,
    val startDate: String,
)

@Serializable
data class UpdateRecurringSeriesRequest(val name: String? = null, val amount: Long? = null, val active: Boolean? = null)

@Serializable
data class ConfirmRecurringOccurrenceRequest(val date: String? = null, val amount: Long? = null)

@Serializable
data class ConfirmRecurringOccurrenceResponse(val series: RecurringSeriesDto, val transaction: RecurringOccurrenceTransactionDto)

@Serializable
data class RecurringOccurrenceTransactionDto(
    val id: String,
    val accountId: String,
    val type: String,
    val amount: Long,
    val categoryId: String,
    val description: String,
    val date: String,
)

@Serializable
data class BudgetDto(
    val id: String,
    val name: String? = null,
    val categoryId: String,
    val amount: Long,
    val spent: Long,
    val remaining: Long,
    val percentage: Int,
    val status: String,
    val month: String,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class CreateBudgetRequest(val name: String? = null, val categoryId: String, val amount: Long, val month: String? = null)

@Serializable
data class UpdateBudgetRequest(val name: String? = null, val amount: Long? = null)

@Serializable
data class BudgetRecommendationRequest(
    val monthlyIncome: Long,
    val needsPct: Double = 50.0,
    val wantsPct: Double = 30.0,
    val savingsPct: Double = 20.0,
)

@Serializable
data class BudgetRecommendationResponse(
    val id: String,
    val strategy: String,
    val needsPct: String,
    val wantsPct: String,
    val savingsPct: String,
    val basedOnIncome: Long,
    val needsAmount: Long,
    val wantsAmount: Long,
    val savingsAmount: Long,
    val acceptedAt: String? = null,
    val createdAt: String,
)

@Serializable
data class AcceptRecommendationResponse(val id: String, val acceptedAt: String? = null)

@Serializable
data class GoalDto(
    val id: String,
    val name: String,
    val targetAmount: Long,
    val currentAmount: Long,
    val remaining: Long,
    val percentage: Int,
    val targetDate: String? = null,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class CreateGoalRequest(val name: String, val targetAmount: Long, val targetDate: String? = null)

@Serializable
data class UpdateGoalRequest(val name: String? = null, val targetAmount: Long? = null, val targetDate: String? = null)
