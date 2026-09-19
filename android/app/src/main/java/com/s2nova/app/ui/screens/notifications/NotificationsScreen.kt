package com.s2nova.app.ui.screens.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.AppNotification
import com.s2nova.app.data.model.NotificationTone
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors

// A bottom sheet (per the mockup's notifOpen sheet) triggered from Home's
// bell icon, rather than a full screen — tapping a notification marks it
// read and opens the screen its underlying event lives in, derived from
// the id's prefix (see NotificationRepository.refreshFromData's
// deterministic ids) rather than a stored route, since these are
// generated, not persisted server-side, then closes the sheet.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsSheet(onDismiss: () -> Unit, onOpenPlanes: () -> Unit = {}, onOpenRecurring: () -> Unit = {}) {
    val notifications by AppContainer.notificationRepository.notifications.collectAsStateWithLifecycle()
    val colors = NovaColors.current
    val t = rememberStrings()
    val unreadCount = notifications.count { !it.read }

    NovaDraftSheet(onDismiss = onDismiss) {
        Row(verticalAlignment = Alignment.Bottom, modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
            Column(modifier = Modifier.weight(1f)) {
                Text(t(StringKey.SETTINGS_NOTIFICATIONS), fontWeight = FontWeight.ExtraBold, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
                Text(
                    if (unreadCount > 0) "$unreadCount ${t(StringKey.NOTIF_UNREAD_SUFFIX)}" else t(StringKey.NOTIF_ALL_CAUGHT_UP),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            if (unreadCount > 0) {
                Text(
                    t(StringKey.NOTIF_MARK_ALL_READ),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.clickable { AppContainer.notificationRepository.markAllRead() },
                )
            }
        }

        if (notifications.isEmpty()) {
            Box(modifier = Modifier.fillMaxWidth().padding(vertical = 28.dp), contentAlignment = Alignment.Center) {
                Text(t(StringKey.NOTIF_EMPTY), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                notifications.forEach { n ->
                    NotificationRow(
                        n = n,
                        colors = colors,
                        onClick = {
                            AppContainer.notificationRepository.markRead(n.id)
                            when {
                                n.id.startsWith("recurring_") -> onOpenRecurring()
                                n.id.startsWith("budget_") || n.id.startsWith("goal_") || n.id.startsWith("loan_") -> onOpenPlanes()
                            }
                            onDismiss()
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun NotificationRow(n: AppNotification, colors: com.s2nova.app.ui.theme.NovaExtraColors, onClick: () -> Unit) {
    val (icon, tint) = when (n.tone) {
        NotificationTone.POSITIVE -> Icons.Filled.CheckCircle to colors.positive
        NotificationTone.WARNING -> Icons.Filled.Warning to colors.warning
        NotificationTone.INFO -> Icons.Filled.Info to MaterialTheme.colorScheme.primary
    }
    NovaCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(
                if (!n.read) MaterialTheme.colorScheme.surfaceVariant else androidx.compose.ui.graphics.Color.Transparent,
                RoundedCornerShape(16.dp),
            ),
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(tint.copy(alpha = 0.15f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp))
            }
            Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                Text(
                    n.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = if (!n.read) FontWeight.ExtraBold else FontWeight.Normal,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Text(n.message, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp))
                Text(n.time, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
            }
            if (!n.read) {
                Box(
                    modifier = Modifier
                        .padding(top = 4.dp)
                        .size(8.dp)
                        .background(colors.positive, CircleShape),
                )
            }
        }
    }
}
