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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberStrings

// "Do NOT assume every user has a fixed salary" — this step only collects
// an approximate monthly income figure (used to size the budget
// suggestion two steps later), not a structured income source. Skipping
// it just means the budget-suggestion step has nothing to compute from
// and offers manual entry instead.
@Composable
fun OnboardingIncomeScreen(
    state: OnboardingFlowState,
    onNext: () -> Unit,
    onBack: () -> Unit,
    onSkip: () -> Unit,
) {
    val t = rememberStrings()
    var amountText by remember { mutableStateOf(state.monthlyIncome.value?.toInt()?.toString() ?: "") }

    OnboardingScaffold(step = 1, onSkip = onSkip) {
        Column(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.weight(1f).padding(top = 24.dp)) {
                Text(
                    t(StringKey.ONBOARDING_INCOME_TITLE),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Text(
                    t(StringKey.ONBOARDING_INCOME_SUBTITLE),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
                )
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it.filter { c -> c.isDigit() } },
                    label = { Text(t(StringKey.ONBOARDING_INCOME_LABEL)) },
                    leadingIcon = { Text("$") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(onClick = onBack, shape = RoundedCornerShape(14.dp), modifier = Modifier.weight(1f)) {
                    Text(t(StringKey.ONBOARDING_BACK))
                }
                Button(
                    onClick = {
                        state.monthlyIncome.value = amountText.toDoubleOrNull()
                        onNext()
                    },
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
