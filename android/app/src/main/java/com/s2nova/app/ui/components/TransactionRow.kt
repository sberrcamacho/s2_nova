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
    val format = rememberCurrencyFormatter()
    val (amount, color) = when (transaction.type) {
        TransactionType.INCOME -> "+" + format(abs(transaction.amount)) to colors.positive
        TransactionType.EXPENSE -> "\u2212" + format(abs(transaction.amount)) to colors.negative
        TransactionType.TRANSFER -> format(abs(transaction.amount)) to MaterialTheme.colorScheme.onBackground
    }
    Column(modifier = modifier.let { if (onClick != null) it.clickable(onClick = onClick) else it }) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 12.dp)) {
            CategoryIcon(category = transaction.category, subcategoryId = transaction.subcategoryId, size = CategoryIconSize.ROW)
            Column(modifier = Modifier.weight(1f).padding(start = 13.dp)) {
                Text(
                    transaction.description,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(subtitle, fontSize = 11.sp, color = colors.textDim, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Text(amount, fontSize = 13.5.sp, fontWeight = FontWeight.ExtraBold, color = color, modifier = Modifier.padding(start = 13.dp))
        }
        HorizontalDivider(thickness = 1.dp, color = colors.dividerSubtle)
    }
}
