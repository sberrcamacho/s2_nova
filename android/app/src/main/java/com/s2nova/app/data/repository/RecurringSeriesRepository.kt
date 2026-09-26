package com.s2nova.app.data.repository

import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.RecurrenceInterval
import com.s2nova.app.data.model.RecurringSeries
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ApiService
import com.s2nova.app.data.remote.ConfirmRecurringOccurrenceRequest
import com.s2nova.app.data.remote.CreateRecurringSeriesRequest
import com.s2nova.app.data.remote.RecurringSeriesDto
import com.s2nova.app.data.remote.UpdateRecurringSeriesRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

internal fun RecurringSeriesDto.toModel(categoryRepository: CategoryRepository): RecurringSeries? {
    val categoryId = categoryRepository.idForBackendId(categoryId) ?: return null
    return RecurringSeries(
        id = id,
        name = name,
        type = TransactionType.valueOf(type),
        amount = amount,
        walletId = accountId,
        category = categoryId,
        subcategoryId = categoryRepository.idForBackendId(subcategoryId),
        currency = currency,
        occurrences = occurrences,
        occurrencesDone = occurrencesDone,
        endDate = endDate?.take(10),
        autoConfirm = autoConfirm,
        paymentMethod = PaymentMethod.valueOf(paymentMethod),
        interval = RecurrenceInterval.valueOf(interval),
        nextOccurrenceDate = nextOccurrenceDate.take(10),
        isDue = isDue,
        active = active,
    )
}

// Recurring definitions (salary, rent, Netflix...) — backed by
// backend/src/routes/recurringSeries.ts. Confirming a due occurrence is an
// explicit user action (confirmOccurrence), never automatic, so opening
// the app never silently creates a duplicate transaction.
class RecurringSeriesRepository(
    private val categoryRepository: CategoryRepository,
    private val api: ApiService = ApiClient.api,
) {
    private val _series = MutableStateFlow<List<RecurringSeries>>(emptyList())
    val series: StateFlow<List<RecurringSeries>> = _series.asStateFlow()

    suspend fun refresh() {
        if (DemoModeFlag.active) return
        _series.value = api.getRecurringSeries(com.s2nova.app.data.todayISO()).mapNotNull { it.toModel(categoryRepository) }
    }

    // Overrides the in-memory list with fictitious data for local-only demo
    // mode — never calls the network. See AppContainer.enterDemoMode().
    fun loadDemo(series: List<RecurringSeries>) {
        _series.value = series
    }

    suspend fun create(
        name: String,
        type: TransactionType,
        amount: Double,
        walletId: String,
        category: com.s2nova.app.data.model.CategoryId,
        interval: RecurrenceInterval,
        startDate: String,
    ): RecurringSeries? {
        if (DemoModeFlag.active) return null
        val categoryBackendId = categoryRepository.backendIdFor(category) ?: return null
        val dto = api.createRecurringSeries(
            CreateRecurringSeriesRequest(
                name = name,
                type = type.name,
                amount = amount,
                accountId = walletId,
                categoryId = categoryBackendId,
                interval = interval.name,
                startDate = startDate,
            ),
        )
        val model = dto.toModel(categoryRepository) ?: return null
        _series.value = _series.value + model
        return model
    }

    // Full edit — name, type, amount, wallet, category, interval and next
    // occurrence date all change together from one dialog (see
    // RecurringScreen.kt's EditRecurringDialog / ANDROID.md's hoja modal
    // table). Changing the wallet re-derives paymentMethod server-side.
    suspend fun update(
        id: String,
        name: String,
        type: TransactionType,
        amount: Double,
        walletId: String,
        category: com.s2nova.app.data.model.CategoryId,
        interval: RecurrenceInterval,
        nextOccurrenceDate: String,
    ) {
        if (DemoModeFlag.active) return
        val categoryBackendId = categoryRepository.backendIdFor(category) ?: return
        val dto = api.updateRecurringSeries(
            id,
            UpdateRecurringSeriesRequest(
                name = name,
                type = type.name,
                amount = amount,
                accountId = walletId,
                categoryId = categoryBackendId,
                interval = interval.name,
                nextOccurrenceDate = nextOccurrenceDate,
            ),
        )
        val model = dto.toModel(categoryRepository) ?: return
        _series.value = _series.value.map { if (it.id == id) model else it }
    }

    suspend fun setActive(id: String, active: Boolean) {
        if (DemoModeFlag.active) return
        val dto = api.updateRecurringSeries(id, UpdateRecurringSeriesRequest(active = active))
        val model = dto.toModel(categoryRepository) ?: return
        _series.value = _series.value.map { if (it.id == id) model else it }
    }

    suspend fun delete(id: String) {
        if (DemoModeFlag.active) {
            _series.value = _series.value.filterNot { it.id == id }
            return
        }
        api.deleteRecurringSeries(id)
        _series.value = _series.value.filterNot { it.id == id }
    }

    // Materializes the due occurrence into a real Transaction and advances
    // the series' next due date — see confirmRecurringOccurrence in
    // ApiService. Callers should also refresh WalletRepository/
    // TransactionRepository afterward since this changes both.
    suspend fun confirmOccurrence(id: String) {
        if (DemoModeFlag.active) return
        val response = api.confirmRecurringOccurrence(id, ConfirmRecurringOccurrenceRequest())
        val model = response.series.toModel(categoryRepository) ?: return
        _series.value = _series.value.map { if (it.id == id) model else it }
    }

    // Skips the due occurrence: the series moves to its next date and no
    // Transaction is created, so balances don't change.
    suspend fun skipOccurrence(id: String) {
        if (DemoModeFlag.active) return
        val model = api.skipRecurringOccurrence(id).toModel(categoryRepository) ?: return
        _series.value = _series.value.map { if (it.id == id) model else it }
    }
}
