package com.s2nova.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.repository.displayName
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.theme.NovaColors
import kotlin.math.abs

// Movimientos row, per the Android v2 mockup: 38dp category mark, 13sp bold
// description, "comercio · billetera" in 11sp dim, 13.5sp amount with the
// mockup's typographic minus, and a subtle divider under each row.
// Transfers move money between the user's own wallets, so they carry no
// sign and use the text color.
@Composable
fun TransactionRow(
    transaction: Transaction,
    subtitle: String,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
) {
    val colors = NovaColors.current
    val principal = com.s2nova.app.data.AppContainer.currencyRepository.principal
    val scheduled = transaction.status == com.s2nova.app.data.model.TransactionStatus.PLANNED
    val money = com.s2nova.app.data.formatMoney(abs(transaction.amount), transaction.currency)
    val (amount, color) = when (transaction.type) {
        TransactionType.INCOME -> "+$money" to colors.positive
        TransactionType.EXPENSE -> "\u2212$money" to colors.negative
        TransactionType.TRANSFER -> money to MaterialTheme.colorScheme.onBackground
    }
    val conv = if (transaction.currency != principal) {
        "≈ " + com.s2nova.app.data.formatMoney(abs(transaction.amount) * com.s2nova.app.data.AppContainer.currencyRepository.rate(transaction.currency, principal), principal)
    } else null
    Column(modifier = modifier.let { if (onClick != null) it.clickable(onClick = onClick) else it }) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 12.dp)) {
            CatMark(if (transaction.type == TransactionType.TRANSFER) com.s2nova.app.data.repository.CategoryRepository.TRANSFER else transaction.subcategoryId ?: transaction.category, 38.dp)
            Column(modifier = Modifier.weight(1f).padding(start = 13.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(6.dp)) {
                    Text(
                        transaction.displayName(com.s2nova.app.data.AppContainer.categoryRepository),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    if (transaction.attachment != null) V2Icon(V2Icons.clip, colors.textDim, 13.dp)
                    if (transaction.recurringSeriesId != null) V2Icon(V2Icons.repeat, colors.textDim, 13.dp)
                }
                Text(subtitle, fontSize = 11.sp, color = colors.textDim, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Column(horizontalAlignment = Alignment.End, modifier = Modifier.padding(start = 13.dp)) {
                Text(amount, fontSize = 13.5.sp, fontWeight = FontWeight.ExtraBold, color = if (scheduled) MaterialTheme.colorScheme.onSurfaceVariant else color, style = androidx.compose.ui.text.TextStyle(fontFeatureSettings = TNUM))
                if (conv != null) Text(conv, fontSize = 10.5.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp), style = androidx.compose.ui.text.TextStyle(fontFeatureSettings = TNUM))
            }
        }
        HorizontalDivider(thickness = 1.dp, color = colors.dividerSubtle)
    }
}
