package com.s2nova.app.ui.screens.settings

import com.s2nova.app.ui.theme.appCanvas
import com.s2nova.app.ui.components.biometricsAvailable
import com.s2nova.app.ui.components.confirmBiometric
import com.s2nova.app.ui.components.findFragmentActivity
import com.s2nova.app.data.remote.toUserMessage
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.BuildConfig
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.ThemeController
import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.data.model.Currency
import com.s2nova.app.data.remote.UpdatePreferencesRequest
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.BackHeader
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.NovaSwitch
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.NovaType
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.components.V2Icons
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.selection.toggleable
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import com.s2nova.app.ui.theme.NovaFontFamily
import kotlinx.coroutines.launch
import com.s2nova.app.ui.tr

// Auto-lock choices in minutes; 0 is "Nunca" (see backend me.ts).
private val LOCK_OPTIONS = listOf(1, 5, 15, 60, 0)


// The mockup has no box-sizing, so a 1px border adds to each box's padding;
// Compose draws borders inside, hence the +1dp on bordered boxes below.
// Ajustes (Android v2 mockup): Información personal, Preferencias,
// Privacidad y sesión, "Repetir el tutorial" (a sheet over this screen)
// Cambiar contraseña, Zona de riesgo and Acerca de. Sessions live on Web.
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(onBack: () -> Unit, onOpenCategories: () -> Unit = {}, onOpenCurrencies: () -> Unit = {}, onOpenPassword: () -> Unit = {}, onOpenReset: () -> Unit = {}, onOpenDelete: () -> Unit = {}) {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val darkOverride by ThemeController.darkOverride.collectAsStateWithLifecycle()
    val isDark = darkOverride ?: androidx.compose.foundation.isSystemInDarkTheme()
    val colors = NovaColors.current
    val t = rememberStrings()
    val scope = rememberCoroutineScope()

    var name by remember { mutableStateOf(user?.name ?: "") }
    var phone by remember { mutableStateOf(user?.phone ?: "") }
    var city by remember { mutableStateOf(user?.city ?: "") }
    val preferences = user?.preferences
    val context = androidx.compose.ui.platform.LocalContext.current
    // On only when Android lets them through too.
    val notifications = (preferences?.notifications ?: true) && com.s2nova.app.data.notifications.AlertNotifier.canPost(context)
    // On only where this phone holds the credential: the preference is the
    // account's, the credential is the device's.
    val biometricEnrolled by AppContainer.authRepository.biometricEnrolled.collectAsStateWithLifecycle(initialValue = false)
    val biometric = (preferences?.biometricLogin ?: false) && biometricEnrolled
    val blurBalance = preferences?.blurBalance ?: false
    val autoLockMinutes = preferences?.autoLockMinutes ?: 5
    val currency = preferences?.currency ?: Currency.COP
    val language = preferences?.language ?: AppLanguage.ES

    // Optimistic: the local user updates at once, the backend follows.
    fun persist(local: (com.s2nova.app.data.model.UserPreferences) -> com.s2nova.app.data.model.UserPreferences, request: UpdatePreferencesRequest) {
        AppContainer.authRepository.updateUser { u -> u.copy(preferences = local(u.preferences)) }
        scope.launch { AppContainer.authRepository.persistPreferences(request) }
    }

    fun setNotifications(on: Boolean) {
        persist({ p -> p.copy(notifications = on) }, UpdatePreferencesRequest(notifications = on))
        com.s2nova.app.data.notifications.AlertNotifier.setEnabled(on)
    }
    val notifDenied = t(StringKey.SETTINGS_NOTIFICATIONS_DENIED)
    val notificationPermission = androidx.activity.compose.rememberLauncherForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.RequestPermission(),
    ) { granted -> if (granted) setNotifications(true) else com.s2nova.app.ui.Snack.show(notifDenied) }

    fun lockName(minutes: Int): String = when (minutes) {
        0 -> t(StringKey.SETTINGS_AUTO_LOCK_NEVER)
        1 -> t(StringKey.SETTINGS_LOCK_1_MINUTE)
        60 -> t(StringKey.SETTINGS_LOCK_1_HOUR)
        else -> t(StringKey.SETTINGS_LOCK_MINUTES).format(minutes)
    }

    Scaffold(
        containerColor = androidx.compose.ui.graphics.Color.Transparent,
        modifier = Modifier.appCanvas(MaterialTheme.colorScheme.background),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            BackHeader(title = t(StringKey.TITLE_SETTINGS), onBack = onBack)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                SectionTitle(t(StringKey.SETTINGS_PERSONAL_INFO))
                FieldBox(label = t(StringKey.SETTINGS_FULL_NAME), value = name, onValueChange = { name = it })
                FieldBox(label = t(StringKey.SETTINGS_EMAIL), value = user?.email ?: "", onValueChange = {}, enabled = false)
                FieldBox(label = t(StringKey.SETTINGS_PHONE), value = phone, onValueChange = { phone = it })
                FieldBox(label = t(StringKey.SETTINGS_CITY), value = city, onValueChange = { city = it })
                // Primary button (§6.3): 52 dp, full width.
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .padding(top = 4.dp)
                        .fillMaxWidth()
                        .height(52.dp)
                        .clip(RoundedCornerShape(50))
                        .background(com.s2nova.app.ui.theme.ctaBrush())
                        .clickable(role = Role.Button) {
                            scope.launch {
                                AppContainer.authRepository.updateProfile(name = name, phone = phone.trim().ifBlank { null }, city = city.trim().ifBlank { null })
                            }
                        },
                ) {
                    Text(t(StringKey.SETTINGS_SAVE_CHANGES), style = NovaType.label, color = androidx.compose.ui.graphics.Color.White, maxLines = 1, softWrap = false)
                }

                SectionTitle(t(StringKey.SETTINGS_PREFERENCES), modifier = Modifier.padding(top = 16.dp))
                NovaCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        SwitchRow(t(StringKey.SETTINGS_DARK_MODE), isDark) { ThemeController.setDark(it) }
                        SwitchRow(t(StringKey.SETTINGS_NOTIFICATIONS), notifications) { on ->
                            // Android 13+ needs the runtime permission before turning them on.
                            val needsPermission = on && android.os.Build.VERSION.SDK_INT >= 33 &&
                                androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED
                            if (needsPermission) {
                                runCatching { notificationPermission.launch(android.Manifest.permission.POST_NOTIFICATIONS) }
                                    .onFailure { com.s2nova.app.ui.Snack.show(notifDenied) }
                            } else {
                                setNotifications(on)
                                // Allowed, but switched off for the app in the system settings.
                                if (on && !com.s2nova.app.data.notifications.AlertNotifier.canPost(context)) com.s2nova.app.ui.Snack.show(notifDenied)
                            }
                        }
                        SwitchRow(t(StringKey.SETTINGS_BIOMETRIC), biometric) { on ->
                            scope.launch {
                                if (!on) {
                                    AppContainer.authRepository.disableBiometric()
                                    return@launch
                                }
                                // Turning it on asks for the biometric check that seals the credential.
                                val activity = context.findFragmentActivity()
                                val cipher = if (activity != null && biometricsAvailable(context)) runCatching { AppContainer.biometricStore.newEncryptCipher() }.getOrNull() else null
                                if (activity == null || cipher == null) {
                                    com.s2nova.app.ui.Snack.show(tr(StringKey.BIO_UNAVAILABLE))
                                    return@launch
                                }
                                val unlocked = activity.confirmBiometric(
                                    tr(StringKey.BIO_PROMPT_TITLE), tr(StringKey.BIO_PROMPT_ENABLE), tr(StringKey.BIO_PROMPT_CANCEL), cipher,
                                ) ?: return@launch
                                AppContainer.authRepository.enableBiometric(unlocked)
                                    .onFailure { com.s2nova.app.ui.Snack.show(it.toUserMessage(tr(StringKey.BIO_ENABLE_ERR))) }
                            }
                        }
                        SegmentedRow(t(StringKey.SETTINGS_LANGUAGE), listOf(AppLanguage.ES to "Español", AppLanguage.EN to "English"), language) {
                            persist({ p -> p.copy(language = it) }, UpdatePreferencesRequest(language = it.name.lowercase()))
                        }
                    }
                }

                // Ajustes › Categorías and › Monedas (v2); the COP/USD format
                // switch is gone — the principal currency replaces it.
                val cats = AppContainer.categoryRepository
                val customCount = cats.all().count { it.custom }
                LinkCard(
                    tr(StringKey.CAT_TITLE),
                    tr(StringKey.SET_CAT_SUMMARY, cats.parents(false).size, cats.parents(true).size) + if (customCount > 0) tr(StringKey.SET_CAT_CUSTOM, customCount) else "",
                    Modifier.padding(top = 16.dp),
                    onOpenCategories,
                )
                val currencies = AppContainer.currencyRepository.currencies.value
                val principal = AppContainer.currencyRepository.principal
                val others = currencies.filter { it.code != principal }.map { it.code }
                LinkCard(tr(StringKey.CUR_TITLE), tr(StringKey.SET_CUR_DETAIL, principal) + if (others.isNotEmpty()) " · " + others.joinToString(", ") else "", Modifier, onOpenCurrencies)

                SectionTitle(t(StringKey.SETTINGS_PRIVACY_SESSION), modifier = Modifier.padding(top = 16.dp))
                NovaCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(t(StringKey.SETTINGS_BLUR_BALANCE), style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface)
                                Text(
                                    t(if (blurBalance) StringKey.SETTINGS_BLUR_BALANCE_HELP_ON else StringKey.SETTINGS_BLUR_BALANCE_HELP_OFF),
                                    style = NovaType.bodySm,
                                    color = colors.textDim,
                                )
                            }
                            NovaSwitch(checked = blurBalance, onCheckedChange = {
                                persist({ p -> p.copy(blurBalance = it) }, UpdatePreferencesRequest(blurBalance = it))
                            })
                        }
                        Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(colors.dividerSubtle))
                        Column {
                            Row(verticalAlignment = Alignment.Bottom) {
                                Text(t(StringKey.SETTINGS_AUTO_LOCK), style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f).alignByBaseline())
                                Text(lockName(autoLockMinutes), style = NovaType.label, color = colors.link, maxLines = 1, softWrap = false, modifier = Modifier.padding(start = 12.dp).alignByBaseline())
                            }
                            FlowRow(
                                modifier = Modifier.padding(top = 8.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                LOCK_OPTIONS.forEach { minutes ->
                                    LockPill(lockName(minutes), selected = autoLockMinutes == minutes) {
                                        persist({ p -> p.copy(autoLockMinutes = minutes) }, UpdatePreferencesRequest(autoLockMinutes = minutes))
                                    }
                                }
                            }
                            Text(
                                when {
                                    autoLockMinutes == 0 -> t(StringKey.SETTINGS_AUTO_LOCK_HELP_NEVER)
                                    biometric -> t(StringKey.SETTINGS_AUTO_LOCK_HELP_BIOMETRIC_AFTER).format(lockName(autoLockMinutes).lowercase())
                                    else -> t(StringKey.SETTINGS_AUTO_LOCK_HELP_PASSWORD_AFTER).format(lockName(autoLockMinutes).lowercase())
                                },
                                style = NovaType.bodySm,
                                color = colors.textDim,
                                modifier = Modifier.padding(top = 8.dp),
                            )
                        }
                    }
                }

                LinkCard(tr(StringKey.SET_PW_TITLE), tr(StringKey.SET_PW_DETAIL), Modifier.padding(top = 8.dp), onOpenPassword)

                // "Ver las guías otra vez" resets the mini-guides (ONBOARDING.md §3).
                NovaCard(modifier = Modifier.fillMaxWidth().padding(top = 8.dp), onClick = {
                    scope.launch { AppContainer.authRepository.updateGuides(emptySet(), false) }
                    com.s2nova.app.ui.Snack.show(tr(StringKey.SET_GUIDES_TOAST))
                }) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(tr(StringKey.SET_GUIDES_AGAIN), style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface)
                            Text(tr(StringKey.SET_GUIDES_DETAIL), style = NovaType.bodySm, color = colors.textDim)
                        }
                        V2Icon(V2Icons.chevronRight, colors.textDim, 20.dp)
                    }
                }
                NovaCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                        Text(t(StringKey.SETTINGS_ABOUT), style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface)
                        Text("S2 Nova · v${BuildConfig.VERSION_NAME}", style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                SectionTitle(tr(StringKey.SET_RISK_TITLE), modifier = Modifier.padding(top = 16.dp))
                Text(tr(StringKey.SET_RISK_HINT), style = NovaType.bodySm, color = colors.textDim)
                DangerLinkCard(tr(StringKey.SET_RESET_TITLE), tr(StringKey.SET_RESET_DETAIL), onOpenReset)
                DangerLinkCard(tr(StringKey.SET_DELETE_TITLE), tr(StringKey.SET_DELETE_DETAIL), onOpenDelete)
            }
        }
    }

}

@Composable
private fun LinkCard(title: String, detail: String, modifier: Modifier, onClick: () -> Unit) {
    NovaCard(modifier = modifier.fillMaxWidth(), onClick = onClick) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface)
                Text(detail, style = NovaType.bodySm, color = NovaColors.current.textDim)
            }
            V2Icon(V2Icons.chevronRight, NovaColors.current.textDim, 20.dp)
        }
    }
}

// A LinkCard whose title is in `negative` and whose border is the danger one.
@Composable
private fun DangerLinkCard(title: String, detail: String, onClick: () -> Unit) {
    val colors = NovaColors.current
    NovaCard(modifier = Modifier.fillMaxWidth(), borderColor = colors.negative, onClick = onClick) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = NovaType.titleSm, color = colors.negative)
                Text(detail, style = NovaType.bodySm, color = colors.textDim)
            }
            V2Icon(V2Icons.chevronRight, colors.textDim, 20.dp)
        }
    }
}

@Composable
private fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(text, style = NovaType.title, color = MaterialTheme.colorScheme.onBackground, modifier = modifier.semantics { heading() })
}

// Input (§6.6): a visible label above the field; the field is 52 dp tall
// with a `border-input` border. The email (not editable here) sits on
// `surface-sunken` with dimmed text.
@Composable
private fun FieldBox(label: String, value: String, onValueChange: (String) -> Unit, enabled: Boolean = true) {
    val colors = NovaColors.current
    val shape = RoundedCornerShape(12.dp)
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(label, style = NovaType.label, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 2.dp, bottom = 6.dp))
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            enabled = enabled,
            singleLine = true,
            textStyle = NovaType.body.copy(color = if (enabled) MaterialTheme.colorScheme.onSurface else colors.textDim),
            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
            modifier = Modifier.fillMaxWidth().semantics { contentDescription = label },
            decorationBox = { inner ->
                Box(
                    contentAlignment = Alignment.CenterStart,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 52.dp)
                        .clip(shape)
                        .background(if (enabled) MaterialTheme.colorScheme.surface else colors.surfaceSunken)
                        .border(1.dp, if (enabled) colors.borderInput else MaterialTheme.colorScheme.outline, shape)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                ) { inner() }
            },
        )
    }
}

// A switch row: the whole row toggles, on a 56 dp target.
@Composable
private fun SwitchRow(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp).toggleable(value = checked, role = Role.Switch, onValueChange = onChange),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
        NovaSwitch(checked = checked, onCheckedChange = null)
    }
}

// Segmented (§6.5): `surface-sunken` track, the selected segment on
// `surface` with a border and weight 600; 44 dp tall, radio semantics.
@Composable
private fun <T> SegmentedRow(label: String, options: List<Pair<T, String>>, selected: T, onSelect: (T) -> Unit) {
    val colors = NovaColors.current
    Row(modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
        Row(
            modifier = Modifier.height(44.dp).clip(RoundedCornerShape(12.dp)).background(colors.surfaceSunken).padding(4.dp).selectableGroup(),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            options.forEach { (value, text) ->
                val active = value == selected
                val shape = RoundedCornerShape(8.dp)
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .fillMaxHeight()
                        .clip(shape)
                        .background(if (active) MaterialTheme.colorScheme.surface else Color.Transparent)
                        .then(if (active) Modifier.border(1.dp, MaterialTheme.colorScheme.outline, shape) else Modifier)
                        .selectable(selected = active, role = Role.RadioButton) { onSelect(value) }
                        .padding(horizontal = 12.dp),
                ) {
                    Text(
                        text,
                        style = NovaType.label.copy(fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium),
                        color = if (active) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        softWrap = false,
                    )
                }
            }
        }
    }
}

// The shared chip (V2Pill, DESIGN-SYSTEM.md §6.5).
@Composable
private fun LockPill(label: String, selected: Boolean, onClick: () -> Unit) = com.s2nova.app.ui.components.V2Pill(label, selected, onClick)

