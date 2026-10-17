package com.s2nova.app.data.repository

import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ApiService
import com.s2nova.app.data.remote.NotificationCaptureRequest
import com.s2nova.app.data.remote.SuggestionConfirmRequest
import com.s2nova.app.data.remote.SuggestionDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

// A movement read from a bank or wallet app's notification, waiting to be
// confirmed ("Por confirmar" on Inicio, on both clients).
data class MovementSuggestion(
    val id: String,
    val appLabel: String,
    val type: TransactionType,
    val amount: Double,
    val currency: String,
    val merchant: String?,
    val category: String?,
    val walletId: String?,
    val occurredAt: String, // ISO instant
)

// Backed by backend/src/routes/suggestions.ts. Guests have none: the
// example account never reads notifications.
class SuggestionRepository(private val categories: CategoryRepository, private val api: ApiService = ApiClient.api) {
    private val _pending = MutableStateFlow<List<MovementSuggestion>>(emptyList())
    val pending: StateFlow<List<MovementSuggestion>> = _pending.asStateFlow()

    private fun SuggestionDto.toModel() = MovementSuggestion(
        id = id,
        appLabel = appLabel,
        type = if (type == "INCOME") TransactionType.INCOME else TransactionType.EXPENSE,
        amount = amount,
        currency = currency,
        merchant = merchant,
        category = categories.idForBackendId(categoryId),
        walletId = accountId,
        occurredAt = occurredAt,
    )

    suspend fun refresh() {
        if (DemoModeFlag.active) {
            _pending.value = emptyList()
            return
        }
        // What was captured while the session couldn't be used goes out first.
        runCatching { com.s2nova.app.data.notifications.NotificationCapture.flush() }
        _pending.value = api.getSuggestions().map { it.toModel() }
    }

    // Sends one captured notification; null when it isn't a movement.
    suspend fun capture(request: NotificationCaptureRequest): MovementSuggestion? =
        api.suggestFromNotification(request).suggestion?.toModel()

    suspend fun confirm(id: String, transactionId: String) {
        com.s2nova.app.data.notifications.NotificationCapture.cancel(id)
        api.confirmSuggestion(id, SuggestionConfirmRequest(transactionId))
        _pending.value = _pending.value.filterNot { it.id == id }
    }

    suspend fun dismiss(id: String) {
        com.s2nova.app.data.notifications.NotificationCapture.cancel(id)
        _pending.value = _pending.value.filterNot { it.id == id }
        api.dismissSuggestion(id)
    }
}
