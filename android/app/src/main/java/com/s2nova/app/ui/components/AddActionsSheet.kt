package com.s2nova.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberStrings

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddActionsSheet(
    onDismiss: () -> Unit,
    onAddManually: () -> Unit,
    onScan: () -> Unit,
) {
    val t = rememberStrings()
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
            ActionRow(
                icon = Icons.Filled.Edit,
                title = t(StringKey.ADD_ACTION_MANUAL_TITLE),
                subtitle = t(StringKey.ADD_ACTION_MANUAL_SUBTITLE),
                onClick = onAddManually,
            )
            ActionRow(
                icon = Icons.Filled.QrCodeScanner,
                title = t(StringKey.ADD_ACTION_SCAN_TITLE),
                subtitle = t(StringKey.ADD_ACTION_SCAN_SUBTITLE),
                onClick = onScan,
            )
        }
    }
}

@Composable
private fun ActionRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
        }
        Column(modifier = Modifier.padding(start = 14.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
