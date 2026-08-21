package com.s2nova.app.data.repository

import com.s2nova.app.data.model.Wallet
import com.s2nova.app.data.model.WalletType
import com.s2nova.app.data.remote.AccountDto
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.CreateAccountRequest
import com.s2nova.app.data.remote.UpdateAccountRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

private fun AccountDto.toWallet() = Wallet(
    id = id,
    name = name,
    type = runCatching { WalletType.valueOf(type) }.getOrDefault(WalletType.OTHER),
    initialBalance = initialBalance.toDouble(),
    currentBalance = currentBalance.toDouble(),
)

// "Wallet" everywhere in the UI — backed by the same /accounts resource
// ARCHITECTURE.md's Account model describes; see backend/src/routes/accounts.ts.
class WalletRepository {
    private val _wallets = MutableStateFlow<List<Wallet>>(emptyList())
    val wallets: StateFlow<List<Wallet>> = _wallets.asStateFlow()

    suspend fun refresh() {
        _wallets.value = ApiClient.api.getAccounts().map { it.toWallet() }
    }

    suspend fun create(name: String, type: WalletType, initialBalance: Double): Wallet {
        val dto = ApiClient.api.createAccount(CreateAccountRequest(name, type.name, initialBalance.toLong()))
        val wallet = dto.toWallet()
        _wallets.value = _wallets.value + wallet
        return wallet
    }

    suspend fun rename(id: String, name: String) {
        val dto = ApiClient.api.updateAccount(id, UpdateAccountRequest(name = name))
        _wallets.value = _wallets.value.map { if (it.id == id) dto.toWallet() else it }
    }
}
