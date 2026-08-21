package com.s2nova.app.ui.screens.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.s2nova.app.data.AppContainer
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberStrings

// Transient in-progress onboarding data, hoisted once at NovaApp's top
// level (see NovaNavGraph.kt) so it survives navigation between onboarding
// steps without a ViewModel — same "plain remembered state above the
// NavHost" pattern NovaApp already uses for showAddSheet.
class OnboardingFlowState {
    var monthlyIncome = mutableStateOf<Double?>(null)
    var walletId = mutableStateOf<String?>(null)
}

private const val ONBOARDING_STEP_COUNT = 5

@Composable
fun OnboardingScaffold(
    step: Int,
    onSkip: (() -> Unit)?,
    content: @Composable () -> Unit,
) {
    val t = rememberStrings()
    Scaffold(containerColor = MaterialTheme.colorScheme.background) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    repeat(ONBOARDING_STEP_COUNT) { index ->
                        Box(
                            modifier = Modifier
                                .size(if (index == step) 20.dp else 8.dp, 8.dp)
                                .clip(CircleShape)
                                .background(
                                    if (index <= step) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                                ),
                        )
                    }
                }
                if (onSkip != null) {
                    TextButton(onClick = onSkip) { Text(t(StringKey.ONBOARDING_SKIP)) }
                }
            }
            Box(modifier = Modifier.fillMaxSize()) { content() }
        }
    }
}

// Onboarding never blocks reaching Home even if the user declined every
// optional step — this is the single place both nav-graph exits (Skip and
// Finish) funnel through, matching the brief's "never trap the user."
suspend fun completeOnboarding() {
    AppContainer.onboardingStore.markOnboardingComplete()
    AppContainer.onboardingStore.markTutorialComplete()
    AppContainer.authRepository.markOnboardingCompleted()
    AppContainer.authRepository.markTutorialCompleted()
}
