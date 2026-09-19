package com.s2nova.app.data.repository

import com.s2nova.app.data.model.LoanKind
import com.s2nova.app.data.model.NewTransactionInput
import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ApiService
import com.s2nova.app.data.remote.CreateTransactionRequest
import com.s2nova.app.data.remote.SettleLoanRequest
import com.s2nova.app.data.remote.TransactionDto
import com.s2nova.app.data.remote.UpdateTransactionRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

internal fun TransactionDto.toTransaction(categoryRepository: CategoryRepository): Transaction? {
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
        subcategoryId = subcategoryId,
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
        parentLoanId = parentLoanId,
    )
}

// Backed by backend/src/routes/transactions.ts — the server (not this
// client) is what applies/reconciles wallet balance effects, so refresh()
// after any mutation that isn't reflected by the mutation's own response
// (e.g. a wallet balance changing because of a transaction on a *different*
// screen) — see WalletRepository.refresh() calls alongside these.
class TransactionRepository(
    private val categoryRepository: CategoryRepository,
    private val api: ApiService = ApiClient.api,
) {
    private val _transactions = MutableStateFlow<List<Transaction>>(emptyList())
    val transactions: StateFlow<List<Transaction>> = _transactions.asStateFlow()

    fun getById(id: String): Transaction? = _transactions.value.find { it.id == id }

    suspend fun refresh() {
        if (DemoModeFlag.active) return
        _transactions.value = api.getTransactions().mapNotNull { it.toTransaction(categoryRepository) }
    }

    // Overrides the in-memory list with fictitious data for local-only demo
    // mode — never calls the network. See AppContainer.enterDemoMode().
    fun loadDemo(transactions: List<Transaction>) {
        _transactions.value = transactions
    }

    suspend fun add(input: NewTransactionInput): Transaction? {
        if (DemoModeFlag.active) return null
        val categoryBackendId = categoryRepository.backendIdFor(input.category) ?: return null
        val dto = api.createTransaction(
            CreateTransactionRequest(
                accountId = input.walletId,
                transferToAccountId = input.transferToWalletId,
                type = input.type.name,
                status = input.status.name,
                amount = input.amount.toLong(),
                categoryId = categoryBackendId,
                subcategoryId = input.subcategoryId,
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

    // Forwards every field AddTransactionScreen lets the user change while
    // editing — not just the "safe" ones — since the backend's PATCH
    // /transactions/:id already accepts status/accountId/loanKind/
    // counterpartyName/dueDate (see updateTransactionSchema); dropping them
    // here silently discarded wallet/upcoming/loan edits made from the Add
    // screen's edit mode. `type` itself has no update field — the backend
    // flips it automatically from loanKind (LENT<->EXPENSE, BORROWED<->INCOME).
    // Note: since UpdateTransactionRequest's nullable fields all default to
    // null and this client's Json encoder omits defaulted properties, a
    // field set back to null here (e.g. turning the loan toggle off) is
    // omitted from the request rather than sent as an explicit clear — it
    // leaves the previous value in place server-side. Pre-existing DTO
    // limitation, not something this fix changes.
    suspend fun update(id: String, input: NewTransactionInput) {
        if (DemoModeFlag.active) return
        val categoryBackendId = categoryRepository.backendIdFor(input.category)
        val dto = api.updateTransaction(
            id,
            UpdateTransactionRequest(
                amount = input.amount.toLong(),
                categoryId = categoryBackendId,
                subcategoryId = input.subcategoryId,
                budgetId = input.budgetId,
                goalId = input.goalId,
                status = input.status.name,
                accountId = input.walletId,
                loanKind = input.loanKind?.name,
                counterpartyName = input.counterpartyName,
                dueDate = input.dueDate,
                description = input.description,
                merchant = input.merchant,
                note = input.note,
                date = input.date,
            ),
        )
        applyUpdated(id, dto)
    }

    // Loan-only edit — separate from update() because Lent/Borrowed records
    // expose fields (wallet, direction, counterparty, due date) that a
    // normal transaction edit never touches. Changing walletId or loanKind
    // is safe even after partial payments: outstanding is always derived
    // as principal minus paidSoFar(), never stored directly.
    suspend fun updateLoan(
        id: String,
        amount: Double,
        walletId: String,
        loanKind: LoanKind,
        counterpartyName: String?,
        dueDate: String?,
    ) {
        if (DemoModeFlag.active) return
        val dto = api.updateTransaction(
            id,
            UpdateTransactionRequest(
                amount = amount.toLong(),
                accountId = walletId,
                loanKind = loanKind.name,
                counterpartyName = counterpartyName,
                dueDate = dueDate,
            ),
        )
        applyUpdated(id, dto)
    }

    // Realizes an "Upcoming" transaction, or reverts a completed one back to
    // planned — the transition that actually moves/unmoves wallet balance.
    suspend fun setStatus(id: String, status: TransactionStatus) {
        if (DemoModeFlag.active) return
        val dto = api.updateTransaction(id, UpdateTransactionRequest(status = status.name))
        applyUpdated(id, dto)
    }

    // Creates a real, opposite-direction settlement transaction (see
    // backend/src/routes/transactions.ts `settle-loan`) — not just a flag
    // flip, so the wallet balance actually reflects the repayment. `amount`
    // omitted (or equal to the outstanding balance) fully settles the loan;
    // a lower amount records a partial payment — see `outstandingFor`.
    // Returns the new settlement transaction so the caller can show/refresh it.
    suspend fun settleLoan(id: String, amount: Double? = null, accountId: String? = null): Transaction? {
        if (DemoModeFlag.active) return null
        val response = api.settleLoan(id, SettleLoanRequest(amount = amount?.toLong(), accountId = accountId))
        applyUpdated(id, response.original)
        val settlement = response.settlement.toTransaction(categoryRepository)
        if (settlement != null) {
            _transactions.value = listOf(settlement) + _transactions.value
        }
        return settlement
    }

    // Sum of every settlement (partial or final) already recorded against
    // this loan — see Transaction.parentLoanId's doc comment.
    fun paidSoFar(loanId: String): Double = _transactions.value.filter { it.parentLoanId == loanId }.sumOf { it.amount }

    fun outstandingFor(loan: Transaction): Double = (loan.amount - paidSoFar(loan.id)).coerceAtLeast(0.0)

    suspend fun delete(id: String) {
        if (DemoModeFlag.active) return
        api.deleteTransaction(id)
        _transactions.value = _transactions.value.filterNot { it.id == id }
    }

    private fun applyUpdated(id: String, dto: TransactionDto) {
        val transaction = dto.toTransaction(categoryRepository) ?: return
        _transactions.value = _transactions.value.map { if (it.id == id) transaction else it }
    }
}
