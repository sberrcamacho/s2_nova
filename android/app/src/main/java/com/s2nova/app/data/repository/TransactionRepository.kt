package com.s2nova.app.data.repository

import android.util.Base64
import com.s2nova.app.data.model.AttachmentMeta
import com.s2nova.app.data.model.CounterpartyKind
import com.s2nova.app.data.model.LoanKind
import com.s2nova.app.data.model.NewTransactionInput
import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ApiService
import com.s2nova.app.data.remote.AttachmentDto
import com.s2nova.app.data.remote.CreateTransactionRequest
import com.s2nova.app.data.remote.RepeatDto
import com.s2nova.app.data.remote.SettleLoanRequest
import com.s2nova.app.data.remote.TransactionDto
import com.s2nova.app.data.remote.UpdateTransactionRequest
import com.s2nova.app.data.remote.UploadAttachmentRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

internal fun AttachmentDto.toMeta() = AttachmentMeta(
    id, kind == "PDF", mime, name, size,
    // The device's calendar day, not the server's UTC one.
    runCatching { java.time.Instant.parse(createdAt).atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString() }.getOrDefault(createdAt.take(10)),
)

internal fun TransactionDto.toTransaction(categoryRepository: CategoryRepository): Transaction? {
    val txType = TransactionType.valueOf(type)
    val category = if (txType == TransactionType.TRANSFER) CategoryRepository.TRANSFER else categoryRepository.idForBackendId(categoryId) ?: return null
    return Transaction(
        id = id,
        walletId = accountId,
        transferToWalletId = transferToAccountId,
        description = description,
        amount = amount,
        type = txType,
        status = TransactionStatus.valueOf(status),
        category = category,
        subcategoryId = categoryRepository.idForBackendId(subcategoryId),
        date = date.take(10),
        time = occurredAt?.substring(11, 16) ?: "12:00",
        paymentMethod = PaymentMethod.valueOf(paymentMethod),
        currency = currency,
        fxRate = fxRate,
        walletAmount = walletAmount,
        counterpartyKind = counterpartyKind?.let { runCatching { CounterpartyKind.valueOf(it) }.getOrNull() },
        customBudgetId = customBudgetId,
        attachment = attachment?.toMeta(),
        merchant = merchant,
        note = note,
        productId = productId,
        budgetId = budgetId,
        goalId = goalId,
        recurringSeriesId = recurringSeriesId,
        loanKind = loanKind?.let { LoanKind.valueOf(it) },
        counterpartyName = counterpartyName,
        dueDate = dueDate?.take(10),
        loanSettled = loanSettledAt != null,
        settledByTransactionId = settledByTransactionId,
        parentLoanId = parentLoanId,
    )
}

fun isFuture(input: NewTransactionInput): Boolean =
    java.time.LocalDate.parse(input.date).atTime(java.time.LocalTime.parse(input.time ?: "00:00")).isAfter(java.time.LocalDateTime.now())

// Display name (NEW_MOVEMENT.md §1): title, else note, else the category.
fun Transaction.displayName(categories: CategoryRepository): String =
    description.ifBlank { note?.takeIf { it.isNotBlank() } ?: categories.name(subcategoryId ?: category) }

// Backed by backend/src/routes/transactions.ts — the server (not this
// client) applies/reconciles wallet balance effects, so callers refresh the
// wallets after a mutation. In guest mode every mutation applies to the
// in-memory list only (nothing syncs, ONBOARDING.md §1).
class TransactionRepository(
    private val categoryRepository: CategoryRepository,
    private val api: ApiService = ApiClient.api,
) {
    private val _transactions = MutableStateFlow<List<Transaction>>(emptyList())
    val transactions: StateFlow<List<Transaction>> = _transactions.asStateFlow()

    // Local bytes of attachments added in guest mode, keyed by movement id.
    private val demoFiles = mutableMapOf<String, ByteArray>()

    fun getById(id: String): Transaction? = _transactions.value.find { it.id == id }

    suspend fun refresh() {
        if (DemoModeFlag.active) return
        _transactions.value = api.getTransactions().mapNotNull { it.toTransaction(categoryRepository) }
    }

    fun loadDemo(transactions: List<Transaction>) {
        _transactions.value = transactions
        demoFiles.clear()
    }

    suspend fun add(input: NewTransactionInput): Transaction? {
        if (DemoModeFlag.active) {
            val tx = DemoLedger.movementFrom(input)
            _transactions.value = listOf(tx) + _transactions.value
            DemoLedger.applyToWallets(tx, 1)
            return tx
        }
        val dto = api.createTransaction(
            CreateTransactionRequest(
                accountId = input.walletId,
                transferToAccountId = input.transferToWalletId,
                type = input.type.name,
                // The movement's own local date/time decides it: a future one
                // is PLANNED ("Programado") until confirmed.
                status = if (isFuture(input)) "PLANNED" else "COMPLETED",
                amount = input.amount,
                currency = input.currency,
                categoryId = if (input.type == TransactionType.TRANSFER) null else categoryRepository.backendIdFor(input.category),
                subcategoryId = categoryRepository.backendIdFor(input.subcategoryId),
                productId = input.productId,
                budgetId = input.budgetId,
                customBudgetId = input.customBudgetId,
                goalId = input.goalId,
                loanKind = input.loanKind?.name,
                counterpartyName = input.counterpartyName,
                counterpartyKind = input.counterpartyKind?.name,
                dueDate = input.dueDate,
                description = input.description,
                merchant = input.merchant,
                note = input.note,
                date = input.date,
                time = input.time,
                repeat = input.repeat?.let { RepeatDto(it.interval.name, it.occurrences, it.endDate, it.autoConfirm) },
            ),
        )
        val transaction = dto.toTransaction(categoryRepository) ?: return null
        _transactions.value = listOf(transaction) + _transactions.value
        return transaction
    }

    suspend fun update(id: String, input: NewTransactionInput) {
        if (DemoModeFlag.active) {
            val old = getById(id) ?: return
            DemoLedger.applyToWallets(old, -1)
            val next = DemoLedger.movementFrom(input).copy(id = id, attachment = old.attachment)
            _transactions.value = _transactions.value.map { if (it.id == id) next else it }
            DemoLedger.applyToWallets(next, 1)
            return
        }
        val dto = api.updateTransaction(
            id,
            UpdateTransactionRequest(
                amount = input.amount,
                currency = input.currency,
                categoryId = categoryRepository.backendIdFor(input.category),
                subcategoryId = categoryRepository.backendIdFor(input.subcategoryId),
                budgetId = input.budgetId,
                customBudgetId = input.customBudgetId,
                goalId = input.goalId,
                accountId = input.walletId,
                loanKind = input.loanKind?.name,
                counterpartyName = input.counterpartyName,
                counterpartyKind = input.counterpartyKind?.name,
                dueDate = input.dueDate,
                description = input.description,
                merchant = input.merchant,
                note = input.note,
                date = input.date,
                time = input.time,
            ),
        )
        applyUpdated(id, dto)
    }

    // Loan-only edit — separate from update() because Lent/Borrowed records
    // expose fields (wallet, direction, counterparty, due date) that a
    // normal transaction edit never touches.
    suspend fun updateLoan(
        id: String,
        amount: Double,
        walletId: String,
        loanKind: LoanKind,
        counterpartyName: String?,
        dueDate: String?,
    ) {
        if (DemoModeFlag.active) {
            _transactions.value = _transactions.value.map {
                if (it.id == id) it.copy(amount = amount, walletId = walletId, loanKind = loanKind, counterpartyName = counterpartyName, dueDate = dueDate) else it
            }
            return
        }
        val dto = api.updateTransaction(
            id,
            UpdateTransactionRequest(amount = amount, accountId = walletId, loanKind = loanKind.name, counterpartyName = counterpartyName, dueDate = dueDate),
        )
        applyUpdated(id, dto)
    }

    // Realizes a PLANNED ("Programado") movement, or reverts it — the
    // transition that actually moves wallet balance.
    suspend fun setStatus(id: String, status: TransactionStatus) {
        if (DemoModeFlag.active) {
            val old = getById(id) ?: return
            val next = old.copy(status = status)
            _transactions.value = _transactions.value.map { if (it.id == id) next else it }
            if (old.status != status) DemoLedger.applyToWallets(old.copy(status = TransactionStatus.COMPLETED), if (status == TransactionStatus.COMPLETED) 1 else -1)
            return
        }
        val dto = api.updateTransaction(id, UpdateTransactionRequest(status = status.name))
        applyUpdated(id, dto)
    }

    // Creates a real, opposite-direction settlement transaction — see
    // backend/src/routes/transactions.ts `settle-loan`.
    suspend fun settleLoan(id: String, amount: Double? = null, accountId: String? = null): Transaction? {
        if (DemoModeFlag.active) {
            val loan = getById(id) ?: return null
            val paid = amount ?: outstandingFor(loan)
            val settlement = loan.copy(
                id = UUID.randomUUID().toString(), amount = paid, walletId = accountId ?: loan.walletId,
                type = if (loan.loanKind == LoanKind.LENT) TransactionType.INCOME else TransactionType.EXPENSE,
                loanKind = null, parentLoanId = loan.id, date = java.time.LocalDate.now().toString(), attachment = null,
            )
            _transactions.value = listOf(settlement) + _transactions.value.map {
                if (it.id == id && paid >= outstandingFor(loan)) it.copy(loanSettled = true) else it
            }
            DemoLedger.applyToWallets(settlement, 1)
            return settlement
        }
        val response = api.settleLoan(id, SettleLoanRequest(amount = amount, accountId = accountId))
        applyUpdated(id, response.original)
        val settlement = response.settlement.toTransaction(categoryRepository)
        if (settlement != null) {
            _transactions.value = listOf(settlement) + _transactions.value
        }
        return settlement
    }

    fun paidSoFar(loanId: String): Double = _transactions.value.filter { it.parentLoanId == loanId }.sumOf { it.amount }

    fun outstandingFor(loan: Transaction): Double = (loan.amount - paidSoFar(loan.id)).coerceAtLeast(0.0)

    // stopSeries also deletes the movement's Programado (its future
    // repetitions), as the two-step confirmation lists.
    suspend fun delete(id: String, stopSeries: Boolean = false) {
        val existing = getById(id)
        if (DemoModeFlag.active) {
            _transactions.value = _transactions.value.filterNot { it.id == id }
            existing?.let { DemoLedger.applyToWallets(it, -1) }
            return
        }
        val response = api.deleteTransaction(id, if (stopSeries) "delete" else null)
        if (!response.isSuccessful) throw retrofit2.HttpException(response)
        _transactions.value = _transactions.value.filterNot { it.id == id }
    }

    // Puts a movement back after "Deshacer" (guest mode only: a real
    // deletion is delayed until the snackbar closes, see ui/Snack.kt).
    fun restoreLocal(tx: Transaction) {
        _transactions.value = listOf(tx) + _transactions.value
        if (DemoModeFlag.active) DemoLedger.applyToWallets(tx, 1)
    }

    fun hideLocal(id: String) {
        _transactions.value = _transactions.value.filterNot { it.id == id }
    }

    // ---- Comprobante ------------------------------------------------------

    suspend fun attach(id: String, name: String, mime: String, bytes: ByteArray): AttachmentMeta? {
        val meta = if (DemoModeFlag.active) {
            demoFiles[id] = bytes
            AttachmentMeta(UUID.randomUUID().toString(), mime == "application/pdf", mime, name, bytes.size.toLong(), java.time.LocalDate.now().toString())
        } else {
            api.uploadAttachment(id, UploadAttachmentRequest(name, mime, Base64.encodeToString(bytes, Base64.NO_WRAP))).toMeta()
        }
        _transactions.value = _transactions.value.map { if (it.id == id) it.copy(attachment = meta) else it }
        return meta
    }

    suspend fun attachmentBytes(id: String): ByteArray? {
        if (DemoModeFlag.active) return demoFiles[id]
        return runCatching { api.downloadAttachment(id).bytes() }.getOrNull()
    }

    suspend fun removeAttachment(id: String) {
        if (!DemoModeFlag.active) api.deleteAttachment(id)
        demoFiles.remove(id)
        _transactions.value = _transactions.value.map { if (it.id == id) it.copy(attachment = null) else it }
    }

    fun hideAttachmentLocal(id: String) {
        _transactions.value = _transactions.value.map { if (it.id == id) it.copy(attachment = null) else it }
    }

    fun restoreAttachment(id: String, meta: AttachmentMeta) {
        _transactions.value = _transactions.value.map { if (it.id == id) it.copy(attachment = meta) else it }
    }

    private fun applyUpdated(id: String, dto: TransactionDto) {
        val transaction = dto.toTransaction(categoryRepository) ?: return
        _transactions.value = _transactions.value.map { if (it.id == id) transaction else it }
    }
}
