package com.s2nova.app.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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

// The mockup's switch: a 42x24 track with 3px padding and no box-sizing,
// so it renders 48x30, and an 18dp white knob that sits at the top of the
// padded area (the flex row doesn't centre it). Material3's Switch can't
// be sized to match, hence this small replacement.
@Composable
fun NovaSwitch(checked: Boolean, onCheckedChange: (Boolean) -> Unit, modifier: Modifier = Modifier) {
    val trackColor = if (checked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant
    val offset by animateDpAsState(targetValue = if (checked) 27.dp else 3.dp, animationSpec = tween(150), label = "switchKnob")
    Box(
        modifier = modifier
            .size(width = 48.dp, height = 30.dp)
            .clip(RoundedCornerShape(50))
            .background(trackColor)
            .clickable { onCheckedChange(!checked) },
    ) {
        Box(
            modifier = Modifier
                .offset(x = offset, y = 3.dp)
                .size(18.dp)
                .background(Color.White, CircleShape),
        )
    }
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

fun Modifier.dashedBorder(color: Color): Modifier = this.drawBehind {
    val strokeWidth = 1.5.dp.toPx()
    val cornerRadius = 16.dp.toPx()
    drawRoundRect(
        color = color,
        style = androidx.compose.ui.graphics.drawscope.Stroke(
            width = strokeWidth,
            pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(8f, 6f), 0f),
        ),
        cornerRadius = androidx.compose.ui.geometry.CornerRadius(cornerRadius, cornerRadius),
    )
}

// Dashed "+ <label>" row for adding a new budget/goal/loan — mockup:
// 1.5dp dashed --line2 border, 16dp corners, 14dp padding, a text "+" at
// 15 and the label at 12.5 ExtraBold, both in --accent2.
@Composable
fun DashedNewRow(label: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val accent = NovaColors.current.accentText
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .dashedBorder(MaterialTheme.colorScheme.outlineVariant)
            .clickable(onClick = onClick)
            .padding(14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("+", color = accent, fontSize = 15.sp, lineHeight = 15.sp, fontWeight = FontWeight.ExtraBold)
            Text(label, color = accent, fontSize = 12.5.sp, fontWeight = FontWeight.ExtraBold)
        }
    }
}
