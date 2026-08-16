package com.s2nova.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.s2nova.app.data.formatShortDate
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.rememberStrings

@Composable
fun TransactionRow(
    transaction: Transaction,
    modifier: Modifier = Modifier,
    showDate: Boolean = true,
    onClick: (() -> Unit)? = null,
) {
    val category = categoryMap[transaction.category]
    val t = rememberStrings()
    Row(
        modifier = modifier
            .fillMaxWidth()
            .let { if (onClick != null) it.clickable(onClick = onClick) else it }
            .padding(horizontal = 4.dp, vertical = 10.dp),
    ) {
        CategoryIcon(category = transaction.category)
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(start = 12.dp),
        ) {
            Text(
                text = transaction.description,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onBackground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            val subtitle = buildString {
                append(transaction.merchant ?: category?.let { t(categoryStringKey(it.id)) } ?: "")
                if (showDate) {
                    if (isNotEmpty()) append(" · ")
                    append(formatShortDate(transaction.date))
                }
            }
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Column(modifier = Modifier.width(110.dp), horizontalAlignment = androidx.compose.ui.Alignment.End) {
            AmountText(amount = transaction.amount, type = transaction.type)
        }
    }
}
