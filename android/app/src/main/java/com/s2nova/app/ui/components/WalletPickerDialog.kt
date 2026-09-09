package com.s2nova.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.s2nova.app.data.model.Wallet
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings

// Shared by WalletsScreen (choosing where a deleted wallet's history/balance
// goes) and GoalsScreen (choosing where a closed goal's saved funds go) —
// both need "pick one of my other wallets" with the same look.
@Composable
fun WalletPickerDialog(
    title: String,
    bodyText: String?,
    wallets: List<Wallet>,
    confirmLabel: String,
    onDismiss: () -> Unit,
    onConfirm: (walletId: String) -> Unit,
) {
    val t = rememberStrings()
    val format = rememberCurrencyFormatter()
    var selected by remember { mutableStateOf(wallets.firstOrNull()?.id) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column {
                if (bodyText != null) {
                    Text(bodyText, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 12.dp))
                }
                wallets.forEach { wallet ->
                    val isSelected = selected == wallet.id
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .selectable(selected = isSelected, onClick = { selected = wallet.id }, role = androidx.compose.ui.semantics.Role.RadioButton),
                    ) {
                        RadioButton(selected = isSelected, onClick = { selected = wallet.id })
                        Column(modifier = Modifier.padding(start = 4.dp)) {
                            Text(wallet.name, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onBackground)
                            Text(format(wallet.currentBalance), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { selected?.let(onConfirm) }, enabled = selected != null) { Text(confirmLabel) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(t(StringKey.COMMON_CANCEL)) } },
    )
}
