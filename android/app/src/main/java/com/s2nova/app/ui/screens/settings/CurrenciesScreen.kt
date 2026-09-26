package com.s2nova.app.ui.screens.settings

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
import kotlinx.coroutines.launch

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

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(Modifier.padding(start = 18.dp, end = 18.dp, top = 10.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.size(38.dp).clip(CircleShape).noRippleClick(onBack), contentAlignment = Alignment.Center) { Text("←", fontSize = 19.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            Text("Monedas", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.25).sp, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
            Box(Modifier.size(38.dp).clip(CircleShape).noRippleClick { adding = true }, contentAlignment = Alignment.Center) {
                Text("+", fontSize = 22.sp, fontWeight = FontWeight.Light, color = MaterialTheme.colorScheme.primary)
            }
        }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Moneda principal", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(MaterialTheme.colorScheme.surface).border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(18.dp)).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    SymbolBadge(Currencies.symbol(principal))
                    Column(Modifier.weight(1f)) {
                        Text(Currencies.name(principal), fontSize = 13.5.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
                        Text(principal, fontSize = 11.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp))
                    }
                    Text("Principal", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = colors.accentText, modifier = Modifier.clip(RoundedCornerShape(999.dp)).border(1.dp, colors.accentText, RoundedCornerShape(999.dp)).padding(horizontal = 8.dp, vertical = 3.dp))
                }
                Text(
                    "Detectada por la región de tu dispositivo (${Currencies.deviceCountry()}). El saldo total, los presupuestos y los reportes se muestran en $principal.",
                    fontSize = 11.sp, lineHeight = 16.sp, color = colors.textDim,
                )
            }
            Text("Otras monedas", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 10.dp))
            val others = currencies.filter { it.code != principal }
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(MaterialTheme.colorScheme.surface).border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(18.dp))) {
                if (others.isEmpty()) Text("Solo usas tu moneda principal.", fontSize = 12.sp, color = colors.textDim, modifier = Modifier.padding(16.dp))
                others.forEachIndexed { i, c ->
                    val n = used(c.code)
                    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 13.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        SymbolBadge(c.symbol)
                        Column(Modifier.weight(1f)) {
                            Text(c.name + " · " + c.code, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                            Text(
                                "1 ${c.code} = " + formatMoney(c.rate, principal) + " · " + if (n > 0) "$n " + (if (n == 1) "billetera" else "billeteras") else "sin billeteras",
                                fontSize = 11.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp), style = TextStyle(fontFeatureSettings = TNUM),
                            )
                        }
                        if (n == 0) {
                            Text("Quitar", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = colors.negative, modifier = Modifier.noRippleClick {
                                Confirm.ask(
                                    ConfirmRequest(
                                        title = "Quitar " + c.name,
                                        lines = listOf("Deja de aparecer al crear billeteras y movimientos", "Los movimientos ya registrados en ${c.code} conservan su monto y su tasa"),
                                        ack = "Entiendo que ${c.code} se quita de mis monedas.",
                                        cta = "Quitar moneda",
                                        onConfirm = { scope.launch { runCatching { repo.remove(c.code) } } },
                                    ),
                                )
                            })
                        }
                    }
                    if (i < others.size - 1) HorizontalDivider(thickness = 1.dp, color = colors.dividerSubtle)
                }
            }
            DashedNewRow(label = "Agregar moneda", onClick = { adding = true }, modifier = Modifier.padding(top = 4.dp))
            Text(
                "Las tasas se actualizan cada día. Cada movimiento guarda su monto en la moneda original y la tasa usada al registrarlo.",
                fontSize = 11.sp, lineHeight = 16.sp, color = colors.textDim, modifier = Modifier.padding(horizontal = 2.dp, vertical = 4.dp),
            )
        }
    }

    if (adding) {
        NovaDraftSheet(onDismiss = { adding = false }) {
            SheetHeader("Agregar moneda", "Podrás crear billeteras y registrar movimientos en ella.")
            Column {
                catalog.filter { c -> currencies.none { it.code == c.code } }.forEach { c ->
                    Row(
                        Modifier.fillMaxWidth().noRippleClick {
                            adding = false
                            scope.launch { runCatching { repo.add(c.code) }.onSuccess { Snack.show(c.name + " agregado") } }
                        }.padding(horizontal = 4.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        SymbolBadge(c.symbol)
                        Column(Modifier.weight(1f)) {
                            Text(c.name + " · " + c.code, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                            Text("1 ${c.code} = " + formatMoney(c.rate, principal), fontSize = 11.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp), style = TextStyle(fontFeatureSettings = TNUM))
                        }
                        Text("+", fontSize = 18.sp, color = colors.accentText)
                    }
                }
            }
        }
    }
}
