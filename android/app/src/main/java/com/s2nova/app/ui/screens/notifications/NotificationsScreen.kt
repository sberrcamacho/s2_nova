package com.s2nova.app.ui.screens.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.AppNotification
import com.s2nova.app.data.model.NotificationTone
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaTopBar
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors

@Composable
fun NotificationsScreen(onBack: () -> Unit) {
    val notifications by AppContainer.notificationRepository.notifications.collectAsStateWithLifecycle()
    val colors = NovaColors.current
    val t = rememberStrings()

    Scaffold(
        topBar = {
            NovaTopBar(
                title = t(StringKey.SETTINGS_NOTIFICATIONS),
                onBack = onBack,
                actions = {
                    TextButton(onClick = { AppContainer.notificationRepository.markAllRead() }) {
                        Text(t(StringKey.NOTIF_MARK_ALL_READ))
                    }
                },
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        if (notifications.isEmpty()) {
            Box(modifier = Modifier.padding(padding).fillMaxWidth().padding(top = 48.dp), contentAlignment = Alignment.Center) {
                Text(t(StringKey.NOTIF_EMPTY), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            return@Scaffold
        }
        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(notifications) { n ->
                NotificationRow(n, colors)
            }
        }
    }
}

@Composable
private fun NotificationRow(n: AppNotification, colors: com.s2nova.app.ui.theme.NovaExtraColors) {
    val (icon, tint) = when (n.tone) {
        NotificationTone.POSITIVE -> Icons.Filled.CheckCircle to colors.positive
        NotificationTone.WARNING -> Icons.Filled.Warning to colors.warning
        NotificationTone.INFO -> Icons.Filled.Info to MaterialTheme.colorScheme.primary
    }
    NovaCard(modifier = Modifier.fillMaxWidth()) {
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
                Text(n.title, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onBackground)
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
