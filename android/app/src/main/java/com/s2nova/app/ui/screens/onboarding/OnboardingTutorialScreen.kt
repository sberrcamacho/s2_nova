package com.s2nova.app.ui.screens.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.PieChart
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch

private data class TutorialPage(val icon: ImageVector, val titleKey: StringKey, val bodyKey: StringKey)

private val tutorialPages = listOf(
    TutorialPage(Icons.Filled.Wallet, StringKey.ONBOARDING_TUTORIAL_TRACK_TITLE, StringKey.ONBOARDING_TUTORIAL_TRACK_BODY),
    TutorialPage(Icons.Filled.QrCodeScanner, StringKey.ONBOARDING_TUTORIAL_SCAN_TITLE, StringKey.ONBOARDING_TUTORIAL_SCAN_BODY),
    TutorialPage(Icons.Filled.PieChart, StringKey.ONBOARDING_TUTORIAL_ORGANIZE_TITLE, StringKey.ONBOARDING_TUTORIAL_ORGANIZE_BODY),
    TutorialPage(Icons.Filled.BarChart, StringKey.ONBOARDING_TUTORIAL_ANALYZE_TITLE, StringKey.ONBOARDING_TUTORIAL_ANALYZE_BODY),
    TutorialPage(Icons.Filled.CheckCircle, StringKey.ONBOARDING_TUTORIAL_READY_TITLE, StringKey.ONBOARDING_TUTORIAL_READY_BODY),
)

@Composable
fun OnboardingTutorialScreen(onFinish: () -> Unit, onSkip: () -> Unit) {
    val t = rememberStrings()
    val colors = NovaColors.current
    val pagerState = rememberPagerState(pageCount = { tutorialPages.size })
    val scope = rememberCoroutineScope()

    OnboardingScaffold(step = 4, onSkip = if (pagerState.currentPage < tutorialPages.lastIndex) onSkip else null) {
        Column(modifier = Modifier.fillMaxSize()) {
            HorizontalPager(state = pagerState, modifier = Modifier.weight(1f)) { page ->
                val item = tutorialPages[page]
                Column(
                    modifier = Modifier.fillMaxSize().padding(top = 24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Box(
                        modifier = Modifier
                            .size(96.dp)
                            .clip(CircleShape)
                            .background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(colors.heroFrom, colors.heroTo))),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(item.icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(40.dp))
                    }
                    Text(
                        t(item.titleKey),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onBackground,
                        modifier = Modifier.padding(top = 24.dp),
                    )
                    Text(
                        t(item.bodyKey),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 10.dp, start = 12.dp, end = 12.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                if (pagerState.currentPage > 0) {
                    OutlinedButton(
                        onClick = { scope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) } },
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.weight(1f),
                    ) {
                        Text(t(StringKey.ONBOARDING_BACK))
                    }
                }
                Button(
                    onClick = {
                        if (pagerState.currentPage < tutorialPages.lastIndex) {
                            scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                        } else {
                            onFinish()
                        }
                    },
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier.weight(1f),
                ) {
                    Text(if (pagerState.currentPage < tutorialPages.lastIndex) t(StringKey.ONBOARDING_NEXT) else t(StringKey.ONBOARDING_FINISH))
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}
