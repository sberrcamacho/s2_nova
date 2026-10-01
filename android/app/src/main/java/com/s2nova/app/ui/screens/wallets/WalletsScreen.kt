package com.s2nova.app.ui.screens.wallets

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.Currencies
import com.s2nova.app.data.formatMoney
import com.s2nova.app.data.model.Wallet
import com.s2nova.app.ui.Confirm
import com.s2nova.app.ui.ConfirmRequest
import com.s2nova.app.ui.Snack
import com.s2nova.app.ui.WalletKind
import com.s2nova.app.ui.components.BareField
import com.s2nova.app.ui.components.FieldLabel
import com.s2nova.app.ui.components.FieldNote
import com.s2nova.app.ui.components.InputBox
import com.s2nova.app.ui.components.MockupIcons
import com.s2nova.app.ui.components.MoneyInput
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.PillRow
import com.s2nova.app.ui.components.SheetHeader
import com.s2nova.app.ui.components.SheetTextAction
import com.s2nova.app.ui.components.TNUM
import com.s2nova.app.ui.components.V2Button
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.components.V2Pill
import com.s2nova.app.ui.components.noRippleClick
import com.s2nova.app.ui.theme.NovaColors
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.HorizontalDivider
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.theme.NovaType
import kotlinx.coroutines.launch
import com.s2nova.app.ui.tr
import com.s2nova.app.ui.StringKey

// Billeteras (CURRENCIES_AND_WALLETS.md §4): each wallet has one currency;
// foreign ones carry the "≈" principal line; the summary card totals in the
// principal. Deleting one uses the two-step confirmation and lists how many
// movements go with it; the last wallet can't be deleted.

private data class WalletDraft(val id: String?, val name: String, val kind: WalletKind, val amount: String, val currency: String, val auto: Boolean)

// The wallet's glyph on a brand gradient (44 dp in lists, 40 dp in forms),
// indigo → violet as on Web's wallet rows.
@Composable
fun WalletMark(kind: WalletKind, box: androidx.compose.ui.unit.Dp) {
    val colors = NovaColors.current
    Box(
        Modifier.size(box).clip(CircleShape).background(Brush.linearGradient(listOf(colors.primaryPressed, MaterialTheme.colorScheme.secondary))),
        contentAlignment = Alignment.Center,
    ) { V2Icon(kind.glyph, Color.White, 20.dp) }
}

@Composable
fun WalletsScreen(onBack: () -> Unit) {
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val currencies by AppContainer.currencyRepository.currencies.collectAsStateWithLifecycle()
    val colors = NovaColors.current
    val scope = rememberCoroutineScope()
    var draft by remember { mutableStateOf<WalletDraft?>(null) }
    val principal = AppContainer.currencyRepository.principal

    LaunchedEffect(Unit) { runCatching { AppContainer.walletRepository.refresh() } }

    val total = wallets.sumOf { it.principalBalance }
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        // Back and "Nueva billetera" are icon buttons on 48 dp targets.
        Row(Modifier.padding(start = 4.dp, end = 12.dp, top = 4.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(48.dp).clip(CircleShape).clickable(role = Role.Button, onClickLabel = tr(StringKey.COMMON_BACK), onClick = onBack).semantics { contentDescription = tr(StringKey.COMMON_BACK) },
                contentAlignment = Alignment.Center,
            ) { V2Icon(V2Icons.back, MaterialTheme.colorScheme.onBackground, 24.dp) }
            Text(
                tr(StringKey.WALLET_TITLE),
                style = NovaType.title,
                color = MaterialTheme.colorScheme.onBackground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f).padding(start = 4.dp).semantics { heading() },
            )
            val newLabel = tr(StringKey.WALLET_NEW)
            Box(
                Modifier.size(48.dp).clip(CircleShape)
                    .clickable(role = Role.Button) { draft = WalletDraft(null, "", WalletKind.CASH, "", principal, true) }
                    .semantics { contentDescription = newLabel },
                contentAlignment = Alignment.Center,
            ) {
                Box(Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer), contentAlignment = Alignment.Center) {
                    V2Icon(V2Icons.plus, MaterialTheme.colorScheme.onPrimaryContainer, 20.dp, strokeWidth = 2.2f)
                }
            }
        }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            val shape = RoundedCornerShape(20.dp)
            if (wallets.isEmpty() && !AppContainer.dataLoaded.collectAsStateWithLifecycle().value) {
                com.s2nova.app.ui.components.NovaSkeletonRows(count = 3)
            }
            // The total in the principal currency, with the conversion note.
            if (wallets.isNotEmpty()) {
                Column(
                    Modifier.fillMaxWidth().clip(shape).background(MaterialTheme.colorScheme.surface).border(1.dp, MaterialTheme.colorScheme.outline, shape).padding(16.dp),
                ) {
                    Text(tr(StringKey.WALLET_TOTAL_LABEL, principal).uppercase(), style = NovaType.overline, color = colors.textDim, maxLines = 1, softWrap = false)
                    Text(formatMoney(total, principal), style = NovaType.headline.copy(fontFeatureSettings = TNUM), color = MaterialTheme.colorScheme.onSurface, maxLines = 1, softWrap = false, modifier = Modifier.padding(top = 2.dp))
                    if (wallets.any { it.currency != principal }) {
                        Text(tr(StringKey.WALLET_TOTAL_NOTE), style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                    }
                }
                // Flat list: one `surface` card, a ListRow per wallet with `divider` between rows.
                Column(Modifier.fillMaxWidth().clip(shape).background(MaterialTheme.colorScheme.surface).border(1.dp, MaterialTheme.colorScheme.outline, shape)) {
                    wallets.forEachIndexed { index, w ->
                        val kind = WalletKind.of(w.type)
                        val share = if (total > 0) kotlin.math.round(w.principalBalance / total * 100).toInt() else 0
                        // The share leads: it is the part worth keeping when the line truncates.
                        val meta = tr(StringKey.WALLET_SHARE, share) + " · " + kind.label + " · " + w.currency
                        val balance = formatMoney(w.currentBalance, w.currency)
                        val approx = if (w.currency != principal) "≈ " + formatMoney(w.principalBalance, principal) else null
                        val editLabel = tr(StringKey.WALLET_EDIT)
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .heightIn(min = 64.dp)
                                .clickable(onClickLabel = editLabel, role = Role.Button) { draft = WalletDraft(w.id, w.name, kind, com.s2nova.app.ui.screens.addtransaction.AmountPad.numStr(w.currentBalance), w.currency, false) }
                                .semantics(mergeDescendants = true) { contentDescription = listOfNotNull(w.name, meta, balance, approx).joinToString(", ") }
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            WalletMark(kind, 40.dp)
                            Column(Modifier.weight(1f).padding(start = 12.dp)) {
                                Text(w.name, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(meta, style = NovaType.bodySm, color = colors.textDim, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                            Column(horizontalAlignment = Alignment.End, modifier = Modifier.padding(start = 12.dp)) {
                                Text(balance, style = NovaType.amount, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, softWrap = false)
                                if (approx != null) Text(approx, style = NovaType.caption.copy(fontFeatureSettings = TNUM), color = colors.textDim, maxLines = 1, softWrap = false)
                            }
                            V2Icon(V2Icons.chevronRight, colors.textDim, 18.dp, modifier = Modifier.padding(start = 4.dp))
                        }
                        if (index < wallets.lastIndex) HorizontalDivider(thickness = 1.dp, color = colors.dividerSubtle, modifier = Modifier.padding(horizontal = 16.dp))
                    }
                }
            } else {
                Text(tr(StringKey.WALLET_EMPTY), style = NovaType.bodySm, color = colors.textDim, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp))
            }
        }
    }

    val d = draft ?: return
    val codes = currencies.map { it.code }.ifEmpty { listOf(principal) }
    NovaDraftSheet(onDismiss = { draft = null }) {
        SheetHeader(tr(if (d.id != null) StringKey.WALLET_EDIT else StringKey.WALLET_NEW), bottom = 18.dp)
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Column {
                FieldLabel(tr(StringKey.PLAN_NAME))
                InputBox(vertical = 11.dp) {
                    WalletMark(d.kind, 40.dp)
                    BareField(d.name, { name -> draft = d.copy(name = name, kind = if (d.auto) WalletKind.guess(name) ?: d.kind else d.kind) }, tr(StringKey.WALLET_NAME_PH))
                }
                FieldNote(
                    tr(if (d.auto && WalletKind.guess(d.name) != null) StringKey.WALLET_TYPE_GUESS else StringKey.WALLET_TYPE_HINT),
                    Modifier.padding(top = 9.dp),
                )
            }
            Column {
                FieldLabel(tr(StringKey.WALLET_TYPE))
                PillRow { WalletKind.entries.forEach { k -> V2Pill(k.label, d.kind == k, { draft = d.copy(kind = k, auto = false) }) } }
            }
            Column {
                FieldLabel(tr(StringKey.WALLET_CURRENCY))
                PillRow { codes.forEach { c -> V2Pill(c, d.currency == c, { if (d.id == null) draft = d.copy(currency = c) }) } }
                FieldNote(tr(StringKey.WALLET_CURRENCY_HINT, Currencies.name(d.currency).lowercase()), Modifier.padding(top = 8.dp))
            }
            Column {
                FieldLabel(tr(StringKey.WALLET_BALANCE))
                com.s2nova.app.ui.components.AmountField(d.amount, { draft = d.copy(amount = it) }, d.currency, title = tr(StringKey.WALLET_INITIAL), enabled = d.id == null)
            }
            V2Button(tr(StringKey.COMMON_SAVE), enabled = d.name.isNotBlank(), onClick = {
                scope.launch {
                    runCatching {
                        if (d.id == null) AppContainer.walletRepository.create(d.name.trim(), d.kind.type, com.s2nova.app.ui.screens.addtransaction.AmountPad.eval(d.amount), d.currency)
                        else AppContainer.walletRepository.update(d.id, d.name.trim(), d.kind.type)
                    }.onSuccess {
                        draft = null
                        if (!AppContainer.isGuest) runCatching { AppContainer.currencyRepository.refresh() }
                    }.onFailure { Snack.show(tr(StringKey.WALLET_ERR_SAVE)) }
                }
            })
            if (d.id != null) SheetTextAction(tr(StringKey.WALLET_DELETE), colors.negative, {
                val w = wallets.first { it.id == d.id }
                askDeleteWallet(w, wallets.size) { draft = null }
            }, weight = FontWeight.ExtraBold)
        }
    }
}

private fun askDeleteWallet(w: Wallet, count: Int, onDone: () -> Unit) {
    if (count <= 1) {
        Snack.show(tr(StringKey.WALLET_LAST))
        return
    }
    val n = if (AppContainer.isGuest) AppContainer.transactionRepository.transactions.value.count { it.walletId == w.id } else w.movements
    Confirm.ask(
        ConfirmRequest(
            title = tr(StringKey.WALLET_DELETE_TITLE, w.name),
            lines = listOf(
                tr(StringKey.WALLET_DELETE_BALANCE, formatMoney(w.currentBalance, w.currency)),
                tr(if (n == 1) StringKey.WALLET_DELETE_ONE else StringKey.WALLET_DELETE_MANY, n),
                tr(StringKey.WALLET_DELETE_TOTAL),
            ),
            ack = tr(StringKey.WALLET_DELETE_ACK, n),
            cta = tr(StringKey.WALLET_DELETE),
            onConfirm = {
                onDone()
                AppContainer.appScope.launch {
                    runCatching { AppContainer.walletRepository.delete(w.id) }
                    if (AppContainer.isGuest) AppContainer.transactionRepository.loadDemo(AppContainer.transactionRepository.transactions.value.filter { it.walletId != w.id })
                    else runCatching { AppContainer.transactionRepository.refresh() }
                }
            },
        ),
    )
}
