package com.s2nova.app.ui.screens.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.Currencies
import com.s2nova.app.ui.Snack
import com.s2nova.app.ui.WalletKind
import com.s2nova.app.ui.components.BareField
import com.s2nova.app.ui.components.FieldLabel
import com.s2nova.app.ui.components.FieldNote
import com.s2nova.app.ui.components.InputBox
import com.s2nova.app.ui.components.MoneyInput
import com.s2nova.app.ui.components.PillRow
import com.s2nova.app.ui.components.RadioRow
import com.s2nova.app.ui.components.SymbolBadge
import com.s2nova.app.ui.components.V2Button
import com.s2nova.app.ui.components.V2Pill
import com.s2nova.app.ui.components.noRippleClick
import com.s2nova.app.ui.screens.wallets.WalletMark
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch

// First run of a new account (ONBOARDING.md §2): "Tu moneda principal" →
// "Crea tu primera billetera" → Inicio. Not skippable; the user never lands
// in the app without a wallet.

// Marks onboarding done locally and server-side.
suspend fun completeOnboarding() {
    AppContainer.onboardingStore.markOnboardingComplete()
    AppContainer.onboardingStore.markTutorialComplete()
    AppContainer.authRepository.markOnboardingCompleted()
    AppContainer.authRepository.markTutorialCompleted()
}

@Composable
fun FirstRunScreen(onBackToSignup: () -> Unit, onDone: () -> Unit) {
    val colors = NovaColors.current
    val scope = rememberCoroutineScope()
    val detected = remember { Currencies.deviceCurrency() }
    var step by remember { mutableStateOf(0) }
    var principal by remember { mutableStateOf(detected) }
    var name by remember { mutableStateOf("") }
    var kind by remember { mutableStateOf(WalletKind.SAVINGS) }
    var amount by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val valid = step == 0 || name.isNotBlank()

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(Modifier.padding(start = 18.dp, end = 18.dp, top = 10.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Box(Modifier.size(38.dp).clip(CircleShape).noRippleClick { if (step == 1) step = 0 else onBackToSignup() }, contentAlignment = Alignment.Center) {
                Text("←", fontSize = 19.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                repeat(2) { i ->
                    Box(Modifier.weight(1f).height(3.dp).clip(RoundedCornerShape(2.dp)).background(if (i <= step) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant))
                }
            }
            Spacer(Modifier.width(38.dp))
        }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(start = 24.dp, end = 24.dp, top = 18.dp, bottom = 8.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
            Column {
                Text("PASO ${step + 1} DE 2", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.2.sp, color = colors.accentText)
                Text(if (step == 1) "Crea tu primera billetera" else "Tu moneda principal", fontSize = 26.sp, lineHeight = 30.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.78).sp, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(top = 10.dp))
                Text(
                    if (step == 1) "Necesitas al menos una para registrar movimientos. Puede ser tu cuenta de ahorros, Nequi o el efectivo que llevas."
                    else "La usamos para el saldo total y los reportes. La detectamos por la región de tu dispositivo; puedes cambiarla y agregar otras monedas después.",
                    fontSize = 13.sp, lineHeight = 19.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 9.dp),
                )
            }
            if (step == 0) {
                Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    listOf("COP", "USD", "EUR", "MXN", "PEN").let { if (detected in it) it else listOf(detected) + it }.forEach { code ->
                        RadioRow(principal == code, { principal = code }, leading = { SymbolBadge(Currencies.symbol(code)) }) {
                            Column(Modifier.weight(1f)) {
                                Text(Currencies.name(code) + " · " + code, fontSize = 13.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                                if (code == detected) Text("Detectada en tu dispositivo · " + Currencies.deviceCountry(), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.accentText, modifier = Modifier.padding(top = 3.dp))
                            }
                        }
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                    Column {
                        FieldLabel("Nombre")
                        InputBox(vertical = 11.dp) {
                            WalletMark(kind, 40.dp)
                            BareField(name, { v -> name = v; WalletKind.guess(v)?.let { kind = it } }, "Nequi, Bancolombia, Efectivo…")
                        }
                    }
                    Column {
                        FieldLabel("Tipo")
                        PillRow { WalletKind.entries.forEach { k -> V2Pill(k.label, kind == k, { kind = k }) } }
                    }
                    Column {
                        FieldLabel("Moneda")
                        Row(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(colors.bgDeep).border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(14.dp)).padding(horizontal = 14.dp, vertical = 11.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            SymbolBadge(Currencies.symbol(principal))
                            Text(Currencies.name(principal) + " · " + principal, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                        }
                        FieldNote("Puedes crear billeteras en otras monedas después, desde Billeteras.", Modifier.padding(top = 8.dp))
                    }
                    Column {
                        FieldLabel("Saldo actual")
                        MoneyInput(amount, { amount = it }, Currencies.symbol(principal))
                    }
                }
            }
        }
        Box(Modifier.padding(start = 24.dp, end = 24.dp, top = 8.dp, bottom = 26.dp)) {
            V2Button(if (step == 1) "Crear billetera y entrar" else "Continuar", enabled = valid && !busy, verticalPadding = 16.dp, fontSize = 14.sp, onClick = {
                if (step == 0) { step = 1; return@V2Button }
                busy = true
                scope.launch {
                    runCatching {
                        AppContainer.currencyRepository.setPrincipal(principal)
                        AppContainer.walletRepository.principal = principal
                        AppContainer.walletRepository.create(name.trim(), kind.type, amount.toDoubleOrNull() ?: 0.0, principal)
                        completeOnboarding()
                        AppContainer.authRepository.updateUser { it.copy(principalCurrency = principal, onboardingCompleted = true) }
                        AppContainer.refreshUserData()
                    }.onSuccess { onDone() }.onFailure {
                        busy = false
                        Snack.show("No se pudo crear la billetera. Intenta de nuevo.")
                    }
                }
            })
        }
    }
}
