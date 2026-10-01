package com.s2nova.app.ui.screens.transactions

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.HorizontalDivider
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.width
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.semantics.semantics
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.theme.NovaType
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
import com.s2nova.app.data.formatApprox
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
import com.s2nova.app.ui.tr

private enum class TypeFilter(val key: StringKey) {
    ALL(StringKey.TXN_LIST_FILTER_ALL),
    EXPENSE(StringKey.HOME_EXPENSES),
    INCOME(StringKey.HOME_INCOME),
    PENDING(StringKey.TXN_LIST_FILTER_PENDING),
}

@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
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
        // Movimientos is a bottom-bar tab: headline title, no back arrow, and
        // the Programados screen on the right.
        topBar = { MovimientosHeader(title = t(StringKey.TITLE_TRANSACTIONS), programados = t(StringKey.HOME_UPCOMING_LINK), onOpenRecurring = onOpenRecurring) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            // Chips wrap instead of clipping the last one on narrow phones or
            // with large text.
            FlowRow(
                modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, bottom = 8.dp).selectableGroup(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                TypeFilter.entries.forEach { f ->
                    FilterPill(label = t(f.key), selected = filter == f, onClick = { filter = f })
                }
            }

            if (filtered.isEmpty()) {
                Text(
                    tr(StringKey.MV_EMPTY),
                    style = NovaType.bodySm, color = colors.textDim, textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 28.dp),
                )
            } else {
                // Flat layout (DESIGN-SYSTEM.md §5.1): one `surface` card per day
                // with `divider` between rows. The bottom padding clears the FAB.
                LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 56.dp)) {
                    val principal = AppContainer.currencyRepository.principal
                    val scheduled = filtered.filter { it.status == TransactionStatus.PLANNED }.sortedBy { it.date + it.time }
                    val groups = buildList {
                        if (scheduled.isNotEmpty()) add("sched" to scheduled)
                        filtered.filter { it.status != TransactionStatus.PLANNED }.sortedByDescending { it.date + it.time }
                            .groupBy { it.date }.forEach { (d, list) -> add(d to list) }
                    }
                    groups.forEachIndexed { index, (key, txns) ->
                        item(key = "h-$key") {
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
                                "sched" -> tr(StringKey.MV_SCHEDULED)
                                today -> t(StringKey.TXN_LIST_TODAY)
                                yesterday -> t(StringKey.TXN_LIST_YESTERDAY)
                                else -> formatDayGroupDate(key)
                            }.uppercase()
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(start = 4.dp, end = 4.dp, top = if (index == 0) 8.dp else 20.dp, bottom = 8.dp)
                                    .semantics(mergeDescendants = true) { heading() },
                            ) {
                                Text(
                                    dayLabel,
                                    style = NovaType.overline,
                                    color = if (sched) colors.warning else colors.textDim,
                                    maxLines = 1,
                                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f),
                                )
                                Text(
                                    (if (netTotal >= 0) "+" else "\u2212") + formatApprox(kotlin.math.abs(netTotal), principal),
                                    style = NovaType.overline.copy(fontFeatureSettings = "tnum"),
                                    color = if (sched) colors.warning else if (netTotal >= 0) colors.positive else colors.textDim,
                                    maxLines = 1,
                                    softWrap = false,
                                    modifier = Modifier.padding(start = 12.dp),
                                )
                            }
                        }
                        itemsIndexed(txns, key = { _, it -> it.id }) { i, txn: Transaction ->
                            val walletName = wallets.firstOrNull { it.id == txn.walletId }?.name?.let { shortWallet(it) }
                            val subtitle = if (txn.status == TransactionStatus.PLANNED) {
                                listOfNotNull(fmtDate(txn.date), walletName).joinToString(" · ")
                            } else {
                                listOfNotNull((txn.merchant ?: txn.counterpartyName)?.takeIf { it.isNotBlank() }, walletName).joinToString(" · ")
                            }
                            val first = i == 0
                            val last = i == txns.lastIndex
                            val shape = RoundedCornerShape(
                                topStart = if (first) 20.dp else 0.dp, topEnd = if (first) 20.dp else 0.dp,
                                bottomStart = if (last) 20.dp else 0.dp, bottomEnd = if (last) 20.dp else 0.dp,
                            )
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(shape)
                                    .background(MaterialTheme.colorScheme.surface)
                                    .cardBorder(MaterialTheme.colorScheme.outline, first, last),
                            ) {
                                TransactionRow(transaction = txn, subtitle = subtitle, onClick = { onOpenDetail(txn.id) })
                                if (!last) HorizontalDivider(thickness = 1.dp, color = colors.dividerSubtle, modifier = Modifier.padding(horizontal = 16.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

// A day card is split across lazy items (one per row), so each item draws
// its part of the card's 1 dp border: both sides, plus the rounded top edge
// on the first row and the rounded bottom edge on the last. A one-row card
// uses a plain border.
private fun Modifier.cardBorder(color: Color, first: Boolean, last: Boolean): Modifier =
    if (first && last) this.border(1.dp, color, RoundedCornerShape(20.dp)) else this.drawWithContent {
        drawContent()
        val w = 1.dp.toPx()
        val r = 20.dp.toPx()
        val t = w / 2
        val x0 = t
        val x1 = size.width - t
        val h = size.height
        val y = h - t
        val path = Path().apply {
            when {
                first -> {
                    moveTo(x0, h)
                    lineTo(x0, t + r)
                    arcTo(Rect(x0, t, x0 + 2 * r, t + 2 * r), 180f, 90f, false)
                    lineTo(x1 - r, t)
                    arcTo(Rect(x1 - 2 * r, t, x1, t + 2 * r), 270f, 90f, false)
                    lineTo(x1, h)
                }
                last -> {
                    moveTo(x0, 0f)
                    lineTo(x0, y - r)
                    arcTo(Rect(x0, y - 2 * r, x0 + 2 * r, y), 180f, -90f, false)
                    lineTo(x1 - r, y)
                    arcTo(Rect(x1 - 2 * r, y - 2 * r, x1, y), 90f, -90f, false)
                    lineTo(x1, 0f)
                }
                else -> {
                    moveTo(x0, 0f); lineTo(x0, h)
                    moveTo(x1, 0f); lineTo(x1, h)
                }
            }
        }
        drawPath(path, color, style = Stroke(w))
    }

@Composable
private fun FilterPill(label: String, selected: Boolean, onClick: () -> Unit) = com.s2nova.app.ui.components.V2Pill(label, selected, onClick)

// The title keeps its full width: when it and the labeled Programados button
// don't fit on one line (narrow phones, large text), the button drops to an
// icon-only 48 dp button with the same accessible name.
@Composable
private fun MovimientosHeader(title: String, programados: String, onOpenRecurring: () -> Unit) {
    val measurer = rememberTextMeasurer()
    val density = LocalDensity.current
    BoxWithConstraints(modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 8.dp)) {
        val titleWidth = with(density) { measurer.measure(title, NovaType.headline).size.width.toDp() }
        val labelWidth = with(density) { measurer.measure(programados, NovaType.label).size.width.toDp() }
        // 14 + 18 icon + 8 + label + 14, plus a 16 dp gap after the title.
        val labeled = titleWidth + 16.dp + 54.dp + labelWidth <= maxWidth
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                title,
                style = NovaType.headline,
                color = MaterialTheme.colorScheme.onBackground,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f).semantics { heading() },
            )
            // Secondary button (§6.3) at the tonal height: 40 dp on a 48 dp target.
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .height(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .clickable(role = Role.Button, onClick = onOpenRecurring)
                    .then(if (labeled) Modifier else Modifier.width(48.dp).semantics { contentDescription = programados }),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier
                        .height(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.surface)
                        .border(1.dp, NovaColors.current.borderInput, RoundedCornerShape(12.dp))
                        .padding(horizontal = if (labeled) 14.dp else 10.dp),
                ) {
                    V2Icon(V2Icons.repeat, MaterialTheme.colorScheme.onSurface, 18.dp)
                    if (labeled) Text(programados, style = NovaType.label, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, softWrap = false)
                }
            }
        }
    }
}
