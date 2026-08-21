package com.s2nova.app.ui.screens.loans

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.LoanKind
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaTopBar
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch

@Composable
fun LoansScreen(onBack: () -> Unit) {
    val transactions by AppContainer.transactionRepository.transactions.collectAsStateWithLifecycle()
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val colors = NovaColors.current
    val scope = rememberCoroutineScope()
    var tab by remember { mutableStateOf(0) }
    var settlingId by remember { mutableStateOf<String?>(null) }

    val kind = if (tab == 0) LoanKind.LENT else LoanKind.BORROWED
    val items = transactions.filter { it.loanKind == kind }.sortedByDescending { it.date }

    Scaffold(
        topBar = { NovaTopBar(title = t(StringKey.LOANS_TITLE), onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            PrimaryTabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text(t(StringKey.LOANS_LENT_TAB)) })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text(t(StringKey.LOANS_BORROWED_TAB)) })
            }

            if (items.isEmpty()) {
                Column(
                    modifier = Modifier.fillMaxSize().padding(32.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(Icons.Filled.MonetizationOn, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(48.dp))
                    Text(t(StringKey.LOANS_EMPTY), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 12.dp))
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(items, key = { it.id }) { txn -> LoanCard(txn, format, t, colors, onSettle = { settlingId = txn.id }) }
                    item { Spacer(Modifier.height(72.dp)) }
                }
            }
        }

        if (settlingId != null) {
            androidx.compose.material3.AlertDialog(
                onDismissRequest = { settlingId = null },
                title = { Text(t(StringKey.LOANS_SETTLE)) },
                confirmButton = {
                    TextButton(onClick = {
                        val id = settlingId!!
                        scope.launch {
                            AppContainer.transactionRepository.settleLoan(id)
                            AppContainer.walletRepository.refresh()
                            settlingId = null
                        }
                    }) { Text(t(StringKey.LOANS_SETTLE)) }
                },
                dismissButton = { TextButton(onClick = { settlingId = null }) { Text(t(StringKey.COMMON_CANCEL)) } },
            )
        }
    }
}

@Composable
private fun LoanCard(
    txn: Transaction,
    format: com.s2nova.app.ui.CurrencyFormatter,
    t: (StringKey) -> String,
    colors: com.s2nova.app.ui.theme.NovaExtraColors,
    onSettle: () -> Unit,
) {
    NovaCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(txn.counterpartyName ?: txn.description, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
                    Text(
                        if (txn.dueDate != null) "${t(StringKey.LOANS_DUE)} ${txn.dueDate}" else t(StringKey.LOANS_NO_DUE_DATE),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(format(txn.amount), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
            }
            Spacer(Modifier.height(10.dp))
            if (txn.loanSettled) {
                Text(t(StringKey.LOANS_SETTLED), style = MaterialTheme.typography.labelMedium, color = colors.positive, fontWeight = FontWeight.Bold)
            } else {
                TextButton(onClick = onSettle) { Text(t(StringKey.LOANS_SETTLE)) }
            }
        }
    }
}
