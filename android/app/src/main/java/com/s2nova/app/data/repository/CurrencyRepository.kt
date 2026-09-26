package com.s2nova.app.data.repository

import com.s2nova.app.data.Currencies
import com.s2nova.app.data.model.UserCurrency
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ApiService
import com.s2nova.app.data.remote.CurrencyCodeRequest
import com.s2nova.app.data.remote.CurrencyDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

private fun CurrencyDto.toUserCurrency() = UserCurrency(code, name, symbol, decimals, isPrincipal, rate, wallets)

// Ajustes › Monedas (CURRENCIES_AND_WALLETS.md §3) and the first-run
// principal currency. Rates are principal units per 1 unit of each currency.
class CurrencyRepository(private val api: ApiService = ApiClient.api) {
    private val _currencies = MutableStateFlow<List<UserCurrency>>(emptyList())
    val currencies: StateFlow<List<UserCurrency>> = _currencies.asStateFlow()

    val principal: String get() = _currencies.value.firstOrNull { it.isPrincipal }?.code ?: "COP"

    suspend fun refresh() {
        if (DemoModeFlag.active) return
        _currencies.value = api.getMyCurrencies().map { it.toUserCurrency() }
    }

    private fun local(code: String, principal: String, wallets: Int = 0): UserCurrency {
        val info = Currencies.info(code)
        return UserCurrency(code, info.name, info.symbol, info.decimals, code == principal, Currencies.referenceRate(code, principal), wallets)
    }

    fun loadDemo(codes: List<String>, principal: String) {
        _currencies.value = codes.map { local(it, principal) }
    }

    // Wallet counts per currency, for guest mode's "Quitar" rule.
    fun recountLocal(walletCurrencies: List<String>) {
        _currencies.value = _currencies.value.map { c -> c.copy(wallets = walletCurrencies.count { it == c.code }) }
    }

    // 1 `code` in principal units.
    fun rate(code: String): Double = _currencies.value.firstOrNull { it.code == code }?.rate ?: Currencies.referenceRate(code, principal)

    // 1 `from` in `to` units.
    fun rate(from: String, to: String): Double = if (from == to) 1.0 else rate(from) / rate(to)

    suspend fun catalog(): List<UserCurrency> =
        if (DemoModeFlag.active) Currencies.catalog.map { local(it.code, principal) }
        else api.getCurrencyCatalog().map { it.toUserCurrency() }

    suspend fun add(code: String) {
        if (DemoModeFlag.active) {
            _currencies.value = _currencies.value + local(code, principal)
            return
        }
        _currencies.value = api.addCurrency(CurrencyCodeRequest(code)).map { it.toUserCurrency() }
    }

    suspend fun remove(code: String) {
        if (DemoModeFlag.active) {
            _currencies.value = _currencies.value.filterNot { it.code == code }
            return
        }
        _currencies.value = api.removeCurrency(code).map { it.toUserCurrency() }
    }

    suspend fun setPrincipal(code: String) {
        if (DemoModeFlag.active) {
            _currencies.value = listOf(local(code, code))
            return
        }
        _currencies.value = api.setPrincipalCurrency(CurrencyCodeRequest(code)).map { it.toUserCurrency() }
    }
}
