package com.s2nova.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.StatusBadge
import com.s2nova.app.ui.components.BadgeTone
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings

@Composable
fun ProfileScreen(
    onOpenSettings: () -> Unit,
    onOpenWallets: () -> Unit,
    onOpenRecurring: () -> Unit,
    onOpenLoans: () -> Unit,
    onLogout: () -> Unit,
    onShowComingSoon: (String) -> Unit,
) {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val transactions by AppContainer.transactionRepository.transactions.collectAsStateWithLifecycle()
    val budgetProgress by AppContainer.budgetRepository.budgetProgress.collectAsStateWithLifecycle()
    val savedTotal = budgetProgress.sumOf { it.remaining.coerceAtLeast(0.0) }
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()

    Scaffold(containerColor = MaterialTheme.colorScheme.background) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .background(MaterialTheme.colorScheme.primary, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(user?.avatarInitials ?: "US", color = MaterialTheme.colorScheme.onPrimary, style = MaterialTheme.typography.titleMedium)
                }
                Text(user?.name ?: "", style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(top = 12.dp))
                Text(user?.email ?: "", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                StatusBadge(text = t(StringKey.PROFILE_DEMO_ACCOUNT), tone = BadgeTone.PRIMARY, modifier = Modifier.padding(top = 8.dp))
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 24.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                ProfileStat(value = transactions.size.toString(), label = t(StringKey.PROFILE_TRANSACTIONS))
                ProfileStat(value = budgetProgress.size.toString(), label = t(StringKey.PROFILE_BUDGETS))
                ProfileStat(value = format(savedTotal), label = t(StringKey.PROFILE_AVAILABLE))
            }

            val subscriptionsColor = categoryMap[CategoryId.SUBSCRIPTIONS]?.color?.let { Color(it) } ?: MaterialTheme.colorScheme.primary
            val salaryColor = categoryMap[CategoryId.SALARY]?.color?.let { Color(it) } ?: MaterialTheme.colorScheme.primary
            val billsColor = categoryMap[CategoryId.BILLS]?.color?.let { Color(it) } ?: MaterialTheme.colorScheme.primary

            SectionLabel(t(StringKey.PROFILE_ACCOUNT_SECURITY))
            NovaCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    ProfileRow(Icons.Filled.Wallet, t(StringKey.WALLETS_TITLE), onClick = onOpenWallets)
                    ProfileRow(Icons.Filled.Repeat, t(StringKey.RECURRING_TITLE), tint = subscriptionsColor, onClick = onOpenRecurring)
                    ProfileRow(Icons.Filled.MonetizationOn, t(StringKey.LOANS_TITLE), tint = salaryColor, onClick = onOpenLoans)
                    ProfileRow(Icons.Filled.Person, t(StringKey.PROFILE_EDIT_PROFILE), onClick = onOpenSettings)
                    ProfileRow(Icons.Filled.Lock, t(StringKey.PROFILE_CHANGE_PASSWORD), onClick = { onShowComingSoon(t(StringKey.PROFILE_CHANGE_PASSWORD)) })
                    ProfileRow(Icons.Filled.Security, t(StringKey.PROFILE_TWO_FACTOR), onClick = { onShowComingSoon(t(StringKey.PROFILE_TWO_FACTOR)) })
                }
            }

            SectionLabel(t(StringKey.PROFILE_PREFERENCES))
            NovaCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    ProfileRow(Icons.Filled.Settings, t(StringKey.TITLE_SETTINGS), tint = billsColor, onClick = onOpenSettings)
                    ProfileRow(Icons.Filled.Shield, t(StringKey.PROFILE_PRIVACY), onClick = { onShowComingSoon(t(StringKey.PROFILE_PRIVACY)) })
                    ProfileRow(Icons.Filled.Fingerprint, t(StringKey.SETTINGS_BIOMETRIC), onClick = { onShowComingSoon(t(StringKey.SETTINGS_BIOMETRIC)) })
                }
            }

            Row(
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 24.dp, bottom = 24.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .border(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                    .clickable(onClick = onLogout)
                    .padding(14.dp),
            ) {
                Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.padding(end = 8.dp))
                Text(t(StringKey.PROFILE_LOGOUT), color = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable
private fun ProfileStat(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.ExtraBold)
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(top = 24.dp, bottom = 8.dp),
    )
}

@Composable
private fun ProfileRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    tint: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.primary,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(34.dp)
                .background(tint.copy(alpha = 0.13f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(16.dp))
        }
        Text(label, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f).padding(start = 14.dp))
        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
