package com.s2nova.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.formatApprox
import com.s2nova.app.data.formatMoney
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.repository.CategoryRepository
import com.s2nova.app.data.repository.displayName
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.NovaType
import com.s2nova.app.ui.tr
import kotlin.math.abs

// ListRow (DESIGN-SYSTEM.md §6.2) for Movimientos: category mark 40, a
// one-line title and meta line, and an intrinsic-width amount column that
// never shrinks; at least 64 dp tall. The attachment and repeat badges and
// a `warning` clock for a Programado sit in the meta line, not next to the title.
// Transfers move money between the user's own wallets, so they carry no
// sign and use the text color. The row reads as one sentence.
@Composable
fun TransactionRow(
    transaction: Transaction,
    subtitle: String,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
) {
    val colors = NovaColors.current
    val principal = AppContainer.currencyRepository.principal
    val scheduled = transaction.status == TransactionStatus.PLANNED
    val money = formatMoney(abs(transaction.amount), transaction.currency)
    val (amount, color) = when (transaction.type) {
        TransactionType.INCOME -> "+$money" to colors.positive
        TransactionType.EXPENSE -> "−$money" to colors.negative
        TransactionType.TRANSFER -> money to MaterialTheme.colorScheme.onSurface
    }
    val conv = if (transaction.currency != principal) {
        "≈ " + formatApprox(abs(transaction.amount) * AppContainer.currencyRepository.rate(transaction.currency, principal), principal)
    } else null
    val title = transaction.displayName(AppContainer.categoryRepository)
    val kind = tr(
        when (transaction.type) {
            TransactionType.INCOME -> StringKey.NM_TYPE_INCOME
            TransactionType.EXPENSE -> StringKey.NM_TYPE_EXPENSE
            TransactionType.TRANSFER -> StringKey.NM_TYPE_TRANSFER
        },
    )
    val programado = tr(StringKey.MV_SCHEDULED_ONE)
    val description = listOfNotNull(title, if (scheduled) programado else null, subtitle.takeIf { it.isNotBlank() }, "$kind $money", conv)
        .joinToString(", ")
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 64.dp)
            .let { if (onClick != null) it.clickable(onClick = onClick) else it }
            .clearAndSetSemantics {
                contentDescription = description
                if (onClick != null) role = Role.Button
            }
            .padding(horizontal = 16.dp, vertical = 12.dp),
    ) {
        CatMark(if (transaction.type == TransactionType.TRANSFER) CategoryRepository.TRANSFER else transaction.subcategoryId ?: transaction.category, 40.dp)
        Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
            Text(title, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                // Programados already sit under their own `warning` heading, so the
                // row marks them with a clock (not color alone) instead of a tag
                // that would crowd out the meta line on narrow screens.
                if (scheduled) V2Icon(V2Icons.clock, colors.warning, 14.dp)
                Text(
                    subtitle,
                    style = NovaType.bodySm,
                    color = colors.textDim,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
                if (transaction.attachment != null) V2Icon(V2Icons.clip, colors.textDim, 14.dp)
                if (transaction.recurringSeriesId != null) V2Icon(V2Icons.repeat, colors.textDim, 14.dp)
            }
        }
        Column(horizontalAlignment = Alignment.End, modifier = Modifier.padding(start = 12.dp)) {
            Text(amount, style = NovaType.amount, color = color, maxLines = 1, softWrap = false)
            if (conv != null) {
                Text(conv, style = NovaType.caption.copy(fontFeatureSettings = "tnum"), color = colors.textDim, maxLines = 1, softWrap = false)
            }
        }
    }
}
