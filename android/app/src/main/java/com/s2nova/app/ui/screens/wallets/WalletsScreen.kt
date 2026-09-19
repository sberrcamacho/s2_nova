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
import com.s2nova.app.ui.ThousandsGroupingVisualTransformation
import com.s2nova.app.ui.components.DraftSheetDeleteRow
import com.s2nova.app.ui.components.DraftSheetPrimaryButton
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.NovaTopBar
import com.s2nova.app.ui.components.WalletPickerDialog
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.suggestWalletType
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

// Draft state backing the create/edit sheet. `id == null` means "creating".
private data class WalletDraft(
    val id: String?,
    val name: String,
    val type: WalletType,
    val userPickedType: Boolean,
    val balanceText: String,
)

@Composable
fun WalletsScreen(onBack: () -> Unit) {
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val colors = NovaColors.current
    val scope = rememberCoroutineScope()
    var draft by remember { mutableStateOf<WalletDraft?>(null) }
    var deleting by remember { mutableStateOf<Wallet?>(null) }
    var blockedDelete by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { runCatching { AppContainer.walletRepository.refresh() } }

    fun openCreate() {
        draft = WalletDraft(id = null, name = "", type = WalletType.CASH, userPickedType = false, balanceText = "")
    }

    Scaffold(
        topBar = {
            NovaTopBar(
                title = t(StringKey.WALLETS_TITLE),
                onBack = onBack,
                actions = { IconButton(onClick = { openCreate() }) { Icon(Icons.Filled.Add, contentDescription = t(StringKey.WALLETS_NEW)) } },
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
                Button(onClick = { openCreate() }, shape = RoundedCornerShape(14.dp), modifier = Modifier.padding(top = 20.dp)) {
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
                    // Whole row is tappable and opens the same sheet in edit
                    // mode — per the mockup there's no separate pencil/delete
                    // icon on the row itself.
                    NovaCard(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = {
                            draft = WalletDraft(
                                id = wallet.id,
                                name = wallet.name,
                                type = wallet.type,
                                userPickedType = true,
                                balanceText = wallet.currentBalance.toLong().toString(),
                            )
                        },
                    ) {
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

        val d = draft
        if (d != null) {
            WalletDraftSheet(
                draft = d,
                onDraftChange = { draft = it },
                onDismiss = { draft = null },
                onSave = {
                    scope.launch {
                        if (d.id == null) {
                            AppContainer.walletRepository.create(d.name.trim(), d.type, d.balanceText.toDoubleOrNull() ?: 0.0)
                        } else {
                            AppContainer.walletRepository.update(d.id, d.name.trim(), d.type)
                        }
                        draft = null
                    }
                },
                onRequestDelete = {
                    val id = d.id ?: return@WalletDraftSheet
                    draft = null
                    if (wallets.size <= 1) blockedDelete = true else deleting = wallets.first { it.id == id }
                },
            )
        }

        val walletToDelete = deleting
        if (walletToDelete != null) {
            WalletPickerDialog(
                title = t(StringKey.WALLETS_DELETE_CONFIRM_TITLE),
                bodyText = t(StringKey.WALLETS_DELETE_REASSIGN_LABEL),
                wallets = wallets.filterNot { it.id == walletToDelete.id },
                confirmLabel = t(StringKey.WALLETS_DELETE_CONFIRM),
                onDismiss = { deleting = null },
                onConfirm = { destinationId ->
                    scope.launch {
                        AppContainer.walletRepository.delete(walletToDelete.id, destinationId)
                        deleting = null
                    }
                },
            )
        }

        if (blockedDelete) {
            AlertDialog(
                onDismissRequest = { blockedDelete = false },
                title = { Text(t(StringKey.WALLETS_DELETE_CONFIRM_TITLE)) },
                text = { Text(t(StringKey.WALLETS_DELETE_ONLY_WALLET)) },
                confirmButton = { TextButton(onClick = { blockedDelete = false }) { Text(t(StringKey.COMMON_BACK)) } },
            )
        }
    }
}

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
private fun WalletDraftSheet(
    draft: WalletDraft,
    onDraftChange: (WalletDraft) -> Unit,
    onDismiss: () -> Unit,
    onSave: () -> Unit,
    onRequestDelete: () -> Unit,
) {
    val t = rememberStrings()
    val colors = NovaColors.current
    val isEdit = draft.id != null
    val wGuessedNote = !draft.userPickedType && suggestWalletType(draft.name) != null

    NovaDraftSheet(
        onDismiss = onDismiss,
        title = t(if (isEdit) StringKey.WALLETS_EDIT_TITLE else StringKey.WALLETS_NEW),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(colors.heroFrom, colors.heroTo))),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(iconFor(draft.type), contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                    }
                    OutlinedTextField(
                        value = draft.name,
                        onValueChange = { newName ->
                            val guessed = if (!draft.userPickedType) suggestWalletType(newName) else null
                            onDraftChange(draft.copy(name = newName, type = guessed ?: draft.type))
                        },
                        label = { Text(t(StringKey.WALLETS_NAME)) },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                }
                Text(
                    t(if (wGuessedNote) StringKey.WALLETS_TYPE_AUTO_NOTE else StringKey.WALLETS_TYPE_NOTE),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(t(StringKey.WALLETS_TYPE), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                WalletTypeSelector(
                    selected = draft.type,
                    onSelect = { onDraftChange(draft.copy(type = it, userPickedType = true)) },
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(t(StringKey.WALLETS_CURRENT_BALANCE), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                // Editing an existing wallet's balance directly isn't
                // supported server-side (PATCH /accounts only accepts
                // name/type) — a direct overwrite would also desync the
                // balance from its transaction history. So this field is
                // only editable while creating; in edit mode it's a
                // read-only display of the current balance.
                OutlinedTextField(
                    value = draft.balanceText,
                    onValueChange = { onDraftChange(draft.copy(balanceText = it.filter { c -> c.isDigit() })) },
                    enabled = !isEdit,
                    leadingIcon = { Text("$") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    visualTransformation = ThousandsGroupingVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            DraftSheetPrimaryButton(
                label = t(StringKey.COMMON_SAVE),
                enabled = draft.name.isNotBlank(),
                onClick = onSave,
            )

            if (isEdit) {
                DraftSheetDeleteRow(label = t(StringKey.WALLETS_DELETE), onClick = onRequestDelete)
            }
        }
    }
}
