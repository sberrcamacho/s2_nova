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
        // align-items: baseline — "Marcar leídas" sits on the title's baseline.
        Row(
            modifier = Modifier.fillMaxWidth().padding(start = 4.dp, end = 4.dp, bottom = 16.dp),
        ) {
            Column(modifier = Modifier.weight(1f).alignByBaseline()) {
                Text(t(StringKey.SETTINGS_NOTIFICATIONS), fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
                Text(
                    if (unreadCount > 0) "$unreadCount ${t(StringKey.NOTIF_UNREAD_SUFFIX)}" else t(StringKey.NOTIF_ALL_CAUGHT_UP),
                    fontSize = 11.sp,
                    color = colors.textDim,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            if (unreadCount > 0) {
                Text(
                    t(StringKey.NOTIF_MARK_ALL_READ),
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = colors.accentText,
                    modifier = Modifier.alignByBaseline().padding(start = 12.dp).clickable {
                        AppContainer.alertRepository.markAllRead()
                        AppContainer.notificationRepository.markAllRead()
                    },
                )
            }
        }

        if (alerts.isEmpty() && notices.isEmpty()) {
            Text(
                t(StringKey.NOTIF_EMPTY),
                fontSize = 12.5.sp,
                lineHeight = 18.75.sp,
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
                    )
                }
                notices.forEach { notice ->
                    NotificationRow(
                        icon = ScanIcon,
                        color = MaterialTheme.colorScheme.primary,
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
private fun NotificationRow(icon: ImageVector, color: Color, title: String, body: String, read: Boolean, onClick: () -> Unit) {
    val colors = NovaColors.current
    val shape = RoundedCornerShape(14.dp)
    Row(
        verticalAlignment = Alignment.Top,
        modifier = Modifier
            .fillMaxWidth()
            .background(if (read) Color.Transparent else colors.sheetSurface, shape)
            .border(1.dp, if (read) MaterialTheme.colorScheme.outline else Color.Transparent, shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 13.dp),
    ) {
        IconCircle(icon = icon, color = color, size = CategoryIconSize.ALERT)
        Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
            Text(
                title,
                fontSize = 13.sp,
                fontWeight = if (read) FontWeight.SemiBold else FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Text(
                body,
                fontSize = 11.5.sp,
                lineHeight = 16.1.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 3.dp),
            )
        }
    }
}
