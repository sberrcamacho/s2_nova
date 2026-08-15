package com.s2nova.app.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.formatCurrency
import com.s2nova.app.data.model.Currency

// Bound to the signed-in user's currency-format preference so every screen
// re-renders with the right format the moment it changes in Settings —
// mirrors web/src/state/useCurrency.ts.
class CurrencyFormatter(private val currency: Currency) {
    operator fun invoke(value: Double, signed: Boolean = false): String = formatCurrency(value, currency, signed)
}

@Composable
fun rememberCurrencyFormatter(): CurrencyFormatter {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    return CurrencyFormatter(user?.preferences?.currency ?: Currency.COP)
}
