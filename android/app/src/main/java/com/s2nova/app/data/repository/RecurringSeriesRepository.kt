package com.s2nova.app.data.repository

import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.RecurrenceInterval
import com.s2nova.app.data.model.RecurringSeries
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ApiService
import com.s2nova.app.data.remote.ConfirmRecurringOccurrenceRequest
import com.s2nova.app.data.remote.RecurringSeriesDto
import com.s2nova.app.data.remote.UpdateRecurringSeriesRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

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

    fun addDemo(series: RecurringSeries) {
        _series.value = _series.value + series
    }

    // Editar in Programados opens "Nuevo movimiento" on the series; this
    // saves it. Occurrences/end date are sent even when null so "Termina:
    // nunca" clears them. Changing the wallet re-derives paymentMethod
    // server-side.
    suspend fun edit(
        id: String,
        name: String,
        amount: Double,
        currency: String,
        walletId: String,
        category: com.s2nova.app.data.model.CategoryId,
        subcategoryId: com.s2nova.app.data.model.CategoryId?,
        interval: RecurrenceInterval,
        nextOccurrenceDate: String,
        occurrences: Int?,
        endDate: String?,
        autoConfirm: Boolean,
    ) {
        if (DemoModeFlag.active) {
            _series.value = _series.value.map {
                if (it.id != id) it else it.copy(
                    name = name, amount = amount, currency = currency, walletId = walletId, category = category, subcategoryId = subcategoryId,
                    interval = interval, nextOccurrenceDate = nextOccurrenceDate, occurrences = occurrences, endDate = endDate, autoConfirm = autoConfirm,
                )
            }
            return
        }
        val categoryBackendId = categoryRepository.backendIdFor(category) ?: return
        val body = buildJsonObject {
            put("name", JsonPrimitive(name))
            put("amount", JsonPrimitive(amount))
            put("currency", JsonPrimitive(currency))
            put("accountId", JsonPrimitive(walletId))
            put("categoryId", JsonPrimitive(categoryBackendId))
            put("subcategoryId", JsonPrimitive(categoryRepository.backendIdFor(subcategoryId)))
            put("interval", JsonPrimitive(interval.name))
            put("nextOccurrenceDate", JsonPrimitive(nextOccurrenceDate))
            put("occurrences", JsonPrimitive(occurrences))
            put("endDate", JsonPrimitive(endDate))
            put("autoConfirm", JsonPrimitive(autoConfirm))
        }
        val model = api.editRecurringSeries(id, body).toModel(categoryRepository) ?: return
        _series.value = _series.value.map { if (it.id == id) model else it }
    }

    suspend fun setActive(id: String, active: Boolean) {
        if (DemoModeFlag.active) {
            demoUpdate(id) { it.copy(active = active).withDue() }
            return
        }
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
        if (DemoModeFlag.active) {
            val series = _series.value.firstOrNull { it.id == id } ?: return
            val input = com.s2nova.app.data.model.NewTransactionInput(
                walletId = series.walletId,
                description = series.name,
                amount = series.amount,
                type = series.type,
                category = series.category,
                subcategoryId = series.subcategoryId,
                date = series.nextOccurrenceDate,
                currency = series.currency,
            )
            val tx = DemoLedger.movementFrom(input).copy(recurringSeriesId = series.id, paymentMethod = series.paymentMethod)
            com.s2nova.app.data.AppContainer.transactionRepository.restoreLocal(tx)
            demoUpdate(id) { it.advanced() }
            return
        }
        val response = api.confirmRecurringOccurrence(id, ConfirmRecurringOccurrenceRequest())
        val model = response.series.toModel(categoryRepository) ?: return
        _series.value = _series.value.map { if (it.id == id) model else it }
    }

    // Skips the due occurrence: the series moves to its next date and no
    // Transaction is created, so balances don't change.
    suspend fun skipOccurrence(id: String) {
        if (DemoModeFlag.active) {
            demoUpdate(id) { it.advanced() }
            return
        }
        val model = api.skipRecurringOccurrence(id).toModel(categoryRepository) ?: return
        _series.value = _series.value.map { if (it.id == id) model else it }
    }

    private fun demoUpdate(id: String, change: (RecurringSeries) -> RecurringSeries) {
        _series.value = _series.value.map { if (it.id == id) change(it) else it }
        // The guest's alerts are a fixed list: a series that is no longer
        // due drops its "vence" alert, as the backend's rule would.
        if (_series.value.none { it.id == id && it.isDue }) com.s2nova.app.data.AppContainer.alertRepository.removeLocal("series:$id")
    }
}

// Guest mode mirrors the backend's date rule (recurringSeries.ts): the
// series moves one interval on, and ends once its count or end date is
// reached.
internal fun RecurringSeries.advanced(today: String = com.s2nova.app.data.todayISO()): RecurringSeries {
    val current = java.time.LocalDate.parse(nextOccurrenceDate)
    val next = when (interval) {
        RecurrenceInterval.DAILY -> current.plusDays(1)
        RecurrenceInterval.WEEKLY -> current.plusWeeks(1)
        RecurrenceInterval.MONTHLY -> current.plusMonths(1)
        RecurrenceInterval.YEARLY -> current.plusYears(1)
    }.toString()
    val done = occurrencesDone + 1
    val ended = (occurrences != null && done >= occurrences) || (endDate != null && next > endDate)
    return copy(nextOccurrenceDate = next, occurrencesDone = done, active = active && !ended).withDue(today)
}

internal fun RecurringSeries.withDue(today: String = com.s2nova.app.data.todayISO()): RecurringSeries =
    copy(isDue = active && nextOccurrenceDate <= today)
