package com.s2nova.app.ui.screens.profile

import androidx.compose.foundation.background
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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.StatusBadge
import com.s2nova.app.ui.components.BadgeTone
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings

@Composable
fun ProfileScreen(
    onOpenSettings: () -> Unit,
    onLogout: () -> Unit,
    onShowComingSoon: (String) -> Unit,
) {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val transactions by AppContainer.transactionRepository.transactions.collectAsStateWithLifecycle()
    val budgets by AppContainer.budgetRepository.budgets.collectAsStateWithLifecycle()
    val savedTotal = budgets.sumOf { b -> (AppContainer.budgetRepository.progressFor(b, transactions)).remaining.coerceAtLeast(0.0) }
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
                        .size(84.dp)
                        .background(MaterialTheme.colorScheme.primary, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(user?.avatarInitials ?: "US", color = MaterialTheme.colorScheme.onPrimary, style = MaterialTheme.typography.headlineMedium)
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
                ProfileStat(value = budgets.size.toString(), label = t(StringKey.PROFILE_BUDGETS))
                ProfileStat(value = format(savedTotal), label = t(StringKey.PROFILE_AVAILABLE))
            }

            SectionLabel(t(StringKey.PROFILE_ACCOUNT_SECURITY))
            NovaCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    ProfileRow(Icons.Filled.Person, t(StringKey.PROFILE_EDIT_PROFILE), onClick = onOpenSettings)
                    ProfileRow(Icons.Filled.Lock, t(StringKey.PROFILE_CHANGE_PASSWORD), onClick = { onShowComingSoon(t(StringKey.PROFILE_CHANGE_PASSWORD)) })
                    ProfileRow(Icons.Filled.Security, t(StringKey.PROFILE_TWO_FACTOR), onClick = { onShowComingSoon(t(StringKey.PROFILE_TWO_FACTOR)) })
                }
            }

            SectionLabel(t(StringKey.PROFILE_PREFERENCES))
            NovaCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    ProfileRow(Icons.Filled.Settings, t(StringKey.TITLE_SETTINGS), onClick = onOpenSettings)
                    ProfileRow(Icons.Filled.Shield, t(StringKey.PROFILE_PRIVACY), onClick = { onShowComingSoon(t(StringKey.PROFILE_PRIVACY)) })
                    ProfileRow(Icons.Filled.Fingerprint, t(StringKey.SETTINGS_BIOMETRIC), onClick = { onShowComingSoon(t(StringKey.SETTINGS_BIOMETRIC)) })
                }
            }

            Button(
                onClick = onLogout,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer,
                    contentColor = MaterialTheme.colorScheme.error,
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 24.dp, bottom = 24.dp),
            ) {
                Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                Text(t(StringKey.PROFILE_LOGOUT))
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
private fun ProfileRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
        Text(label, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f).padding(start = 14.dp))
        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
