package com.s2nova.app.data.repository

import com.s2nova.app.data.Currencies
import com.s2nova.app.data.model.Wallet
import com.s2nova.app.data.model.WalletType
import com.s2nova.app.data.remote.AccountDto
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ApiService
import com.s2nova.app.data.remote.CreateAccountRequest
import com.s2nova.app.data.remote.DeleteAccountRequest
import com.s2nova.app.data.remote.UpdateAccountRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

internal fun AccountDto.toWallet() = Wallet(
    id = id,
    name = name,
    type = runCatching { WalletType.valueOf(type) }.getOrDefault(WalletType.OTHER),
    initialBalance = initialBalance,
    currentBalance = currentBalance,
    currency = currency,
    principalBalance = principalBalance ?: currentBalance,
    movements = movements ?: 0,
)

// "Wallet" everywhere in the UI — backed by the /accounts resource
// (backend/src/routes/accounts.ts). Each wallet has one currency
// (CURRENCIES_AND_WALLETS.md §4). Guest mode mutates the list in memory.
class WalletRepository(private val api: ApiService = ApiClient.api) {
    private val _wallets = MutableStateFlow<List<Wallet>>(emptyList())
    val wallets: StateFlow<List<Wallet>> = _wallets.asStateFlow()

    // Principal currency for the "≈" conversions in guest mode.
    var principal: String = "COP"

    suspend fun refresh() {
        if (DemoModeFlag.active) return
        _wallets.value = api.getAccounts().map { it.toWallet() }
    }

    fun loadDemo(wallets: List<Wallet>) {
        _wallets.value = wallets
    }

    // Guest-mode balance change (DemoLedger).
    fun adjustLocal(id: String, delta: Double) {
        _wallets.value = _wallets.value.map {
            if (it.id != id) it
            else {
                val balance = it.currentBalance + delta
                it.copy(currentBalance = balance, principalBalance = balance * Currencies.referenceRate(it.currency, principal))
            }
        }
    }

    fun totalInPrincipal(): Double = _wallets.value.sumOf { it.principalBalance }

    suspend fun create(name: String, type: WalletType, initialBalance: Double, currency: String? = null): Wallet? {
        if (DemoModeFlag.active) {
            val code = currency ?: principal
            val wallet = Wallet(UUID.randomUUID().toString(), name, type, initialBalance, initialBalance, code, initialBalance * Currencies.referenceRate(code, principal), 0)
            _wallets.value = _wallets.value + wallet
            return wallet
        }
        val dto = api.createAccount(CreateAccountRequest(name, type.name, initialBalance, currency))
        val wallet = dto.toWallet()
        _wallets.value = _wallets.value + wallet
        return wallet
    }

    suspend fun update(id: String, name: String, type: WalletType) {
        if (DemoModeFlag.active) {
            _wallets.value = _wallets.value.map { if (it.id == id) it.copy(name = name, type = type) else it }
            return
        }
        val dto = api.updateAccount(id, UpdateAccountRequest(name = name, type = type.name))
        _wallets.value = _wallets.value.map { if (it.id == id) dto.toWallet() else it }
    }

    // Without reassignToAccountId the wallet's movements are deleted with
    // it (the two-step confirmation says how many); the backend refuses the
    // last wallet (409).
    suspend fun delete(id: String, reassignToAccountId: String? = null) {
        if (DemoModeFlag.active) {
            _wallets.value = _wallets.value.filterNot { it.id == id }
            return
        }
        val response = api.deleteAccount(id, DeleteAccountRequest(reassignToAccountId))
        if (!response.isSuccessful) throw retrofit2.HttpException(response)
        _wallets.value = _wallets.value.filterNot { it.id == id }
        refresh()
    }
}
