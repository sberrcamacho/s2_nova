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
    val blurBalance: Boolean = false,
    // Defaults to 0 ("Nunca"), not the DB's own default of 5, because this
    // default only ever kicks in when the field is absent from the /me
    // response — i.e. a backend deployed before this preference existed.
    // Defaulting to "locked every 5 minutes" would silently turn on a
    // password gate nobody asked for, for any account that has a PASSWORD
    // identity (including Google users who added one), using a credential
    // they likely never use day to day.
    val autoLockMinutes: Int = 0,
    val onboardingCompleted: Boolean,
    val tutorialCompleted: Boolean,
)

@Serializable
data class MeResponse(
    val id: String,
    val name: String,
    val email: String,
    val phone: String? = null,
    val city: String? = null,
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
    val blurBalance: Boolean? = null,
    val autoLockMinutes: Int? = null,
    val onboardingCompleted: Boolean? = null,
    val tutorialCompleted: Boolean? = null,
)

// The account model is deliberately minimal — name, email, phone, city,
// password/Google login only (see ARCHITECTURE.md's account-fields
// decision). Editing name or email requires currentPassword (see
// backend/src/routes/me.ts) except for a Google-only user renaming
// themselves, who has no password to prove yet; phone/city need no
// password since they aren't identity fields.
@Serializable
data class UpdateProfileRequest(
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val city: String? = null,
    val currentPassword: String? = null,
)

// A standalone re-auth check for the auto-lock overlay — never rotates
// tokens or mutates the account.
@Serializable
data class VerifyPasswordRequest(val password: String)

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
data class DeleteAccountRequest(val reassignToAccountId: String)

@Serializable
data class CategoryDto(
    val id: String,
    val slug: String,
    val name: String,
    val icon: String,
    val color: String,
    val kind: String,
    val parentId: String? = null,
)

@Serializable
data class TransactionDto(
    val id: String,
    val accountId: String,
    val transferToAccountId: String? = null,
    val type: String,
    val status: String,
    val amount: Long,
    val categoryId: String,
    val subcategoryId: String? = null,
    val productId: String? = null,
    val budgetId: String? = null,
    val goalId: String? = null,
    val recurringSeriesId: String? = null,
    val loanKind: String? = null,
    val counterpartyName: String? = null,
    val dueDate: String? = null,
    val loanSettledAt: String? = null,
    val settledByTransactionId: String? = null,
    val parentLoanId: String? = null,
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
    val subcategoryId: String? = null,
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
    val subcategoryId: String? = null,
    val budgetId: String? = null,
    val goalId: String? = null,
    val status: String? = null,
    // Loan edits only — see backend/src/routes/transactions.ts's PATCH
    // handler doc comment.
    val accountId: String? = null,
    val loanKind: String? = null,
    val counterpartyName: String? = null,
    val dueDate: String? = null,
    val description: String? = null,
    val merchant: String? = null,
    val note: String? = null,
    val date: String? = null,
)

// amount is optional — omitted (or equal to the outstanding balance) fully
// settles the loan; a lower amount records a partial payment instead (see
// backend/src/routes/transactions.ts's settle-loan route). accountId lets
// the repayment land in a different wallet than the original loan's.
@Serializable
data class SettleLoanRequest(val date: String? = null, val amount: Long? = null, val accountId: String? = null)

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
data class UpdateRecurringSeriesRequest(
    val name: String? = null,
    val type: String? = null,
    val amount: Long? = null,
    val accountId: String? = null,
    val categoryId: String? = null,
    val interval: String? = null,
    val nextOccurrenceDate: String? = null,
    val active: Boolean? = null,
)

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
    val themeIcon: String? = null,
    val month: String,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class CreateBudgetRequest(
    val name: String? = null,
    val categoryId: String,
    val amount: Long,
    val month: String? = null,
    val themeIcon: String? = null,
)

@Serializable
data class UpdateBudgetRequest(val name: String? = null, val amount: Long? = null, val categoryId: String? = null, val themeIcon: String? = null)

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
    val themeIcon: String? = null,
    val contributions: List<GoalContributionDto> = emptyList(),
    val targetDate: String? = null,
    val createdAt: String,
    val updatedAt: String,
)

// What one wallet has put into a goal (GET /goals `contributions`).
@Serializable
data class GoalContributionDto(val accountId: String, val amount: Long)

@Serializable
data class CreateGoalRequest(
    val name: String,
    val targetAmount: Long,
    val targetDate: String? = null,
    val themeIcon: String? = null,
)

@Serializable
data class UpdateGoalRequest(
    val name: String? = null,
    val targetAmount: Long? = null,
    val targetDate: String? = null,
    val themeIcon: String? = null,
)

@Serializable
// Either one destination wallet, or returnToOrigin = every contributing
// wallet gets its own share back.
data class DeleteGoalRequest(val returnToAccountId: String? = null, val returnToOrigin: Boolean? = null)

// GET /summary/months — COMPLETED income/expense per month, oldest first,
// current month last (see backend/src/routes/summary.ts).
@Serializable
data class MonthSummaryDto(
    val month: String,
    val income: Long,
    val expenses: Long,
    val net: Long,
)

// GET /summary/report — the fields Android's Reportes shows; the rest
// (Web's tiles, income sources, Patrimonio) is ignored.
@Serializable
data class ReportTotalsDto(val income: Long, val expenses: Long, val savings: Long, val savingsRate: Int)

@Serializable
data class ReportCategoryDto(val categoryId: String, val amount: Long)

@Serializable
data class ReportDto(
    val range: Int,
    val months: List<MonthSummaryDto>,
    val totals: ReportTotalsDto,
    val previousTotals: ReportTotalsDto,
    val categories: List<ReportCategoryDto>,
)

// GET /alerts — one flat shape for the four alert kinds the backend emits
// (backend/src/routes/alerts.ts); which optional fields are set depends on
// `kind`. UI copy is built client-side from these fields (i18n).
@Serializable
data class AlertDto(
    val id: String,
    val kind: String,
    // SERIES_DUE
    val seriesId: String? = null,
    val type: String? = null,
    val amount: Long? = null,
    // SERIES_DUE, BUDGET_AT_RISK
    val categoryId: String? = null,
    // SERIES_DUE, BUDGET_AT_RISK, GOAL_NEAR
    val name: String? = null,
    // SERIES_DUE, LOAN_OPEN
    val dueDate: String? = null,
    val overdue: Boolean = false,
    // LOAN_OPEN
    val transactionId: String? = null,
    val loanKind: String? = null,
    val counterpartyName: String? = null,
    val outstanding: Long? = null,
    // BUDGET_AT_RISK
    val budgetId: String? = null,
    val spent: Long? = null,
    // BUDGET_AT_RISK, GOAL_NEAR
    val percentage: Int? = null,
    // GOAL_NEAR
    val goalId: String? = null,
    val themeIcon: String? = null,
    val remaining: Long? = null,
)
