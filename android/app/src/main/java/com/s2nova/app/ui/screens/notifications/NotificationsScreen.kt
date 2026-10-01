package com.s2nova.app.ui.screens.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import kotlinx.coroutines.launch
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.ui.AlertTarget
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.CategoryIconSize
import com.s2nova.app.ui.components.IconCircle
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.ScanIcon
import com.s2nova.app.ui.presentAlert
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import com.s2nova.app.ui.theme.NovaType
import com.s2nova.app.ui.tr

// The bell sheet (v2 mockup `notifOpen`): the shared alerts from
// AlertRepository — the same rule set as Inicio's alert card and Web's
// "Alertas" — followed by any local notice this device posted (scanner).
// Tapping a row marks it read and opens its target.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsSheet(onDismiss: () -> Unit, onOpenAlertTarget: (AlertTarget) -> Unit) {
    val alerts by AppContainer.alertRepository.alerts.collectAsStateWithLifecycle()
    val readIds by AppContainer.alertRepository.readIds.collectAsStateWithLifecycle()
    val notices by AppContainer.notificationRepository.notifications.collectAsStateWithLifecycle()
    val colors = NovaColors.current
    val t = rememberStrings()
    val format = rememberCurrencyFormatter()
    val unreadCount = alerts.count { it.id !in readIds } + notices.count { !it.read }

    NovaDraftSheet(onDismiss = onDismiss) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth().padding(start = 4.dp, bottom = 12.dp),
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(t(StringKey.SETTINGS_NOTIFICATIONS), style = NovaType.title, color = MaterialTheme.colorScheme.onBackground)
                Text(
                    if (unreadCount > 0) "$unreadCount ${t(StringKey.NOTIF_UNREAD_SUFFIX)}" else t(StringKey.NOTIF_ALL_CAUGHT_UP),
                    style = NovaType.bodySm,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (unreadCount > 0) {
                // A text button on a 48 dp target.
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.heightIn(min = 48.dp).clip(RoundedCornerShape(12.dp)).clickable(role = Role.Button) {
                        AppContainer.alertRepository.markAllRead()
                        AppContainer.notificationRepository.markAllRead()
                    }.padding(horizontal = 12.dp),
                ) {
                    Text(t(StringKey.NOTIF_MARK_ALL_READ), style = NovaType.label, color = colors.link, maxLines = 1, softWrap = false)
                }
            }
        }

        if (alerts.isEmpty() && notices.isEmpty()) {
            Text(
                t(StringKey.NOTIF_EMPTY),
                style = NovaType.bodySm,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 28.dp),
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                alerts.forEach { alert ->
                    val copy = presentAlert(alert, t, format)
                    NotificationRow(
                        icon = copy.icon,
                        color = copy.color,
                        title = copy.title,
                        body = copy.body,
                        read = alert.id in readIds,
                        onClick = {
                            AppContainer.alertRepository.markRead(alert.id)
                            onDismiss()
                            onOpenAlertTarget(copy.target)
                        },
                        onConfirm = copy.confirmGoalId?.let { goalId -> { resolveGoalPlan(goalId, alert.id, confirm = true) } },
                        onSkip = copy.confirmGoalId?.let { goalId -> { resolveGoalPlan(goalId, alert.id, confirm = false) } },
                    )
                }
                notices.forEach { notice ->
                    NotificationRow(
                        icon = ScanIcon,
                        color = NovaColors.current.link,
                        title = notice.title,
                        body = notice.message,
                        read = notice.read,
                        onClick = { AppContainer.notificationRepository.markRead(notice.id) },
                    )
                }
            }
        }
    }
}

@Composable
private fun NotificationRow(
    icon: ImageVector,
    color: Color,
    title: String,
    body: String,
    read: Boolean,
    onClick: () -> Unit,
    onConfirm: (() -> Unit)? = null,
    onSkip: (() -> Unit)? = null,
) {
    val colors = NovaColors.current
    val shape = RoundedCornerShape(16.dp)
    val unreadLabel = tr(StringKey.NOTIF_UNREAD_ONE)
    Row(
        verticalAlignment = Alignment.Top,
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(if (read) Color.Transparent else MaterialTheme.colorScheme.surface, shape)
            .border(1.dp, MaterialTheme.colorScheme.outline, shape)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { if (!read) stateDescription = unreadLabel }
            .padding(start = 12.dp, end = 12.dp, top = 12.dp, bottom = if (onConfirm != null) 4.dp else 12.dp),
    ) {
        IconCircle(icon = icon, color = color, size = CategoryIconSize.ALERT)
        Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
            Text(
                title,
                style = NovaType.titleSm.copy(fontWeight = if (read) FontWeight.Medium else FontWeight.SemiBold),
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                body,
                style = NovaType.bodySm.copy(fontFeatureSettings = "tnum"),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (onConfirm != null && onSkip != null) {
                @OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
                androidx.compose.foundation.layout.FlowRow(modifier = Modifier.offset(x = (-8).dp)) {
                    RowAction(tr(StringKey.PLAN_CONFIRM), colors.link, onConfirm)
                    RowAction(tr(StringKey.PLAN_SKIP), MaterialTheme.colorScheme.onSurfaceVariant, onSkip)
                }
            }
        }
        // Unread is marked by a dot, not only by the weight and the fill.
        if (!read) Box(Modifier.padding(start = 8.dp, top = 6.dp).size(8.dp).background(colors.link, androidx.compose.foundation.shape.CircleShape))
    }
}

// "Confirmar aporte" records the due contribution; "Omitir esta vez"
// advances the plan (PLANS.md §3). The alert disappears either way.
internal fun resolveGoalPlan(goalId: String, alertId: String, confirm: Boolean) {
    AppContainer.alertRepository.markRead(alertId)
    AppContainer.alertRepository.removeLocal(alertId)
    AppContainer.appScope.launch {
        runCatching { if (confirm) AppContainer.goalRepository.confirmPlan(goalId) else AppContainer.goalRepository.skipPlan(goalId) }
            .onSuccess { com.s2nova.app.ui.Snack.show(tr(if (confirm) StringKey.PLAN_DONE else StringKey.PLAN_SKIPPED)) }
        if (!AppContainer.isGuest) {
            runCatching { AppContainer.walletRepository.refresh() }
            runCatching { AppContainer.alertRepository.refresh() }
        }
    }
}

// A text action on a 48 dp target.
@Composable
private fun RowAction(label: String, color: Color, onClick: () -> Unit) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier.heightIn(min = 48.dp).clip(RoundedCornerShape(12.dp)).clickable(role = Role.Button, onClick = onClick).padding(horizontal = 8.dp),
    ) {
        Text(label, style = NovaType.label, color = color, maxLines = 1, softWrap = false)
    }
}
