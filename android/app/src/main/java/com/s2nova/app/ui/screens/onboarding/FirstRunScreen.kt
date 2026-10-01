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
import androidx.compose.foundation.clickable
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.theme.NovaType
import kotlinx.coroutines.launch
import com.s2nova.app.ui.tr
import com.s2nova.app.ui.StringKey

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
        Row(Modifier.padding(start = 4.dp, end = 4.dp, top = 4.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            val backLabel = tr(StringKey.COMMON_BACK)
            Box(
                Modifier.size(48.dp).clip(CircleShape)
                    .clickable(role = Role.Button) { if (step == 1) step = 0 else onBackToSignup() }
                    .semantics { contentDescription = backLabel },
                contentAlignment = Alignment.Center,
            ) {
                V2Icon(V2Icons.back, MaterialTheme.colorScheme.onBackground, 24.dp)
            }
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                repeat(2) { i ->
                    Box(Modifier.weight(1f).height(4.dp).clip(RoundedCornerShape(2.dp)).background(if (i <= step) NovaColors.current.primaryBorder else MaterialTheme.colorScheme.outline))
                }
            }
            Spacer(Modifier.width(48.dp))
        }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(start = 24.dp, end = 24.dp, top = 18.dp, bottom = 8.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
            Column {
                Text(tr(StringKey.FIRST_STEP, step + 1), style = NovaType.overline, color = colors.link)
                Text(tr(if (step == 1) StringKey.FIRST_WALLET_TITLE else StringKey.FIRST_CURRENCY_TITLE), style = NovaType.headline, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(top = 8.dp).semantics { heading() })
                Text(
                    tr(if (step == 1) StringKey.FIRST_WALLET_BODY else StringKey.FIRST_CURRENCY_BODY),
                    style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp),
                )
            }
            if (step == 0) {
                Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    listOf("COP", "USD", "EUR", "MXN", "PEN").let { if (detected in it) it else listOf(detected) + it }.forEach { code ->
                        RadioRow(principal == code, { principal = code }, leading = { SymbolBadge(Currencies.symbol(code)) }) {
                            Column(Modifier.weight(1f)) {
                                Text(Currencies.name(code) + " · " + code, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onBackground)
                                if (code == detected) Text(tr(StringKey.FIRST_DETECTED, Currencies.deviceCountry()), style = NovaType.bodySm, color = colors.link)
                            }
                        }
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                    Column {
                        FieldLabel(tr(StringKey.PLAN_NAME))
                        InputBox(vertical = 11.dp) {
                            WalletMark(kind, 40.dp)
                            BareField(name, { v -> name = v; WalletKind.guess(v)?.let { kind = it } }, tr(StringKey.FIRST_NAME_PH))
                        }
                    }
                    Column {
                        FieldLabel(tr(StringKey.WALLET_TYPE))
                        PillRow { WalletKind.entries.forEach { k -> V2Pill(k.label, kind == k, { kind = k }) } }
                    }
                    Column {
                        FieldLabel(tr(StringKey.WALLET_CURRENCY))
                        Row(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(colors.bgDeep).border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(14.dp)).padding(horizontal = 14.dp, vertical = 11.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            SymbolBadge(Currencies.symbol(principal))
                            Text(Currencies.name(principal) + " · " + principal, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onBackground)
                        }
                        FieldNote(tr(StringKey.FIRST_OTHER_CURRENCIES), Modifier.padding(top = 8.dp))
                    }
                    Column {
                        FieldLabel(tr(StringKey.WALLET_BALANCE))
                        com.s2nova.app.ui.components.AmountField(amount, { amount = it }, principal, title = tr(StringKey.WALLET_INITIAL))
                    }
                }
            }
        }
        Box(Modifier.padding(start = 24.dp, end = 24.dp, top = 8.dp, bottom = 26.dp)) {
            V2Button(tr(if (step == 1) StringKey.FIRST_CREATE else StringKey.CONFIRM_CONTINUE), enabled = valid && !busy, verticalPadding = 16.dp, fontSize = 14.sp, onClick = {
                if (step == 0) { step = 1; return@V2Button }
                busy = true
                scope.launch {
                    runCatching {
                        AppContainer.currencyRepository.setPrincipal(principal)
                        AppContainer.walletRepository.principal = principal
                        AppContainer.walletRepository.create(name.trim(), kind.type, com.s2nova.app.ui.screens.addtransaction.AmountPad.eval(amount), principal)
                        completeOnboarding()
                        AppContainer.authRepository.updateUser { it.copy(principalCurrency = principal, onboardingCompleted = true) }
                        AppContainer.refreshUserData()
                    }.onSuccess { onDone() }.onFailure {
                        busy = false
                        Snack.show(tr(StringKey.FIRST_ERR))
                    }
                }
            })
        }
    }
}
