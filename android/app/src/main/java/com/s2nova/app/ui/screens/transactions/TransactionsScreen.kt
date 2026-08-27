package com.s2nova.app.ui.screens.transactions

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.formatLongDate
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.components.NovaTopBar
import com.s2nova.app.ui.components.TransactionRow
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors

private enum class TypeFilter(val key: StringKey) {
    ALL(StringKey.TXN_LIST_FILTER_ALL),
    EXPENSE(StringKey.HOME_EXPENSES),
    INCOME(StringKey.HOME_INCOME),
    PENDING(StringKey.TXN_LIST_FILTER_PENDING),
}

@Composable
fun TransactionsScreen(
    onBack: () -> Unit,
    onOpenDetail: (String) -> Unit,
) {
    val transactions by AppContainer.transactionRepository.transactions.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    var search by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf(TypeFilter.ALL) }
    val t = rememberStrings()
    val format = rememberCurrencyFormatter()
    val colors = NovaColors.current

    val filtered = transactions.filter { t ->
        val matchesType = when (filter) {
            TypeFilter.ALL -> true
            TypeFilter.INCOME -> t.type == TransactionType.INCOME
            TypeFilter.EXPENSE -> t.type == TransactionType.EXPENSE
            TypeFilter.PENDING -> t.status == TransactionStatus.PLANNED
        }
        val q = search.trim().lowercase()
        val matchesSearch = q.isEmpty() || t.description.lowercase().contains(q) || (t.merchant?.lowercase()?.contains(q) == true)
        matchesType && matchesSearch
    }

    Scaffold(
        topBar = { NovaTopBar(title = t(StringKey.TITLE_TRANSACTIONS), onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                OutlinedTextField(
                    value = search,
                    onValueChange = { search = it },
                    placeholder = { Text(t(StringKey.TXN_LIST_SEARCH_PLACEHOLDER)) },
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    TypeFilter.entries.forEach { f ->
                        FilterPill(label = t(f.key), selected = filter == f, onClick = { filter = f })
                    }
                }
            }

            if (filtered.isEmpty()) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(top = 48.dp),
                    horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
                ) {
                    Text(t(StringKey.TXN_LIST_EMPTY_TITLE), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
                    Text(t(StringKey.TXN_LIST_EMPTY_SUBTITLE), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                LazyColumn(contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp)) {
                    val grouped = filtered.groupBy { it.date }
                    grouped.forEach { (date, txns) ->
                        item {
                            val netTotal = txns.sumOf { if (it.type == TransactionType.INCOME) it.amount else -it.amount }
                            Row(modifier = Modifier.padding(top = 12.dp, bottom = 4.dp)) {
                                Text(
                                    formatLongDate(date),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    " · ${format(netTotal, signed = true)}",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = if (netTotal >= 0) colors.positive else colors.negative,
                                )
                            }
                        }
                        items(txns) { txn: Transaction ->
                            val merchantOrCategory = txn.merchant
                                ?: categoryMap[txn.category]?.let { t(categoryStringKey(it.id)) }
                                ?: ""
                            val walletName = wallets.firstOrNull { it.id == txn.walletId }?.name
                            val subtitle = if (walletName != null) "$merchantOrCategory · $walletName" else merchantOrCategory
                            TransactionRow(transaction = txn, subtitleOverride = subtitle, onClick = { onOpenDetail(txn.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FilterPill(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        label,
        style = MaterialTheme.typography.bodyMedium,
        color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onBackground,
        maxLines = 1,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
            .selectable(selected = selected, onClick = onClick, role = androidx.compose.ui.semantics.Role.RadioButton)
            .padding(horizontal = 14.dp, vertical = 10.dp),
    )
}
