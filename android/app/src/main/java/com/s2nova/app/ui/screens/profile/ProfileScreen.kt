package com.s2nova.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.LoanKind
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

@Composable
fun ProfileScreen(
    onOpenSettings: () -> Unit,
    onOpenWallets: () -> Unit,
    onOpenRecurring: () -> Unit,
    onOpenLoans: () -> Unit,
    onLogout: () -> Unit,
) {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val recurringSeries by AppContainer.recurringSeriesRepository.series.collectAsStateWithLifecycle()
    val transactions by AppContainer.transactionRepository.transactions.collectAsStateWithLifecycle()
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val language = user?.preferences?.language ?: AppLanguage.ES

    val subscriptionsColor = categoryMap[CategoryId.SUBSCRIPTIONS]?.color?.let { Color(it) } ?: MaterialTheme.colorScheme.primary
    val salaryColor = categoryMap[CategoryId.SALARY]?.color?.let { Color(it) } ?: MaterialTheme.colorScheme.primary
    val billsColor = categoryMap[CategoryId.BILLS]?.color?.let { Color(it) } ?: MaterialTheme.colorScheme.primary

    val activeWallets = wallets.size
    val walletsTotal = wallets.sumOf { it.currentBalance }
    val walletsDetail = "$activeWallets ${t(StringKey.PROFILE_WALLETS_DETAIL)} · ${format(walletsTotal)}"

    val activeSeriesCount = recurringSeries.count { it.active }
    val recurringDetail = if (activeSeriesCount > 0) {
        "$activeSeriesCount ${t(StringKey.PROFILE_RECURRING_DETAIL)}"
    } else {
        t(StringKey.PROFILE_RECURRING_DETAIL_EMPTY)
    }

    val lentTotal = transactions.filter { it.loanKind == LoanKind.LENT && !it.loanSettled }.sumOf { it.amount }
    val borrowedTotal = transactions.filter { it.loanKind == LoanKind.BORROWED && !it.loanSettled }.sumOf { it.amount }
    val loansDetail = when {
        lentTotal == 0.0 && borrowedTotal == 0.0 -> t(StringKey.PROFILE_LOANS_DETAIL_EMPTY)
        borrowedTotal > 0.0 -> "${t(StringKey.LOANS_LENT_TAB)} ${format(lentTotal)} · ${t(StringKey.PROFILE_LOANS_DETAIL_WITH_DEBT)} ${format(borrowedTotal)}"
        else -> "${t(StringKey.LOANS_LENT_TAB)} ${format(lentTotal)} · ${t(StringKey.PROFILE_LOANS_DETAIL_NO_DEBT)}"
    }

    val memberSince = remember(user?.memberSince, language) {
        user?.memberSince?.let { formatMemberSince(it, language) }
    }

    Scaffold(containerColor = MaterialTheme.colorScheme.background) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            NovaCard(modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .background(MaterialTheme.colorScheme.primary, CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(user?.avatarInitials ?: "US", color = MaterialTheme.colorScheme.onPrimary, style = MaterialTheme.typography.titleMedium)
                    }
                    Column(modifier = Modifier.padding(start = 14.dp)) {
                        Text(user?.name ?: "", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
                        Text(user?.email ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp))
                        if (memberSince != null) {
                            Text(memberSince, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }

            NovaCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    ProfileRow(Icons.Filled.Wallet, t(StringKey.WALLETS_TITLE), walletsDetail, onClick = onOpenWallets)
                    ProfileRow(Icons.Filled.Repeat, t(StringKey.RECURRING_TITLE), recurringDetail, tint = subscriptionsColor, onClick = onOpenRecurring)
                    ProfileRow(Icons.Filled.MonetizationOn, t(StringKey.LOANS_TITLE), loansDetail, tint = salaryColor, onClick = onOpenLoans)
                    ProfileRow(Icons.Filled.Settings, t(StringKey.TITLE_SETTINGS), t(StringKey.PROFILE_SETTINGS_DETAIL), tint = billsColor, showDivider = false, onClick = onOpenSettings)
                }
            }

            Row(
                horizontalArrangement = Arrangement.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .border(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                    .clickable(onClick = onLogout)
                    .padding(14.dp),
            ) {
                Text(t(StringKey.PROFILE_LOGOUT), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyLarge)
            }
        }
    }
}

private fun formatMemberSince(memberSince: String, language: AppLanguage): String? {
    val date = runCatching { LocalDate.parse(memberSince.take(10)) }.getOrNull() ?: return null
    val locale = if (language == AppLanguage.EN) Locale.ENGLISH else Locale.forLanguageTag("es-CO")
    val month = date.month.getDisplayName(TextStyle.SHORT, locale).trimEnd('.').lowercase(locale)
    return "${stringForMemberSince(language)} $month ${date.year}"
}

private fun stringForMemberSince(language: AppLanguage): String =
    com.s2nova.app.ui.stringFor(StringKey.PROFILE_MEMBER_SINCE, language)

@Composable
private fun ProfileRow(
    icon: ImageVector,
    label: String,
    detail: String,
    tint: Color = MaterialTheme.colorScheme.primary,
    showDivider: Boolean = true,
    onClick: () -> Unit,
) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .padding(vertical = 15.dp, horizontal = 18.dp),
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
            Column(modifier = Modifier.weight(1f).padding(start = 14.dp)) {
                Text(label, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onBackground)
                Text(detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (showDivider) {
            androidx.compose.material3.HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.6f))
        }
    }
}
