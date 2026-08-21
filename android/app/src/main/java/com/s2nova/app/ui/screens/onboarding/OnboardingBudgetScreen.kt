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
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.BudgetRecommendationRequest
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.components.NovaCard
import kotlinx.coroutines.launch

// A 50/30/20 split offered only as a starting suggestion — never applied
// as real budgets automatically. "Accept" here just records the user's
// consent server-side (BudgetRecommendation.acceptedAt); creating actual
// per-category budgets from it stays a separate, explicit action the user
// takes later from the Budgets screen (see backend/src/routes/budgets.ts).
@Composable
fun OnboardingBudgetScreen(
    state: OnboardingFlowState,
    onNext: () -> Unit,
    onBack: () -> Unit,
    onSkip: () -> Unit,
) {
    val t = rememberStrings()
    val format = rememberCurrencyFormatter()
    val scope = rememberCoroutineScope()
    val income = state.monthlyIncome.value
    var working by remember { mutableStateOf(false) }

    OnboardingScaffold(step = 3, onSkip = onSkip) {
        Column(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.weight(1f).padding(top = 24.dp)) {
                Text(
                    t(StringKey.ONBOARDING_BUDGET_TITLE),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Text(
                    t(StringKey.ONBOARDING_BUDGET_SUBTITLE),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp, bottom = 20.dp),
                )

                if (income == null || income <= 0) {
                    Text(
                        t(StringKey.ONBOARDING_BUDGET_NO_INCOME),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    listOf(
                        Triple(t(StringKey.ONBOARDING_BUDGET_NEEDS), 0.5, income * 0.5),
                        Triple(t(StringKey.ONBOARDING_BUDGET_WANTS), 0.3, income * 0.3),
                        Triple(t(StringKey.ONBOARDING_BUDGET_SAVINGS), 0.2, income * 0.2),
                    ).forEach { (label, pct, amount) ->
                        NovaCard(modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text("$label · ${(pct * 100).toInt()}%", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onBackground)
                                Text(format(amount), style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                            }
                        }
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(onClick = onBack, shape = RoundedCornerShape(14.dp), modifier = Modifier.weight(1f)) {
                    Text(t(StringKey.ONBOARDING_BACK))
                }
                Button(
                    onClick = {
                        if (income == null || income <= 0 || working) {
                            onNext()
                            return@Button
                        }
                        working = true
                        scope.launch {
                            runCatching {
                                val recommendation = ApiClient.api.createBudgetRecommendation(
                                    BudgetRecommendationRequest(monthlyIncome = income.toLong()),
                                )
                                ApiClient.api.acceptBudgetRecommendation(recommendation.id)
                            }
                            working = false
                            onNext()
                        }
                    },
                    enabled = !working,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier.weight(1f),
                ) {
                    Text(if (income != null && income > 0) t(StringKey.ONBOARDING_BUDGET_ACCEPT) else t(StringKey.ONBOARDING_NEXT))
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}
