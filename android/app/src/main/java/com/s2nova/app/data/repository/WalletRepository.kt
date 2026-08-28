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
        if (DemoModeFlag.active) return
        _wallets.value = ApiClient.api.getAccounts().map { it.toWallet() }
    }

    // Overrides the in-memory list with fictitious data for local-only demo
    // mode — never calls the network. See AppContainer.enterDemoMode().
    fun loadDemo(wallets: List<Wallet>) {
        _wallets.value = wallets
    }

    // Returns null while demo mode is active — see DemoModeFlag's doc
    // comment for why every mutation must skip the network entirely rather
    // than reach the real signed-in account.
    suspend fun create(name: String, type: WalletType, initialBalance: Double): Wallet? {
        if (DemoModeFlag.active) return null
        val dto = ApiClient.api.createAccount(CreateAccountRequest(name, type.name, initialBalance.toLong()))
        val wallet = dto.toWallet()
        _wallets.value = _wallets.value + wallet
        return wallet
    }

    suspend fun rename(id: String, name: String) {
        if (DemoModeFlag.active) return
        val dto = ApiClient.api.updateAccount(id, UpdateAccountRequest(name = name))
        _wallets.value = _wallets.value.map { if (it.id == id) dto.toWallet() else it }
    }
}
