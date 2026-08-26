package com.s2nova.app.data.remote

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

// One interface for every backend/src/routes/*.ts endpoint this app calls.
// The auth methods are also used, via an unauthenticated Retrofit instance,
// by ApiClient's Authenticator to refresh an expired access token — see
// ApiClient.kt.
interface ApiService {
    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): SessionResponse

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): SessionResponse

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): SessionResponse

    @POST("auth/logout")
    suspend fun logout(@Body body: RefreshRequest): Response<Unit>

    @POST("auth/google")
    suspend fun loginWithGoogle(@Body body: GoogleLoginRequest): SessionResponse

    @GET("me")
    suspend fun me(): MeResponse

    @PATCH("me")
    suspend fun updateProfile(@Body body: UpdateProfileRequest): MeResponse

    @POST("me/password")
    suspend fun changePassword(@Body body: ChangePasswordRequest): Response<Unit>

    @PATCH("me/preferences")
    suspend fun updatePreferences(@Body body: UpdatePreferencesRequest): MeResponse

    @GET("accounts")
    suspend fun getAccounts(): List<AccountDto>

    @POST("accounts")
    suspend fun createAccount(@Body body: CreateAccountRequest): AccountDto

    @PATCH("accounts/{id}")
    suspend fun updateAccount(@Path("id") id: String, @Body body: UpdateAccountRequest): AccountDto

    @GET("categories")
    suspend fun getCategories(): List<CategoryDto>

    // No server-side filters wired up here — this app fetches the full list
    // and filters client-side, same as the mock repository it replaced.
    @GET("transactions")
    suspend fun getTransactions(@Query("limit") limit: Int = 200): List<TransactionDto>

    @POST("transactions")
    suspend fun createTransaction(@Body body: CreateTransactionRequest): TransactionDto

    @PATCH("transactions/{id}")
    suspend fun updateTransaction(@Path("id") id: String, @Body body: UpdateTransactionRequest): TransactionDto

    @DELETE("transactions/{id}")
    suspend fun deleteTransaction(@Path("id") id: String): Response<Unit>

    @POST("transactions/{id}/settle-loan")
    suspend fun settleLoan(@Path("id") id: String, @Body body: SettleLoanRequest): SettleLoanResponse

    @GET("recurring-series")
    suspend fun getRecurringSeries(): List<RecurringSeriesDto>

    @POST("recurring-series")
    suspend fun createRecurringSeries(@Body body: CreateRecurringSeriesRequest): RecurringSeriesDto

    @PATCH("recurring-series/{id}")
    suspend fun updateRecurringSeries(@Path("id") id: String, @Body body: UpdateRecurringSeriesRequest): RecurringSeriesDto

    @DELETE("recurring-series/{id}")
    suspend fun deleteRecurringSeries(@Path("id") id: String): Response<Unit>

    @POST("recurring-series/{id}/confirm")
    suspend fun confirmRecurringOccurrence(
        @Path("id") id: String,
        @Body body: ConfirmRecurringOccurrenceRequest,
    ): ConfirmRecurringOccurrenceResponse

    @GET("budgets")
    suspend fun getBudgets(@Query("month") month: String? = null): List<BudgetDto>

    @POST("budgets")
    suspend fun createBudget(@Body body: CreateBudgetRequest): BudgetDto

    @PATCH("budgets/{id}")
    suspend fun updateBudget(@Path("id") id: String, @Body body: UpdateBudgetRequest): BudgetDto

    @POST("budgets/recommendations")
    suspend fun createBudgetRecommendation(@Body body: BudgetRecommendationRequest): BudgetRecommendationResponse

    @POST("budgets/recommendations/{id}/accept")
    suspend fun acceptBudgetRecommendation(@Path("id") id: String): AcceptRecommendationResponse

    @GET("goals")
    suspend fun getGoals(): List<GoalDto>

    @POST("goals")
    suspend fun createGoal(@Body body: CreateGoalRequest): GoalDto

    @PATCH("goals/{id}")
    suspend fun updateGoal(@Path("id") id: String, @Body body: UpdateGoalRequest): GoalDto

    @DELETE("goals/{id}")
    suspend fun deleteGoal(@Path("id") id: String): Response<Unit>
}
