package com.s2nova.app.ui.screens.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.RecurrenceInterval
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.model.WalletType
import com.s2nova.app.data.todayISO
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.screens.wallets.WalletTypeSelector
import com.s2nova.app.ui.screens.wallets.labelFor
import kotlinx.coroutines.launch

// One wallet is enough to complete onboarding (never forces multiple
// accounts). Skippable: declining just means Home opens with no wallet —
// AddTransactionScreen gates on that at the point of need instead of
// trapping the user here.
@Composable
fun OnboardingWalletScreen(
    state: OnboardingFlowState,
    onNext: () -> Unit,
    onBack: () -> Unit,
    onSkip: () -> Unit,
) {
    val t = rememberStrings()
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf("") }
    var type by remember { mutableStateOf(WalletType.CASH) }
    var balanceText by remember { mutableStateOf(state.monthlyIncome.value?.toInt()?.toString() ?: "") }
    var saving by remember { mutableStateOf(false) }

    OnboardingScaffold(step = 2, onSkip = onSkip) {
        Column(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.weight(1f).padding(top = 24.dp)) {
                Text(
                    t(StringKey.ONBOARDING_WALLET_TITLE),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Text(
                    t(StringKey.ONBOARDING_WALLET_SUBTITLE),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp, bottom = 20.dp),
                )
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text(t(StringKey.WALLETS_NAME)) },
                    placeholder = { Text(t(StringKey.ONBOARDING_WALLET_NAME_PLACEHOLDER)) },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth(),
                )
                Text(
                    t(StringKey.WALLETS_TYPE),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 16.dp, bottom = 8.dp),
                )
                WalletTypeSelector(selected = type, onSelect = { type = it })
                OutlinedTextField(
                    value = balanceText,
                    onValueChange = { balanceText = it.filter { c -> c.isDigit() } },
                    label = { Text(t(StringKey.WALLETS_INITIAL_BALANCE)) },
                    leadingIcon = { Text("$") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(onClick = onBack, shape = RoundedCornerShape(14.dp), modifier = Modifier.weight(1f)) {
                    Text(t(StringKey.ONBOARDING_BACK))
                }
                Button(
                    onClick = {
                        if (name.isBlank() || saving) return@Button
                        saving = true
                        scope.launch {
                            val wallet = AppContainer.walletRepository.create(name.trim(), type, balanceText.toDoubleOrNull() ?: 0.0)
                            state.walletId.value = wallet.id

                            // "Amount, currency, where it's received" from
                            // the income step becomes a real recurring
                            // income definition here, once we know which
                            // wallet it's received into — represented via
                            // RecurringSeries, never as a one-off
                            // transaction created on every app launch.
                            val income = state.monthlyIncome.value
                            if (income != null && income > 0) {
                                AppContainer.recurringSeriesRepository.create(
                                    name = "Salario",
                                    type = TransactionType.INCOME,
                                    amount = income,
                                    walletId = wallet.id,
                                    category = CategoryId.SALARY,
                                    interval = RecurrenceInterval.MONTHLY,
                                    startDate = todayISO(),
                                )
                            }

                            saving = false
                            onNext()
                        }
                    },
                    enabled = name.isNotBlank() && !saving,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier.weight(1f),
                ) {
                    Text(t(StringKey.ONBOARDING_NEXT))
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}
