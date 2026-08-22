package com.s2nova.app.data.repository

import com.s2nova.app.data.model.LoanKind
import com.s2nova.app.data.model.NewTransactionInput
import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.CreateTransactionRequest
import com.s2nova.app.data.remote.SettleLoanRequest
import com.s2nova.app.data.remote.TransactionDto
import com.s2nova.app.data.remote.UpdateTransactionRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

private fun TransactionDto.toTransaction(categoryRepository: CategoryRepository): Transaction? {
    val categoryId = categoryRepository.categoryIdForBackendId(categoryId) ?: return null
    return Transaction(
        id = id,
        walletId = accountId,
        transferToWalletId = transferToAccountId,
        description = description,
        amount = amount.toDouble(),
        type = TransactionType.valueOf(type),
        status = TransactionStatus.valueOf(status),
        category = categoryId,
        date = date.take(10),
        paymentMethod = PaymentMethod.valueOf(paymentMethod),
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
    )
}

// Backed by backend/src/routes/transactions.ts — the server (not this
// client) is what applies/reconciles wallet balance effects, so refresh()
// after any mutation that isn't reflected by the mutation's own response
// (e.g. a wallet balance changing because of a transaction on a *different*
// screen) — see WalletRepository.refresh() calls alongside these.
class TransactionRepository(private val categoryRepository: CategoryRepository) {
    private val _transactions = MutableStateFlow<List<Transaction>>(emptyList())
    val transactions: StateFlow<List<Transaction>> = _transactions.asStateFlow()

    fun getById(id: String): Transaction? = _transactions.value.find { it.id == id }

    suspend fun refresh() {
        _transactions.value = ApiClient.api.getTransactions().mapNotNull { it.toTransaction(categoryRepository) }
    }

    suspend fun add(input: NewTransactionInput): Transaction? {
        val categoryBackendId = categoryRepository.backendIdFor(input.category) ?: return null
        val dto = ApiClient.api.createTransaction(
            CreateTransactionRequest(
                accountId = input.walletId,
                transferToAccountId = input.transferToWalletId,
                type = input.type.name,
                status = input.status.name,
                amount = input.amount.toLong(),
                categoryId = categoryBackendId,
                productId = input.productId,
                budgetId = input.budgetId,
                goalId = input.goalId,
                loanKind = input.loanKind?.name,
                counterpartyName = input.counterpartyName,
                dueDate = input.dueDate,
                description = input.description,
                merchant = input.merchant,
                note = input.note,
                date = input.date,
            ),
        )
        val transaction = dto.toTransaction(categoryRepository) ?: return null
        _transactions.value = listOf(transaction) + _transactions.value
        return transaction
    }

    suspend fun update(id: String, input: NewTransactionInput) {
        val categoryBackendId = categoryRepository.backendIdFor(input.category)
        val dto = ApiClient.api.updateTransaction(
            id,
            UpdateTransactionRequest(
                amount = input.amount.toLong(),
                categoryId = categoryBackendId,
                budgetId = input.budgetId,
                goalId = input.goalId,
                description = input.description,
                merchant = input.merchant,
                note = input.note,
                date = input.date,
            ),
        )
        applyUpdated(id, dto)
    }

    // Realizes an "Upcoming" transaction, or reverts a completed one back to
    // planned — the transition that actually moves/unmoves wallet balance.
    suspend fun setStatus(id: String, status: TransactionStatus) {
        val dto = ApiClient.api.updateTransaction(id, UpdateTransactionRequest(status = status.name))
        applyUpdated(id, dto)
    }

    // Creates a real, opposite-direction settlement transaction (see
    // backend/src/routes/transactions.ts `settle-loan`) — not just a flag
    // flip, so the wallet balance actually reflects the repayment. Returns
    // the new settlement transaction so the caller can show/refresh it.
    suspend fun settleLoan(id: String): Transaction? {
        val response = ApiClient.api.settleLoan(id, SettleLoanRequest())
        applyUpdated(id, response.original)
        val settlement = response.settlement.toTransaction(categoryRepository)
        if (settlement != null) {
            _transactions.value = listOf(settlement) + _transactions.value
        }
        return settlement
    }

    suspend fun delete(id: String) {
        ApiClient.api.deleteTransaction(id)
        _transactions.value = _transactions.value.filterNot { it.id == id }
    }

    private fun applyUpdated(id: String, dto: TransactionDto) {
        val transaction = dto.toTransaction(categoryRepository) ?: return
        _transactions.value = _transactions.value.map { if (it.id == id) transaction else it }
    }
}
