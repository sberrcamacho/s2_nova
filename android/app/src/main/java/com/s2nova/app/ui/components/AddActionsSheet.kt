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
import androidx.compose.material3.Icon
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors

// The [+] action sheet (v2 mockup `addActions`): manual entry and scan.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddActionsSheet(
    onDismiss: () -> Unit,
    onAddManually: () -> Unit,
    onScan: () -> Unit,
) {
    val t = rememberStrings()
    NovaDraftSheet(onDismiss = onDismiss) {
        ActionRow(
            icon = MockupIcons.Pencil,
            title = t(StringKey.ADD_ACTION_MANUAL_TITLE),
            subtitle = t(StringKey.ADD_ACTION_MANUAL_SUBTITLE),
            onClick = onAddManually,
        )
        ActionRow(
            icon = MockupIcons.Scan,
            title = t(StringKey.ADD_ACTION_SCAN_TITLE),
            subtitle = t(StringKey.ADD_ACTION_SCAN_SUBTITLE),
            onClick = onScan,
        )
    }
}

@Composable
private fun ActionRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    val colors = NovaColors.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 4.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .background(Color(0x386C5CE7), CircleShape), // rgba(108,92,231,.22)
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = colors.accentText, modifier = Modifier.size(20.dp))
        }
        Column(modifier = Modifier.padding(start = 14.dp)) {
            Text(title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
            Text(subtitle, fontSize = 11.5.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp))
        }
    }
}
