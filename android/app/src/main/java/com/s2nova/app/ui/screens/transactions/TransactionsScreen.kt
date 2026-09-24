package com.s2nova.app.ui.screens.transactions

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.formatDayGroupDate
import com.s2nova.app.data.todayISO
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.components.TransactionRow
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import java.time.LocalDate

private enum class TypeFilter(val key: StringKey) {
    ALL(StringKey.TXN_LIST_FILTER_ALL),
    EXPENSE(StringKey.HOME_EXPENSES),
    INCOME(StringKey.HOME_INCOME),
    PENDING(StringKey.TXN_LIST_FILTER_PENDING),
}

@Composable
fun TransactionsScreen(
    onOpenRecurring: () -> Unit,
    onOpenDetail: (String) -> Unit,
) {
    val transactions by AppContainer.transactionRepository.transactions.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    var filter by remember { mutableStateOf(TypeFilter.ALL) }
    val t = rememberStrings()
    val format = rememberCurrencyFormatter()
    val colors = NovaColors.current
    val today = todayISO()
    val yesterday = remember(today) { LocalDate.parse(today).minusDays(1).toString() }

    val filtered = transactions.filter { txn ->
        when (filter) {
            TypeFilter.ALL -> true
            TypeFilter.INCOME -> txn.type == TransactionType.INCOME
            TypeFilter.EXPENSE -> txn.type == TransactionType.EXPENSE
            TypeFilter.PENDING -> txn.status == TransactionStatus.PLANNED
        }
    }

    Scaffold(
        // Movimientos is a bottom-bar tab (v2): title at 21, no back arrow,
        // and the "Programados" pill on the right.
        topBar = { MovimientosHeader(title = t(StringKey.TITLE_TRANSACTIONS), programados = t(StringKey.HOME_UPCOMING_LINK), onOpenRecurring = onOpenRecurring) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp, bottom = 12.dp),
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
                            val dayLabel = when (date) {
                                today -> t(StringKey.TXN_LIST_TODAY)
                                yesterday -> t(StringKey.TXN_LIST_YESTERDAY)
                                else -> formatDayGroupDate(date)
                            }.uppercase()
                            Text(
                                buildAnnotatedString {
                                    append("$dayLabel · ")
                                    withStyle(SpanStyle(color = if (netTotal > 0) colors.positive else MaterialTheme.colorScheme.onSurfaceVariant)) {
                                        append(format(netTotal, signed = true))
                                    }
                                },
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontSize = 10.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 0.1.em,
                                ),
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 12.dp, bottom = 4.dp),
                            )
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
        fontSize = 12.sp,
        fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold,
        color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onBackground,
        maxLines = 1,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
            .selectable(selected = selected, onClick = onClick, role = androidx.compose.ui.semantics.Role.RadioButton)
            .padding(horizontal = 14.dp, vertical = 9.dp),
    )
}

@Composable
private fun MovimientosHeader(title: String, programados: String, onOpenRecurring: () -> Unit) {
    val colors = NovaColors.current
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 18.dp, end = 18.dp, top = 10.dp, bottom = 12.dp),
    ) {
        Text(
            title,
            fontSize = 21.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = (-0.42).sp,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.weight(1f).padding(start = 2.dp),
        )
        Box(
            modifier = Modifier
                .height(34.dp)
                .clip(RoundedCornerShape(50))
                .background(MaterialTheme.colorScheme.surface)
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(50))
                .clickable(onClick = onOpenRecurring)
                .padding(horizontal = 12.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(programados, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = colors.accentText)
        }
    }
}
