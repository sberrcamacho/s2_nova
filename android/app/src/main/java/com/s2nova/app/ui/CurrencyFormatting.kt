package com.s2nova.app.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
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

// Renders a digits-only amount field value (e.g. "580000") grouped with the
// same period thousands separator used for display elsewhere in the app
// (see CurrencyUtils.formatCOP — "$580.000"), without changing the
// underlying raw-digit string the screen stores/parses on save.
class ThousandsGroupingVisualTransformation : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        val digits = text.text
        val grouped = groupThousands(digits)
        val offsetMapping = object : OffsetMapping {
            override fun originalToTransformed(offset: Int): Int {
                val clamped = offset.coerceIn(0, digits.length)
                var separators = 0
                for (i in 0 until clamped) {
                    val remaining = digits.length - i - 1
                    if (remaining > 0 && remaining % 3 == 0) separators++
                }
                return clamped + separators
            }

            override fun transformedToOriginal(offset: Int): Int {
                val clamped = offset.coerceIn(0, grouped.length)
                return grouped.take(clamped).count { it != '.' }
            }
        }
        return TransformedText(AnnotatedString(grouped), offsetMapping)
    }

    private fun groupThousands(digits: String): String {
        if (digits.isEmpty()) return digits
        val n = digits.length
        val sb = StringBuilder()
        for (i in digits.indices) {
            sb.append(digits[i])
            val remaining = n - i - 1
            if (remaining > 0 && remaining % 3 == 0) sb.append('.')
        }
        return sb.toString()
    }
}
