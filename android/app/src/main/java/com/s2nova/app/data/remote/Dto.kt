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
    val guidesSeen: List<String> = emptyList(),
    val guidesOff: Boolean = false,
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
    val principalCurrency: String = "COP",
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
    val guidesSeen: List<String>? = null,
    val guidesOff: Boolean? = null,
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
    val currency: String = "COP",
    val initialBalance: Double,
    val currentBalance: Double,
    val principalBalance: Double? = null,
    val movements: Int? = null,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class CreateAccountRequest(val name: String, val type: String, val initialBalance: Double, val currency: String? = null)

@Serializable
data class UpdateAccountRequest(val name: String? = null, val type: String? = null)

@Serializable
data class DeleteAccountRequest(val reassignToAccountId: String? = null)

@Serializable
data class CategoryDto(
    val id: String,
    val slug: String,
    val name: String,
    val icon: String,
    val color: String,
    val kind: String,
    val parentId: String? = null,
    val defaultName: String? = null,
    val isCustom: Boolean = false,
    val hidden: Boolean = false,
    val usage: Int = 0,
)

@Serializable
data class CreateCategoryRequest(val type: String, val parentId: String? = null, val name: String, val icon: String? = null)

@Serializable
data class UpdateCategoryRequest(val name: String? = null, val icon: String? = null, val hidden: Boolean? = null)

@Serializable
data class AttachmentDto(val id: String, val kind: String, val mime: String, val name: String, val size: Long, val createdAt: String)

@Serializable
data class UploadAttachmentRequest(val name: String, val mime: String, val data: String)

@Serializable
data class RepeatDto(val interval: String, val occurrences: Int? = null, val endDate: String? = null, val autoConfirm: Boolean = false)

@Serializable
data class TransactionDto(
    val id: String,
    val accountId: String,
    val transferToAccountId: String? = null,
    val type: String,
    val status: String,
    val amount: Double,
    val currency: String = "COP",
    val fxRate: Double? = null,
    val walletAmount: Double? = null,
    val categoryId: String,
    val subcategoryId: String? = null,
    val productId: String? = null,
    val budgetId: String? = null,
    val customBudgetId: String? = null,
    val goalId: String? = null,
    val recurringSeriesId: String? = null,
    val loanKind: String? = null,
    val counterpartyName: String? = null,
    val counterpartyKind: String? = null,
    val dueDate: String? = null,
    val loanSettledAt: String? = null,
    val settledByTransactionId: String? = null,
    val parentLoanId: String? = null,
    val paymentMethod: String,
    val description: String,
    val merchant: String? = null,
    val note: String? = null,
    val date: String,
    val occurredAt: String? = null,
    val attachment: AttachmentDto? = null,
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
    val status: String? = null,
    val amount: Double,
    val currency: String? = null,
    val categoryId: String? = null,
    val subcategoryId: String? = null,
    val productId: String? = null,
    val budgetId: String? = null,
    val customBudgetId: String? = null,
    val goalId: String? = null,
    val loanKind: String? = null,
    val counterpartyName: String? = null,
    val counterpartyKind: String? = null,
    val dueDate: String? = null,
    val description: String = "",
    val merchant: String? = null,
    val note: String? = null,
    val date: String,
    val time: String? = null,
    val repeat: RepeatDto? = null,
)

@Serializable
data class UpdateTransactionRequest(
    val amount: Double? = null,
    val currency: String? = null,
    val customBudgetId: String? = null,
    val counterpartyKind: String? = null,
    val time: String? = null,
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
data class SettleLoanRequest(val date: String? = null, val amount: Double? = null, val accountId: String? = null)

@Serializable
data class SettleLoanResponse(val original: TransactionDto, val settlement: TransactionDto)

@Serializable
data class RecurringSeriesDto(
    val id: String,
    val name: String,
    val type: String,
    val amount: Double,
    val currency: String = "COP",
    val accountId: String,
    val categoryId: String,
    val subcategoryId: String? = null,
    val paymentMethod: String,
    val interval: String,
    val nextOccurrenceDate: String,
    val occurrences: Int? = null,
    val occurrencesDone: Int = 0,
    val endDate: String? = null,
    val autoConfirm: Boolean = false,
    val isDue: Boolean,
    val active: Boolean,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class CreateRecurringSeriesRequest(
    val name: String,
    val type: String,
    val amount: Double,
    val accountId: String,
    val categoryId: String,
    val subcategoryId: String? = null,
    val interval: String,
    val startDate: String,
)

@Serializable
data class UpdateRecurringSeriesRequest(
    val name: String? = null,
    val type: String? = null,
    val amount: Double? = null,
    val accountId: String? = null,
    val categoryId: String? = null,
    val subcategoryId: String? = null,
    val interval: String? = null,
    val nextOccurrenceDate: String? = null,
    val active: Boolean? = null,
)

@Serializable
data class ConfirmRecurringOccurrenceRequest(val date: String? = null, val amount: Double? = null)

@Serializable
data class ConfirmRecurringOccurrenceResponse(val series: RecurringSeriesDto, val transaction: RecurringOccurrenceTransactionDto)

@Serializable
data class RecurringOccurrenceTransactionDto(
    val id: String,
    val accountId: String,
    val type: String,
    val amount: Double,
    val categoryId: String,
    val description: String,
    val date: String,
)

@Serializable
data class BudgetDto(
    val id: String,
    val name: String? = null,
    val kind: String = "CATEGORY",
    val categoryId: String? = null,
    val icon: String? = null,
    val walletIds: List<String> = emptyList(),
    val period: String = "MONTHLY",
    val startDate: String? = null,
    val endDate: String? = null,
    val amount: Double,
    val spent: Double,
    val remaining: Double,
    val percentage: Int,
    val status: String,
    val assignedCount: Int? = null,
    val month: String,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class CreateBudgetRequest(
    val kind: String = "CATEGORY",
    val name: String? = null,
    val categoryId: String? = null,
    val icon: String? = null,
    val walletIds: List<String>? = null,
    val amount: Double,
    val period: String = "MONTHLY",
    val month: String? = null,
    val startDate: String? = null,
    val endDate: String? = null,
)

@Serializable
data class UpdateBudgetRequest(
    val name: String? = null,
    val amount: Double? = null,
    val categoryId: String? = null,
    val icon: String? = null,
    val walletIds: List<String>? = null,
    val period: String? = null,
    val startDate: String? = null,
    val endDate: String? = null,
)

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
    val icon: String = "other",
    val targetAmount: Double,
    val initialAmount: Double = 0.0,
    val currentAmount: Double,
    val remaining: Double,
    val percentage: Int,
    val plan: GoalPlanDto? = null,
    val contributions: List<GoalContributionDto> = emptyList(),
    val targetDate: String? = null,
    val createdAt: String,
    val updatedAt: String,
)

// What one wallet has put into a goal (GET /goals `contributions`).
@Serializable
data class GoalContributionDto(val accountId: String, val amount: Double)

@Serializable
data class GoalPlanDto(
    val amount: Double,
    val frequency: String,
    val accountId: String,
    val startDate: String,
    val endMode: String = "GOAL",
    val count: Int? = null,
    val endDate: String? = null,
    val autoConfirm: Boolean = false,
    val nextDate: String,
    val active: Boolean = true,
    val due: Boolean = false,
)

@Serializable
data class GoalPlanRequest(
    val amount: Double,
    val frequency: String,
    val accountId: String,
    val startDate: String,
    val endMode: String,
    val count: Int? = null,
    val endDate: String? = null,
    val autoConfirm: Boolean,
)

@Serializable
data class GoalContributeRequest(val amount: Double, val accountId: String, val date: String? = null)

@Serializable
data class CreateGoalRequest(
    val name: String,
    val icon: String? = null,
    val targetAmount: Double,
    val initialAmount: Double? = null,
    val targetDate: String? = null,
)

@Serializable
data class UpdateGoalRequest(
    val name: String? = null,
    val icon: String? = null,
    val targetAmount: Double? = null,
    val initialAmount: Double? = null,
    val targetDate: String? = null,
)

@Serializable
data class CurrencyDto(
    val code: String,
    val name: String,
    val symbol: String,
    val decimals: Int,
    val isPrincipal: Boolean = false,
    val rate: Double,
    val wallets: Int = 0,
)

@Serializable
data class CurrencyCodeRequest(val code: String)

@Serializable
// Either one destination wallet, or returnToOrigin = every contributing
// wallet gets its own share back.
data class DeleteGoalRequest(val returnToAccountId: String? = null, val returnToOrigin: Boolean? = null)

// GET /summary/months — COMPLETED income/expense per month, oldest first,
// current month last (see backend/src/routes/summary.ts).
@Serializable
data class MonthSummaryDto(
    val month: String,
    val income: Double,
    val expenses: Double,
    val net: Double,
)

// GET /summary/report — the fields Android's Reportes shows; the rest
// (Web's tiles, income sources, Patrimonio) is ignored.
@Serializable
data class ReportTotalsDto(val income: Double, val expenses: Double, val savings: Double, val savingsRate: Int)

@Serializable
data class ReportCategoryDto(val categoryId: String, val amount: Double)

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
    val amount: Double? = null,
    val currency: String? = null,
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
    val outstanding: Double? = null,
    // BUDGET_AT_RISK
    val budgetId: String? = null,
    val spent: Double? = null,
    // BUDGET_AT_RISK, GOAL_NEAR
    val percentage: Int? = null,
    // GOAL_NEAR
    val goalId: String? = null,
    val icon: String? = null,
    val remaining: Double? = null,
    // GOAL_PLAN_DUE, GOAL_PLAN_AUTO
    val accountId: String? = null,
    val walletName: String? = null,
    val date: String? = null,
)
