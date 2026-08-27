package com.s2nova.app.ui.screens.wallets

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.CurrencyBitcoin
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.Wallet
import com.s2nova.app.data.model.WalletType
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaTopBar
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch

@Composable
fun labelFor(type: WalletType): String {
    val t = rememberStrings()
    return when (type) {
        WalletType.CASH -> t(StringKey.WALLET_TYPE_CASH)
        WalletType.BANK_DEBIT -> t(StringKey.WALLET_TYPE_BANK_DEBIT)
        WalletType.BANK_CREDIT -> t(StringKey.WALLET_TYPE_BANK_CREDIT)
        WalletType.SAVINGS -> t(StringKey.WALLET_TYPE_SAVINGS)
        WalletType.CRYPTO -> t(StringKey.WALLET_TYPE_CRYPTO)
        WalletType.NEQUI -> t(StringKey.WALLET_TYPE_NEQUI)
        WalletType.DAVIPLATA -> t(StringKey.WALLET_TYPE_DAVIPLATA)
        WalletType.OTHER -> t(StringKey.WALLET_TYPE_OTHER)
    }
}

fun iconFor(type: WalletType) = when (type) {
    WalletType.CASH -> Icons.Filled.Payments
    WalletType.BANK_DEBIT -> Icons.Filled.AccountBalance
    WalletType.BANK_CREDIT -> Icons.Filled.CreditCard
    WalletType.SAVINGS -> Icons.Filled.Savings
    WalletType.CRYPTO -> Icons.Filled.CurrencyBitcoin
    WalletType.NEQUI, WalletType.DAVIPLATA -> Icons.Filled.PhoneAndroid
    WalletType.OTHER -> Icons.Filled.Wallet
}

@Composable
fun WalletTypeSelector(selected: WalletType, onSelect: (WalletType) -> Unit) {
    Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        WalletType.entries.forEach { type ->
            val isSelected = selected == type
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                    .selectable(selected = isSelected, onClick = { onSelect(type) }, role = androidx.compose.ui.semantics.Role.RadioButton)
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                Icon(
                    iconFor(type),
                    contentDescription = null,
                    tint = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(16.dp),
                )
                Text(
                    labelFor(type),
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onBackground,
                    modifier = Modifier.padding(start = 6.dp),
                )
            }
        }
    }
}

@Composable
fun WalletsScreen(onBack: () -> Unit) {
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val colors = NovaColors.current
    val scope = rememberCoroutineScope()
    var creating by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { AppContainer.walletRepository.refresh() }

    Scaffold(
        topBar = {
            NovaTopBar(
                title = t(StringKey.WALLETS_TITLE),
                onBack = onBack,
                actions = { IconButton(onClick = { creating = true }) { Icon(Icons.Filled.Add, contentDescription = t(StringKey.WALLETS_NEW)) } },
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        if (wallets.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).padding(32.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(Icons.Filled.Wallet, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(48.dp))
                Text(
                    t(StringKey.WALLETS_EMPTY_TITLE),
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                    modifier = Modifier.padding(top = 12.dp),
                )
                Text(
                    t(StringKey.WALLETS_EMPTY_SUBTITLE),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
                Button(onClick = { creating = true }, shape = RoundedCornerShape(14.dp), modifier = Modifier.padding(top = 20.dp)) {
                    Text(t(StringKey.WALLETS_NEW))
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(wallets) { wallet ->
                    NovaCard(modifier = Modifier.fillMaxWidth()) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(16.dp)) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(colors.heroFrom, colors.heroTo))),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(iconFor(wallet.type), contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                            }
                            Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                                Text(wallet.name, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
                                Text(labelFor(wallet.type), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text(
                                format(wallet.currentBalance),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onBackground,
                            )
                        }
                    }
                }
                item {
                    Text(
                        t(StringKey.WALLETS_FOOTER_NOTE),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
                item { Spacer(Modifier.height(72.dp)) }
            }
        }

        if (creating) {
            CreateWalletDialog(
                onDismiss = { creating = false },
                onCreate = { name, type, balance ->
                    scope.launch {
                        AppContainer.walletRepository.create(name, type, balance)
                        creating = false
                    }
                },
            )
        }
    }
}

@Composable
private fun CreateWalletDialog(onDismiss: () -> Unit, onCreate: (String, WalletType, Double) -> Unit) {
    val t = rememberStrings()
    var name by remember { mutableStateOf("") }
    var type by remember { mutableStateOf(WalletType.CASH) }
    var balanceText by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(t(StringKey.WALLETS_NEW)) },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text(t(StringKey.WALLETS_NAME)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text(
                    t(StringKey.WALLETS_TYPE),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 14.dp, bottom = 8.dp),
                )
                WalletTypeSelector(selected = type, onSelect = { type = it })
                OutlinedTextField(
                    value = balanceText,
                    onValueChange = { balanceText = it.filter { c -> c.isDigit() } },
                    label = { Text(t(StringKey.WALLETS_INITIAL_BALANCE)) },
                    leadingIcon = { Text("$") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { if (name.isNotBlank()) onCreate(name.trim(), type, balanceText.toDoubleOrNull() ?: 0.0) }) {
                Text(t(StringKey.WALLETS_CREATE))
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(t(StringKey.COMMON_CANCEL)) } },
    )
}
