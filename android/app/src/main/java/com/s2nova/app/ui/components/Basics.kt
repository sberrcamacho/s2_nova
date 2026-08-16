package com.s2nova.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.theme.NovaColors

@Composable
fun AmountText(amount: Double, type: TransactionType, modifier: Modifier = Modifier) {
    val colors = NovaColors.current
    val format = rememberCurrencyFormatter()
    val signed = if (type == TransactionType.INCOME) amount else -amount
    Text(
        text = format(signed, signed = true),
        color = if (type == TransactionType.INCOME) colors.positive else colors.negative,
        style = MaterialTheme.typography.titleSmall,
        modifier = modifier,
    )
}

enum class BadgeTone { PRIMARY, POSITIVE, NEGATIVE, WARNING, NEUTRAL }

@Composable
fun StatusBadge(text: String, tone: BadgeTone, modifier: Modifier = Modifier) {
    val colors = NovaColors.current
    val (bg, fg) = when (tone) {
        BadgeTone.PRIMARY -> MaterialTheme.colorScheme.primaryContainer to MaterialTheme.colorScheme.primary
        BadgeTone.POSITIVE -> colors.positiveSoft to colors.positive
        BadgeTone.NEGATIVE -> colors.negativeSoft to colors.negative
        BadgeTone.WARNING -> colors.warningSoft to colors.warning
        BadgeTone.NEUTRAL -> MaterialTheme.colorScheme.surfaceVariant to MaterialTheme.colorScheme.onSurfaceVariant
    }
    Text(
        text = text,
        color = fg,
        style = MaterialTheme.typography.labelSmall,
        modifier = modifier
            .background(bg, RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    )
}

@Composable
fun cardBorder(): Modifier = Modifier.border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(18.dp))

fun budgetStatusColor(status: com.s2nova.app.data.model.BudgetStatus, colors: com.s2nova.app.ui.theme.NovaExtraColors): Color = when (status) {
    com.s2nova.app.data.model.BudgetStatus.OVER_BUDGET -> colors.negative
    com.s2nova.app.data.model.BudgetStatus.NEAR_LIMIT -> colors.warning
    com.s2nova.app.data.model.BudgetStatus.ON_TRACK -> colors.positive
}

fun badgeToneFor(status: com.s2nova.app.data.model.BudgetStatus): BadgeTone = when (status) {
    com.s2nova.app.data.model.BudgetStatus.OVER_BUDGET -> BadgeTone.NEGATIVE
    com.s2nova.app.data.model.BudgetStatus.NEAR_LIMIT -> BadgeTone.WARNING
    com.s2nova.app.data.model.BudgetStatus.ON_TRACK -> BadgeTone.POSITIVE
}
