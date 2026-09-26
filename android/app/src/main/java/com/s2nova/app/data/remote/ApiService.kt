package com.s2nova.app.data.remote

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.HTTP
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.PUT
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

    @POST("me/verify-password")
    suspend fun verifyPassword(@Body body: VerifyPasswordRequest): Response<Unit>

    @PATCH("me/preferences")
    suspend fun updatePreferences(@Body body: UpdatePreferencesRequest): MeResponse

    @GET("accounts")
    suspend fun getAccounts(): List<AccountDto>

    @POST("accounts")
    suspend fun createAccount(@Body body: CreateAccountRequest): AccountDto

    @PATCH("accounts/{id}")
    suspend fun updateAccount(@Path("id") id: String, @Body body: UpdateAccountRequest): AccountDto

    @HTTP(method = "DELETE", path = "accounts/{id}", hasBody = true)
    suspend fun deleteAccount(@Path("id") id: String, @Body body: DeleteAccountRequest): Response<Unit>

    @GET("categories")
    suspend fun getCategories(): List<CategoryDto>

    @POST("categories")
    suspend fun createCategory(@Body body: CreateCategoryRequest): CategoryDto

    @PATCH("categories/{id}")
    suspend fun updateCategory(@Path("id") id: String, @Body body: UpdateCategoryRequest): CategoryDto

    @DELETE("categories/{id}")
    suspend fun deleteCategory(@Path("id") id: String): Response<Unit>

    @GET("me/currencies")
    suspend fun getMyCurrencies(): List<CurrencyDto>

    // "+ Agregar moneda" catalog.
    @GET("currencies")
    suspend fun getCurrencyCatalog(): List<CurrencyDto>

    @POST("me/currencies")
    suspend fun addCurrency(@Body body: CurrencyCodeRequest): List<CurrencyDto>

    @DELETE("me/currencies/{code}")
    suspend fun removeCurrency(@Path("code") code: String): List<CurrencyDto>

    @PUT("me/currencies/principal")
    suspend fun setPrincipalCurrency(@Body body: CurrencyCodeRequest): List<CurrencyDto>

    // No server-side filters wired up here — this app fetches the full list
    // and filters client-side, same as the mock repository it replaced.
    @GET("transactions")
    suspend fun getTransactions(@Query("limit") limit: Int = 200): List<TransactionDto>

    @POST("transactions")
    suspend fun createTransaction(@Body body: CreateTransactionRequest): TransactionDto

    @PATCH("transactions/{id}")
    suspend fun updateTransaction(@Path("id") id: String, @Body body: UpdateTransactionRequest): TransactionDto

    // series=delete also stops the movement's future repetitions.
    @DELETE("transactions/{id}")
    suspend fun deleteTransaction(@Path("id") id: String, @Query("series") series: String? = null): Response<Unit>

    @PUT("transactions/{id}/attachment")
    suspend fun uploadAttachment(@Path("id") id: String, @Body body: UploadAttachmentRequest): AttachmentDto

    @GET("transactions/{id}/attachment")
    suspend fun downloadAttachment(@Path("id") id: String): okhttp3.ResponseBody

    @DELETE("transactions/{id}/attachment")
    suspend fun deleteAttachment(@Path("id") id: String): Response<Unit>

    @POST("transactions/{id}/settle-loan")
    suspend fun settleLoan(@Path("id") id: String, @Body body: SettleLoanRequest): SettleLoanResponse

    @GET("recurring-series")
    suspend fun getRecurringSeries(@Query("today") today: String? = null): List<RecurringSeriesDto>

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

    // Advances the series to its next occurrence without creating a
    // Transaction ("Omitir esta vez"); the backend owns the date rule.
    @POST("recurring-series/{id}/skip")
    suspend fun skipRecurringOccurrence(@Path("id") id: String): RecurringSeriesDto

    @GET("budgets")
    suspend fun getBudgets(@Query("month") month: String? = null): List<BudgetDto>

    @POST("budgets")
    suspend fun createBudget(@Body body: CreateBudgetRequest): BudgetDto

    @PATCH("budgets/{id}")
    suspend fun updateBudget(@Path("id") id: String, @Body body: UpdateBudgetRequest): BudgetDto

    @DELETE("budgets/{id}")
    suspend fun deleteBudget(@Path("id") id: String): Response<Unit>

    @POST("budgets/recommendations")
    suspend fun createBudgetRecommendation(@Body body: BudgetRecommendationRequest): BudgetRecommendationResponse

    @POST("budgets/recommendations/{id}/accept")
    suspend fun acceptBudgetRecommendation(@Path("id") id: String): AcceptRecommendationResponse

    @GET("goals")
    suspend fun getGoals(@Query("today") today: String? = null): List<GoalDto>

    @POST("goals/{id}/contribute")
    suspend fun contributeToGoal(@Path("id") id: String, @Body body: GoalContributeRequest): GoalDto

    @PUT("goals/{id}/plan")
    suspend fun setGoalPlan(@Path("id") id: String, @Body body: GoalPlanRequest): GoalDto

    @DELETE("goals/{id}/plan")
    suspend fun removeGoalPlan(@Path("id") id: String): GoalDto

    @POST("goals/{id}/plan/confirm")
    suspend fun confirmGoalPlan(@Path("id") id: String, @Body body: Map<String, Double> = emptyMap()): GoalDto

    @POST("goals/{id}/plan/skip")
    suspend fun skipGoalPlan(@Path("id") id: String, @Body body: Map<String, String> = emptyMap()): GoalDto

    @POST("goals")
    suspend fun createGoal(@Body body: CreateGoalRequest): GoalDto

    @PATCH("goals/{id}")
    suspend fun updateGoal(@Path("id") id: String, @Body body: UpdateGoalRequest): GoalDto

    // Retrofit's @DELETE can't carry a body; the destination wallet(s) go in one.
    @HTTP(method = "DELETE", path = "goals/{id}", hasBody = true)
    suspend fun deleteGoal(@Path("id") id: String, @Body body: DeleteGoalRequest): Response<Unit>

    @GET("summary/months")
    suspend fun getMonthSummaries(
        @Query("count") count: Int,
        @Query("today") today: String,
    ): List<MonthSummaryDto>

    @GET("summary/report")
    suspend fun getReport(
        @Query("range") range: Int,
        @Query("today") today: String,
    ): ReportDto

    @GET("alerts")
    suspend fun getAlerts(@Query("today") today: String): List<AlertDto>
}
