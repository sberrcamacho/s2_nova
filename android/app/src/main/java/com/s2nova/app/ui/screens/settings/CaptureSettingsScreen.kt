package com.s2nova.app.ui.screens.settings

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import android.provider.Telephony
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.graphics.drawable.toBitmap
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.notifications.NotificationCapture
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.DraftSheetPrimaryButton
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.StepChoiceRow
import com.s2nova.app.ui.components.shortWalletName
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.NovaType

private data class InstalledApp(val packageName: String, val label: String)

// Bank, wallet and payment apps, by name or package (Colombia first).
private val FINANCE = Regex(
    "banc|bank|nequi|daviplata|davivienda|bbva|colpatria|scotiabank|\\bnu\\b|nubank|lulo|rappipay|rappi pay|movii|dale|tpaga|pse|tarjeta|wallet|billetera|" +
        "\\bpay\\b|finanz|cr[eé]dit|falabella|ita[uú]|av villas|popular|occidente|bogot|caja social|serfinanza|bancam[ií]a|confiar|cotrafa|pibank|ual[aá]|global66|wise|revolut|paypal|todo1",
    RegexOption.IGNORE_CASE,
)
// Messaging apps are never offered: their notifications are people's messages.
private val MESSAGING = Regex("messag|mms|sms|whatsapp|telegram|signal|messenger|chat|mail|gmail|outlook", RegexOption.IGNORE_CASE)

private fun launchableApps(context: Context): List<InstalledApp> {
    val pm = context.packageManager
    val sms = runCatching { Telephony.Sms.getDefaultSmsPackage(context) }.getOrNull()
    return pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), PackageManager.MATCH_ALL)
        .map { InstalledApp(it.activityInfo.packageName, it.loadLabel(pm).toString()) }
        .distinctBy { it.packageName }
        .filter { it.packageName != context.packageName && it.packageName != sms && !MESSAGING.containsMatchIn(it.packageName + " " + it.label) }
        .sortedBy { it.label.lowercase() }
}

// Ajustes › Registrar desde notificaciones: the disclosure, Android's
// notification access, the switch, which apps are read (and the wallet each
// one's movements go to) and whether unrecognised ones may go to the AI.
@Composable
fun CaptureSettingsScreen(onBack: () -> Unit) {
    val t = rememberStrings()
    val context = LocalContext.current
    val colors = NovaColors.current
    var settings by remember { mutableStateOf(NotificationCapture.settings(context)) }
    var access by remember { mutableStateOf(NotificationCapture.accessGranted(context)) }
    var disclosure by remember { mutableStateOf(false) }
    var showAll by remember { mutableStateOf(false) }
    var walletFor by remember { mutableStateOf<InstalledApp?>(null) }
    val apps = remember { launchableApps(context) }
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val shown = apps.filter { showAll || FINANCE.containsMatchIn(it.packageName + " " + it.label) || it.packageName in settings.apps }

    fun save(next: NotificationCapture.Settings) {
        settings = next
        NotificationCapture.saveSettings(next, context)
    }
    // Back from Android's settings: is access allowed now?
    LifecycleResumeEffect(Unit) {
        access = NotificationCapture.accessGranted(context)
        onPauseOrDispose {}
    }

    SecurityFrame(title = t(StringKey.CAPTURE_TITLE), onBack = onBack) {
        Text(t(StringKey.CAPTURE_INTRO), style = NovaType.body, color = MaterialTheme.colorScheme.onSurfaceVariant)
        NovaCard(modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                SwitchRow(t(StringKey.CAPTURE_SWITCH), settings.enabled && access) { on ->
                    if (on) disclosure = true else save(settings.copy(enabled = false))
                }
                // Android's own switch, shown with its state as text.
                Row(Modifier.fillMaxWidth().heightIn(min = 56.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Column(Modifier.weight(1f)) {
                        Text(t(StringKey.CAPTURE_ACCESS), style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface)
                        Text(t(if (access) StringKey.CAPTURE_ACCESS_ON else StringKey.CAPTURE_ACCESS_OFF), style = NovaType.bodySm, color = if (access) colors.positive else colors.textDim)
                    }
                    if (!access) {
                        Text(
                            t(StringKey.CAPTURE_ACCESS_OPEN),
                            style = NovaType.label,
                            color = colors.accentText,
                            modifier = Modifier.clip(RoundedCornerShape(10.dp)).clickable(role = Role.Button) { disclosure = true }.padding(horizontal = 12.dp, vertical = 14.dp),
                        )
                    }
                }
            }
        }

        SectionTitle(t(StringKey.CAPTURE_APPS))
        Text(t(StringKey.CAPTURE_APPS_HINT), style = NovaType.bodySm, color = colors.textDim)
        NovaCard(modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(horizontal = 8.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                if (shown.isEmpty()) Text(t(StringKey.CAPTURE_APPS_EMPTY), style = NovaType.bodySm, color = colors.textDim, modifier = Modifier.padding(8.dp))
                shown.forEach { app ->
                    val on = app.packageName in settings.apps
                    val icon = remember(app.packageName) { runCatching { context.packageManager.getApplicationIcon(app.packageName).toBitmap(96, 96).asImageBitmap() }.getOrNull() }
                    StepChoiceRow(
                        label = app.label,
                        selected = on,
                        multi = true,
                        onClick = {
                            save(
                                if (on) settings.copy(apps = settings.apps - app.packageName, labels = settings.labels - app.packageName)
                                else settings.copy(apps = settings.apps + (app.packageName to null), labels = settings.labels + (app.packageName to app.label)),
                            )
                        },
                        leading = icon?.let { { Image(it, contentDescription = null, modifier = Modifier.size(28.dp).clip(RoundedCornerShape(7.dp))) } },
                    )
                    if (on) {
                        val wallet = wallets.firstOrNull { it.id == settings.apps[app.packageName] }
                        Row(
                            Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(RoundedCornerShape(10.dp)).clickable(role = Role.Button) { walletFor = app }.padding(start = 52.dp, end = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(t(StringKey.CAPTURE_WALLET), style = NovaType.bodySm, color = colors.textDim, modifier = Modifier.weight(1f))
                            Text(wallet?.let { shortWalletName(it.name) } ?: t(StringKey.CAPTURE_WALLET_ASK), style = NovaType.label, color = colors.accentText, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
                if (!showAll) {
                    Text(
                        t(StringKey.CAPTURE_SHOW_ALL),
                        style = NovaType.label,
                        color = colors.accentText,
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(RoundedCornerShape(10.dp)).clickable(role = Role.Button) { showAll = true }.padding(horizontal = 12.dp, vertical = 14.dp),
                    )
                }
            }
        }

        NovaCard(modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                SwitchRow(t(StringKey.CAPTURE_AI), settings.allowAi) { save(settings.copy(allowAi = it)) }
                Text(t(StringKey.CAPTURE_AI_HINT), style = NovaType.bodySm, color = colors.textDim, modifier = Modifier.padding(bottom = 8.dp))
            }
        }
    }

    // Prominent disclosure before notification access (Play policy).
    if (disclosure) {
        NovaDraftSheet(onDismiss = { disclosure = false }, title = t(StringKey.CAPTURE_DISCLOSURE_TITLE)) {
            Text(t(StringKey.CAPTURE_DISCLOSURE_BODY), style = NovaType.body, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 4.dp, end = 4.dp, bottom = 20.dp))
            DraftSheetPrimaryButton(t(StringKey.CAPTURE_DISCLOSURE_OK), enabled = true, onClick = {
                disclosure = false
                save(settings.copy(enabled = true))
                if (!NotificationCapture.accessGranted(context)) {
                    runCatching { context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
                }
            })
        }
    }

    walletFor?.let { app ->
        NovaDraftSheet(onDismiss = { walletFor = null }, title = t(StringKey.CAPTURE_WALLET_TITLE).format(app.label)) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                val current = settings.apps[app.packageName]
                StepChoiceRow(t(StringKey.CAPTURE_WALLET_ASK), selected = current == null, onClick = {
                    save(settings.copy(apps = settings.apps + (app.packageName to null)))
                    walletFor = null
                })
                wallets.forEach { w ->
                    StepChoiceRow(shortWalletName(w.name), selected = current == w.id, onClick = {
                        save(settings.copy(apps = settings.apps + (app.packageName to w.id)))
                        walletFor = null
                    })
                }
            }
        }
    }
}
