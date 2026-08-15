package com.s2nova.app.data.repository

import com.s2nova.app.data.mock.seedTransactions
import com.s2nova.app.data.model.NewTransactionInput
import com.s2nova.app.data.model.Transaction
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

// In-memory mock "backend" — mirrors web/src/services/transactionService.ts.
// No persistence, no network. Ready to be swapped for a real repository
// backed by an S2 Nova API once one exists.
class TransactionRepository {
    private val _transactions = MutableStateFlow(seedTransactions())
    val transactions: StateFlow<List<Transaction>> = _transactions.asStateFlow()

    fun getById(id: String): Transaction? = _transactions.value.find { it.id == id }

    fun add(input: NewTransactionInput): Transaction {
        val transaction = Transaction(
            id = "txn_${UUID.randomUUID()}",
            description = input.description,
            amount = input.amount,
            type = input.type,
            category = input.category,
            date = input.date,
            paymentMethod = input.paymentMethod,
            merchant = input.merchant,
            note = input.note,
            productId = input.productId,
        )
        _transactions.value = listOf(transaction) + _transactions.value
        return transaction
    }

    fun update(id: String, input: NewTransactionInput) {
        _transactions.value = _transactions.value.map {
            if (it.id != id) it else it.copy(
                description = input.description,
                amount = input.amount,
                type = input.type,
                category = input.category,
                date = input.date,
                paymentMethod = input.paymentMethod,
                merchant = input.merchant,
                note = input.note,
            )
        }
    }

    fun delete(id: String) {
        _transactions.value = _transactions.value.filterNot { it.id == id }
    }
}
