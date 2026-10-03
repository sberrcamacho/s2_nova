package com.s2nova.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.NovaType

// Heads-up before Guardar leaves a wallet below zero (DESIGN-SYSTEM.md §6.11):
// a `surface-raised` dialog with the warning tile, the balance before and
// after the movement, and two full-width buttons. Revisar is the primary,
// safe path; saving anyway stays one tap away as the secondary button.
// `available`, `spend` and `left` arrive already formatted; the sign and
// figure of each one must not wrap apart.
@Composable
fun OverdraftDialog(
    title: String,
    body: String,
    availableLabel: String,
    available: String,
    spendLabel: String,
    spend: String,
    leftLabel: String,
    left: String,
    review: String,
    confirm: String,
    onReview: () -> Unit,
    onConfirm: () -> Unit,
) {
    val colors = NovaColors.current
    val shape = RoundedCornerShape(28.dp)
    Dialog(onDismissRequest = onReview) {
        Column(
            modifier = Modifier
                .widthIn(max = 400.dp)
                .fillMaxWidth()
                .shadow(24.dp, shape, ambientColor = Color.Black.copy(alpha = 0.3f), spotColor = Color.Black.copy(alpha = 0.3f))
                .clip(shape)
                .background(colors.surfaceRaised)
                .semantics { paneTitle = title }
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier.size(56.dp).clip(CircleShape).background(colors.warningSoft),
                contentAlignment = Alignment.Center,
            ) {
                V2Icon(V2Icons.warn, colors.warning, size = 28.dp)
            }
            Spacer(Modifier.height(16.dp))
            Text(
                title,
                style = NovaType.title,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
                modifier = Modifier.semantics { heading() },
            )
            Spacer(Modifier.height(8.dp))
            Text(
                body,
                style = NovaType.bodySm,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(20.dp))

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(colors.surfaceSunken)
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                BalanceLine(availableLabel, available, MaterialTheme.colorScheme.onSurface)
                BalanceLine(spendLabel, spend, MaterialTheme.colorScheme.onSurface)
                HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                BalanceLine(leftLabel, left, colors.negative, strong = true)
            }

            Spacer(Modifier.height(24.dp))
            DialogButton(review, primary = true, onClick = onReview)
            Spacer(Modifier.height(10.dp))
            DialogButton(confirm, primary = false, onClick = onConfirm)
        }
    }
}

// One figure of the breakdown: label on the left (truncates), amount on the
// right (tabular, takes width priority, never wraps).
@Composable
private fun BalanceLine(label: String, amount: String, amountColor: Color, strong: Boolean = false) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            label,
            style = if (strong) NovaType.label else NovaType.bodySm,
            color = if (strong) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        Text(
            amount,
            style = if (strong) NovaType.amount else NovaType.amount.copy(fontWeight = NovaType.bodySm.fontWeight),
            color = amountColor,
            maxLines = 1,
            softWrap = false,
        )
    }
}

// §6.3 Primary / Secondary at 52 dp, one line.
@Composable
private fun DialogButton(label: String, primary: Boolean, onClick: () -> Unit) {
    val colors = NovaColors.current
    val shape = RoundedCornerShape(12.dp)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .then(
                if (primary) Modifier.background(MaterialTheme.colorScheme.primary)
                else Modifier.background(MaterialTheme.colorScheme.surface).border(1.dp, colors.borderInput, shape),
            )
            .clickable(role = Role.Button, onClick = onClick)
            .heightIn(min = 52.dp)
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            style = NovaType.label,
            color = if (primary) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
