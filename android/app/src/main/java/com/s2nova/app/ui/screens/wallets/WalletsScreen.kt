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
import kotlinx.coroutines.launch

// Billeteras (CURRENCIES_AND_WALLETS.md §4): each wallet has one currency;
// foreign ones carry the "≈" principal line; the footer totals in the
// principal. Deleting one uses the two-step confirmation and lists how many
// movements go with it; the last wallet can't be deleted.

private data class WalletDraft(val id: String?, val name: String, val kind: WalletKind, val amount: String, val currency: String, val auto: Boolean)

// The wallet's glyph on the hero gradient (44 dp in lists, 40 dp in forms).
@Composable
fun WalletMark(kind: WalletKind, box: androidx.compose.ui.unit.Dp) {
    val colors = NovaColors.current
    Box(
        Modifier.size(box).clip(CircleShape).background(Brush.linearGradient(listOf(colors.heroFrom, colors.heroTo))),
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

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(Modifier.padding(start = 18.dp, end = 18.dp, top = 10.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.size(38.dp).clip(CircleShape).noRippleClick(onBack), contentAlignment = Alignment.Center) { Text("←", fontSize = 19.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            Text("Billeteras", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.25).sp, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
            Box(Modifier.size(38.dp).clip(CircleShape).noRippleClick { draft = WalletDraft(null, "", WalletKind.CASH, "", principal, true) }, contentAlignment = Alignment.Center) {
                Text("+", fontSize = 22.sp, fontWeight = FontWeight.Light, color = MaterialTheme.colorScheme.primary)
            }
        }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            wallets.forEach { w ->
                val kind = WalletKind.of(w.type)
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(MaterialTheme.colorScheme.surface).border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(18.dp))
                        .noRippleClick { draft = WalletDraft(w.id, w.name, kind, w.currentBalance.let { if (it % 1.0 == 0.0) it.toLong().toString() else it.toString() }, w.currency, false) }.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    WalletMark(kind, 44.dp)
                    Column(Modifier.weight(1f)) {
                        Text(w.name, fontSize = 13.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                        Text(kind.label + " · " + w.currency, fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(formatMoney(w.currentBalance, w.currency), fontSize = 14.5.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground, style = TextStyle(fontFeatureSettings = TNUM))
                        if (w.currency != principal) Text("≈ " + formatMoney(w.principalBalance, principal), fontSize = 10.5.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp), style = TextStyle(fontFeatureSettings = TNUM))
                    }
                    Icon(MockupIcons.Pencil, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(15.dp))
                }
            }
            if (wallets.isEmpty()) {
                Text("No tienes billeteras. Agrega la primera con el + de arriba.", fontSize = 12.sp, lineHeight = 18.sp, color = colors.textDim, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp))
            }
            Text(
                formatMoney(wallets.sumOf { it.principalBalance }, principal) + " en total, en $principal. Las billeteras en otra moneda se convierten con la tasa del día.",
                fontSize = 11.5.sp, color = colors.textDim, modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
            )
        }
    }

    val d = draft ?: return
    val codes = currencies.map { it.code }.ifEmpty { listOf(principal) }
    NovaDraftSheet(onDismiss = { draft = null }) {
        SheetHeader(if (d.id != null) "Editar billetera" else "Nueva billetera", bottom = 18.dp)
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Column {
                FieldLabel("Nombre")
                InputBox(vertical = 11.dp) {
                    WalletMark(d.kind, 40.dp)
                    BareField(d.name, { name -> draft = d.copy(name = name, kind = if (d.auto) WalletKind.guess(name) ?: d.kind else d.kind) }, "Nequi, Bancolombia — Ahorros…")
                }
                FieldNote(
                    if (d.auto && WalletKind.guess(d.name) != null) "Tipo detectado por el nombre. Puedes cambiarlo." else "El tipo define el icono y el método de pago que deriva el servidor.",
                    Modifier.padding(top = 9.dp),
                )
            }
            Column {
                FieldLabel("Tipo")
                PillRow { WalletKind.entries.forEach { k -> V2Pill(k.label, d.kind == k, { draft = d.copy(kind = k, auto = false) }) } }
            }
            Column {
                FieldLabel("Moneda")
                PillRow { codes.forEach { c -> V2Pill(c, d.currency == c, { if (d.id == null) draft = d.copy(currency = c) }) } }
                FieldNote("El saldo se lleva en ${Currencies.name(d.currency).lowercase()}. Los movimientos en otra moneda se convierten al registrarlos.", Modifier.padding(top = 8.dp))
            }
            Column {
                FieldLabel("Saldo actual")
                MoneyInput(d.amount.substringBefore('.'), { if (d.id == null) draft = d.copy(amount = it) }, Currencies.symbol(d.currency))
            }
            V2Button("Guardar", enabled = d.name.isNotBlank(), onClick = {
                scope.launch {
                    runCatching {
                        if (d.id == null) AppContainer.walletRepository.create(d.name.trim(), d.kind.type, d.amount.toDoubleOrNull() ?: 0.0, d.currency)
                        else AppContainer.walletRepository.update(d.id, d.name.trim(), d.kind.type)
                    }.onSuccess {
                        draft = null
                        if (!AppContainer.isGuest) runCatching { AppContainer.currencyRepository.refresh() }
                    }.onFailure { Snack.show("No se pudo guardar la billetera.") }
                }
            })
            if (d.id != null) SheetTextAction("Eliminar billetera", colors.negative, {
                val w = wallets.first { it.id == d.id }
                askDeleteWallet(w, wallets.size) { draft = null }
            }, weight = FontWeight.ExtraBold)
        }
    }
}

private fun askDeleteWallet(w: Wallet, count: Int, onDone: () -> Unit) {
    if (count <= 1) {
        Snack.show("Necesitas al menos una billetera para usar S2 Nova.")
        return
    }
    val n = if (AppContainer.isGuest) AppContainer.transactionRepository.transactions.value.count { it.walletId == w.id } else w.movements
    Confirm.ask(
        ConfirmRequest(
            title = "Eliminar la billetera “${w.name}”",
            lines = listOf(
                "Saldo actual: " + formatMoney(w.currentBalance, w.currency),
                n.toString() + (if (n == 1) " movimiento asociado se elimina" else " movimientos asociados se eliminan") + " con ella",
                "El saldo total de Inicio se recalcula",
            ),
            ack = "Entiendo que se eliminan la billetera y sus $n movimientos.",
            cta = "Eliminar billetera",
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
