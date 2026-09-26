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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.fmtDate
import com.s2nova.app.data.formatMoney
import com.s2nova.app.ui.screens.addtransaction.shortWallet
import com.s2nova.app.data.formatDayGroupDate
import com.s2nova.app.data.todayISO
import com.s2nova.app.ui.components.categoryColor
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.ui.components.categoryName
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
                Text(
                    "Aún no tienes movimientos. Registra el primero con el botón +.",
                    fontSize = 12.sp, lineHeight = 18.sp, color = colors.textDim, textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 28.dp),
                )
            } else {
                LazyColumn(contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 20.dp)) {
                    val principal = AppContainer.currencyRepository.principal
                    val scheduled = filtered.filter { it.status == TransactionStatus.PLANNED }.sortedBy { it.date + it.time }
                    val groups = buildList {
                        if (scheduled.isNotEmpty()) add("sched" to scheduled)
                        filtered.filter { it.status != TransactionStatus.PLANNED }.sortedByDescending { it.date + it.time }
                            .groupBy { it.date }.forEach { (d, list) -> add(d to list) }
                    }
                    groups.forEachIndexed { index, (key, txns) ->
                        item {
                            // Transfers stay inside the user's wallets, so they don't move the day's net.
                            val netTotal = txns.sumOf {
                                val v = it.amount * AppContainer.currencyRepository.rate(it.currency, principal)
                                when (it.type) {
                                    TransactionType.INCOME -> v
                                    TransactionType.EXPENSE -> -v
                                    TransactionType.TRANSFER -> 0.0
                                }
                            }
                            val sched = key == "sched"
                            val dayLabel = when (key) {
                                "sched" -> "PROGRAMADOS"
                                today -> t(StringKey.TXN_LIST_TODAY)
                                yesterday -> t(StringKey.TXN_LIST_YESTERDAY)
                                else -> formatDayGroupDate(key)
                            }.uppercase()
                            Text(
                                buildAnnotatedString {
                                    append("$dayLabel · ")
                                    withStyle(SpanStyle(color = if (sched) colors.warning else if (netTotal >= 0) colors.positive else colors.textDim)) {
                                        append((if (netTotal >= 0) "+" else "\u2212") + formatMoney(kotlin.math.abs(netTotal), principal))
                                    }
                                },
                                style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.5.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.1.em, fontFeatureSettings = "tnum"),
                                color = if (sched) colors.warning else colors.textDim,
                                modifier = Modifier.padding(top = if (index == 0) 8.dp else 18.dp, bottom = 4.dp),
                            )
                        }
                        items(txns, key = { it.id }) { txn: Transaction ->
                            val walletName = wallets.firstOrNull { it.id == txn.walletId }?.name?.let { shortWallet(it) }
                            val subtitle = if (txn.status == TransactionStatus.PLANNED) {
                                listOfNotNull("Programado", fmtDate(txn.date), walletName).joinToString(" · ")
                            } else {
                                listOfNotNull((txn.merchant ?: txn.counterpartyName)?.takeIf { it.isNotBlank() }, walletName).joinToString(" · ")
                            }
                            TransactionRow(transaction = txn, subtitle = subtitle, onClick = { onOpenDetail(txn.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FilterPill(label: String, selected: Boolean, onClick: () -> Unit) {
    val colors = NovaColors.current
    Text(
        label,
        fontSize = 12.sp,
        fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold,
        color = if (selected) MaterialTheme.colorScheme.onPrimary else colors.pillText,
        maxLines = 1,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) MaterialTheme.colorScheme.primary else colors.pillSurface)
            .border(1.dp, if (selected) Color.Transparent else colors.pillBorder, RoundedCornerShape(50))
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
