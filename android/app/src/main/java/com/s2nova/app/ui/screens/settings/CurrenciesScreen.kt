package com.s2nova.app.ui.screens.settings

import com.s2nova.app.ui.theme.cardAurora
import com.s2nova.app.ui.theme.appCanvas
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
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.Currencies
import com.s2nova.app.data.formatMoney
import com.s2nova.app.data.model.UserCurrency
import com.s2nova.app.ui.Confirm
import com.s2nova.app.ui.ConfirmRequest
import com.s2nova.app.ui.Snack
import com.s2nova.app.ui.components.DashedNewRow
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.SheetHeader
import com.s2nova.app.ui.components.SymbolBadge
import com.s2nova.app.ui.components.TNUM
import com.s2nova.app.ui.components.noRippleClick
import com.s2nova.app.ui.theme.NovaColors
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.ui.semantics.Role
import com.s2nova.app.ui.components.BackHeader
import com.s2nova.app.ui.components.HeaderAddButton
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.theme.NovaType
import kotlinx.coroutines.launch
import com.s2nova.app.ui.tr
import com.s2nova.app.ui.StringKey

// Ajustes › Monedas (CURRENCIES_AND_WALLETS.md §3).
@Composable
fun CurrenciesScreen(onBack: () -> Unit) {
    val currencies by AppContainer.currencyRepository.currencies.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val colors = NovaColors.current
    val scope = rememberCoroutineScope()
    var adding by remember { mutableStateOf(false) }
    var catalog by remember { mutableStateOf<List<UserCurrency>>(emptyList()) }
    val repo = AppContainer.currencyRepository
    LaunchedEffect(Unit) { runCatching { repo.refresh() } }
    LaunchedEffect(adding) { if (adding) catalog = runCatching { repo.catalog() }.getOrDefault(emptyList()) }
    val principal = repo.principal
    val used = { code: String -> wallets.count { it.currency == code } }

    Column(Modifier.fillMaxSize().appCanvas(MaterialTheme.colorScheme.background)) {
        BackHeader(title = tr(StringKey.CUR_TITLE), onBack = onBack, action = { HeaderAddButton(tr(StringKey.CUR_ADD)) { adding = true } })
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(tr(StringKey.CUR_PRINCIPAL), style = NovaType.label, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).cardAurora().border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp)).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    SymbolBadge(Currencies.symbol(principal))
                    Column(Modifier.weight(1f)) {
                        Text(Currencies.name(principal), style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface)
                        Text(principal, style = NovaType.bodySm, color = colors.textDim)
                    }
                    Text(tr(StringKey.CUR_PRINCIPAL_BADGE), style = NovaType.caption.copy(fontWeight = FontWeight.SemiBold), color = colors.link, maxLines = 1, softWrap = false, modifier = Modifier.clip(RoundedCornerShape(6.dp)).border(1.dp, colors.link, RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 3.dp))
                }
                Text(
                    tr(StringKey.CUR_DETECTED, Currencies.deviceCountry(), principal),
                    style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(tr(StringKey.CUR_OTHERS), style = NovaType.label, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 10.dp))
            val others = currencies.filter { it.code != principal }
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).cardAurora().border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp))) {
                if (others.isEmpty()) Text(tr(StringKey.CUR_ONLY_PRINCIPAL), style = NovaType.bodySm, color = colors.textDim, modifier = Modifier.padding(16.dp))
                others.forEachIndexed { i, c ->
                    val n = used(c.code)
                    Row(Modifier.fillMaxWidth().heightIn(min = 64.dp).padding(start = 16.dp, end = 4.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        SymbolBadge(c.symbol)
                        Column(Modifier.weight(1f)) {
                            Text(Currencies.name(c.code, c.name) + " · " + c.code, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface)
                            Text(
                                "1 ${c.code} = " + formatMoney(c.rate, principal) + " · " + if (n > 0) tr(if (n == 1) StringKey.CUR_WALLET_ONE else StringKey.CUR_WALLET_MANY, n) else tr(StringKey.CUR_NO_WALLETS),
                                style = NovaType.bodySm.copy(fontFeatureSettings = TNUM), color = colors.textDim,
                            )
                        }
                        if (n == 0) {
                            Text(tr(StringKey.MV_RECEIPT_REMOVE), style = NovaType.label, color = colors.negative, maxLines = 1, softWrap = false, modifier = Modifier.clip(RoundedCornerShape(12.dp)).clickable(role = Role.Button) {
                                Confirm.ask(
                                    ConfirmRequest(
                                        title = tr(StringKey.CUR_REMOVE_TITLE, Currencies.name(c.code, c.name)),
                                        lines = listOf(tr(StringKey.CUR_REMOVE_GONE), tr(StringKey.CUR_REMOVE_KEEP, c.code)),
                                        ack = tr(StringKey.CUR_REMOVE_ACK, c.code),
                                        cta = tr(StringKey.CUR_REMOVE),
                                        onConfirm = { scope.launch { runCatching { repo.remove(c.code) } } },
                                    ),
                                )
                            }.padding(horizontal = 12.dp, vertical = 14.dp))
                        } else Spacer(Modifier.width(12.dp))
                    }
                    if (i < others.size - 1) HorizontalDivider(thickness = 1.dp, color = colors.dividerSubtle, modifier = Modifier.padding(horizontal = 16.dp))
                }
            }
            DashedNewRow(label = tr(StringKey.CUR_ADD), onClick = { adding = true }, modifier = Modifier.padding(top = 4.dp))
            Text(
                tr(StringKey.CUR_RATES_NOTE),
                style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp),
            )
        }
    }

    if (adding) {
        NovaDraftSheet(onDismiss = { adding = false }) {
            SheetHeader(tr(StringKey.CUR_ADD), tr(StringKey.CUR_ADD_HINT))
            Column {
                catalog.filter { c -> currencies.none { it.code == c.code } }.forEach { c ->
                    Row(
                        Modifier.fillMaxWidth().heightIn(min = 56.dp).clip(RoundedCornerShape(12.dp)).clickable(role = Role.Button) {
                            adding = false
                            scope.launch { runCatching { repo.add(c.code) }.onSuccess { Snack.show(tr(StringKey.CUR_ADDED, Currencies.name(c.code, c.name))) } }
                        }.padding(horizontal = 4.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        SymbolBadge(c.symbol)
                        Column(Modifier.weight(1f)) {
                            Text(Currencies.name(c.code, c.name) + " · " + c.code, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface)
                            Text("1 ${c.code} = " + formatMoney(c.rate, principal), style = NovaType.bodySm.copy(fontFeatureSettings = TNUM), color = colors.textDim)
                        }
                        V2Icon(V2Icons.plus, colors.link, 20.dp)
                    }
                }
            }
        }
    }
}
