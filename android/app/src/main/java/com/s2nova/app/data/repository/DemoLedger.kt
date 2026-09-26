package com.s2nova.app.data.repository

import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.Currencies
import com.s2nova.app.data.model.NewTransactionInput
import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID

// Guest mode ("Continuar como invitado", ONBOARDING.md §1): everything is
// interactive, nothing syncs. The backend's balance and conversion rules are
// mirrored here, in memory only, so a guest sees the same effects a real
// account would.
object DemoLedger {
    fun movementFrom(input: NewTransactionInput): Transaction {
        val wallets = AppContainer.walletRepository.wallets.value
        val wallet = wallets.firstOrNull { it.id == input.walletId }
        val walletCurrency = wallet?.currency ?: "COP"
        val currency = if (input.type == TransactionType.TRANSFER) walletCurrency else input.currency ?: walletCurrency
        val target = if (input.type == TransactionType.TRANSFER) wallets.firstOrNull { it.id == input.transferToWalletId }?.currency ?: walletCurrency else walletCurrency
        val rate = if (currency != target) Currencies.referenceRate(currency, target) else null
        val time = input.time ?: LocalTime.now().toString().take(5)
        val future = LocalDate.parse(input.date).atTime(LocalTime.parse(time)).isAfter(java.time.LocalDateTime.now())
        return Transaction(
            id = UUID.randomUUID().toString(),
            walletId = input.walletId,
            transferToWalletId = input.transferToWalletId,
            description = input.description,
            amount = input.amount,
            type = input.type,
            status = if (future) TransactionStatus.PLANNED else TransactionStatus.COMPLETED,
            category = if (input.type == TransactionType.TRANSFER) CategoryRepository.TRANSFER else input.category ?: "exp.other",
            subcategoryId = input.subcategoryId,
            date = input.date,
            time = time,
            paymentMethod = PaymentMethod.BANK_TRANSFER,
            currency = currency,
            fxRate = rate,
            walletAmount = rate?.let { Math.round(input.amount * it * 100) / 100.0 },
            counterpartyKind = input.counterpartyKind,
            customBudgetId = input.customBudgetId,
            merchant = input.merchant,
            note = input.note,
            goalId = input.goalId,
            loanKind = input.loanKind,
            counterpartyName = input.counterpartyName,
            dueDate = input.dueDate,
            recurringSeriesId = input.repeat?.let { "demo-series" },
        )
    }

    // direction 1 applies a COMPLETED movement to the wallets, -1 reverses it.
    fun applyToWallets(tx: Transaction, direction: Int) {
        if (tx.status != TransactionStatus.COMPLETED) return
        val repo = AppContainer.walletRepository
        val walletMoves = tx.walletAmount ?: tx.amount
        when (tx.type) {
            TransactionType.EXPENSE -> repo.adjustLocal(tx.walletId, -walletMoves * direction)
            TransactionType.INCOME -> repo.adjustLocal(tx.walletId, walletMoves * direction)
            TransactionType.TRANSFER -> {
                repo.adjustLocal(tx.walletId, -tx.amount * direction)
                tx.transferToWalletId?.let { repo.adjustLocal(it, walletMoves * direction) }
            }
        }
    }
}
