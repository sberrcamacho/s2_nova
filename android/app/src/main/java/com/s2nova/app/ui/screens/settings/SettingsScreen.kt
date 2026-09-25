package com.s2nova.app.ui.screens.settings

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
import com.s2nova.app.ui.theme.NovaFontFamily
import kotlinx.coroutines.launch

// Auto-lock choices in minutes; 0 is "Nunca" (see backend me.ts).
private val LOCK_OPTIONS = listOf(1, 5, 15, 60, 0)

private val TUTORIAL = listOf(
    StringKey.TUTORIAL_1_TITLE to StringKey.TUTORIAL_1_BODY,
    StringKey.TUTORIAL_2_TITLE to StringKey.TUTORIAL_2_BODY,
    StringKey.TUTORIAL_3_TITLE to StringKey.TUTORIAL_3_BODY,
    StringKey.TUTORIAL_4_TITLE to StringKey.TUTORIAL_4_BODY,
)

// The mockup has no box-sizing, so a 1px border adds to each box's padding;
// Compose draws borders inside, hence the +1dp on bordered boxes below.
// Ajustes (Android v2 mockup): Información personal, Preferencias,
// Privacidad y sesión, "Repetir el tutorial" (a sheet over this screen)
// and Acerca de. Password, sessions and account deletion live on Web.
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val darkOverride by ThemeController.darkOverride.collectAsStateWithLifecycle()
    val isDark = darkOverride ?: androidx.compose.foundation.isSystemInDarkTheme()
    val colors = NovaColors.current
    val t = rememberStrings()
    val scope = rememberCoroutineScope()

    var name by remember { mutableStateOf(user?.name ?: "") }
    var phone by remember { mutableStateOf(user?.phone ?: "") }
    var city by remember { mutableStateOf(user?.city ?: "") }
    var tutorialStep by remember { mutableStateOf<Int?>(null) }
    val preferences = user?.preferences
    val notifications = preferences?.notifications ?: true
    val biometric = preferences?.biometricLogin ?: false
    val blurBalance = preferences?.blurBalance ?: false
    val autoLockMinutes = preferences?.autoLockMinutes ?: 5
    val currency = preferences?.currency ?: Currency.COP
    val language = preferences?.language ?: AppLanguage.ES

    // Optimistic: the local user updates at once, the backend follows.
    fun persist(local: (com.s2nova.app.data.model.UserPreferences) -> com.s2nova.app.data.model.UserPreferences, request: UpdatePreferencesRequest) {
        AppContainer.authRepository.updateUser { u -> u.copy(preferences = local(u.preferences)) }
        scope.launch { AppContainer.authRepository.persistPreferences(request) }
    }

    fun lockName(minutes: Int): String = when (minutes) {
        0 -> t(StringKey.SETTINGS_AUTO_LOCK_NEVER)
        1 -> t(StringKey.SETTINGS_LOCK_1_MINUTE)
        60 -> t(StringKey.SETTINGS_LOCK_1_HOUR)
        else -> t(StringKey.SETTINGS_LOCK_MINUTES).format(minutes)
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            BackHeader(title = t(StringKey.TITLE_SETTINGS), onBack = onBack)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(start = 20.dp, end = 20.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                SectionTitle(t(StringKey.SETTINGS_PERSONAL_INFO))
                FieldBox(label = t(StringKey.SETTINGS_FULL_NAME), value = name, onValueChange = { name = it })
                FieldBox(label = t(StringKey.SETTINGS_EMAIL), value = user?.email ?: "", onValueChange = {}, enabled = false)
                FieldBox(label = t(StringKey.SETTINGS_PHONE), value = phone, onValueChange = { phone = it })
                FieldBox(label = t(StringKey.SETTINGS_CITY), value = city, onValueChange = { city = it })
                Text(
                    t(StringKey.SETTINGS_SAVE_CHANGES),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White,
                    modifier = Modifier
                        .padding(top = 4.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(MaterialTheme.colorScheme.primary)
                        .clickable {
                            scope.launch {
                                AppContainer.authRepository.updateProfile(name = name, phone = phone.trim().ifBlank { null }, city = city.trim().ifBlank { null })
                            }
                        }
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                )

                SectionTitle(t(StringKey.SETTINGS_PREFERENCES), modifier = Modifier.padding(top = 16.dp))
                NovaCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(17.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        SwitchRow(t(StringKey.SETTINGS_DARK_MODE), isDark) { ThemeController.setDark(it) }
                        SwitchRow(t(StringKey.SETTINGS_NOTIFICATIONS), notifications) {
                            persist({ p -> p.copy(notifications = it) }, UpdatePreferencesRequest(notifications = it))
                        }
                        SwitchRow(t(StringKey.SETTINGS_BIOMETRIC), biometric) {
                            persist({ p -> p.copy(biometricLogin = it) }, UpdatePreferencesRequest(biometricLogin = it))
                        }
                        SegmentedRow(t(StringKey.SETTINGS_CURRENCY_FORMAT), listOf(Currency.COP to "COP", Currency.USD to "USD"), currency) {
                            persist({ p -> p.copy(currency = it) }, UpdatePreferencesRequest(currency = it.name))
                        }
                        SegmentedRow(t(StringKey.SETTINGS_LANGUAGE), listOf(AppLanguage.ES to "Español", AppLanguage.EN to "English"), language) {
                            persist({ p -> p.copy(language = it) }, UpdatePreferencesRequest(language = it.name.lowercase()))
                        }
                    }
                }

                SectionTitle(t(StringKey.SETTINGS_PRIVACY_SESSION), modifier = Modifier.padding(top = 16.dp))
                NovaCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(17.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(t(StringKey.SETTINGS_BLUR_BALANCE), fontSize = 13.5.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground)
                                Text(
                                    t(if (blurBalance) StringKey.SETTINGS_BLUR_BALANCE_HELP_ON else StringKey.SETTINGS_BLUR_BALANCE_HELP_OFF),
                                    fontSize = 11.sp,
                                    lineHeight = 15.4.sp,
                                    color = colors.textDim,
                                    modifier = Modifier.padding(top = 3.dp),
                                )
                            }
                            NovaSwitch(checked = blurBalance, onCheckedChange = {
                                persist({ p -> p.copy(blurBalance = it) }, UpdatePreferencesRequest(blurBalance = it))
                            })
                        }
                        Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(MaterialTheme.colorScheme.outline))
                        Column {
                            Row(verticalAlignment = Alignment.Bottom) {
                                Text(t(StringKey.SETTINGS_AUTO_LOCK), fontSize = 13.5.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f).alignByBaseline())
                                Text(lockName(autoLockMinutes), fontSize = 11.5.sp, fontWeight = FontWeight.ExtraBold, color = colors.accentText, modifier = Modifier.padding(start = 12.dp).alignByBaseline())
                            }
                            FlowRow(
                                modifier = Modifier.padding(top = 11.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
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
                                fontSize = 11.sp,
                                lineHeight = 15.4.sp,
                                color = colors.textDim,
                                modifier = Modifier.padding(top = 10.dp),
                            )
                        }
                    }
                }

                NovaCard(modifier = Modifier.fillMaxWidth().padding(top = 8.dp), onClick = { tutorialStep = 0 }) {
                    Row(modifier = Modifier.padding(17.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(t(StringKey.SETTINGS_REPLAY_TUTORIAL), fontSize = 13.5.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground)
                            Text(t(StringKey.SETTINGS_TUTORIAL_HINT).format(TUTORIAL.size), fontSize = 11.sp, color = colors.textDim, modifier = Modifier.padding(top = 3.dp))
                        }
                        Text("→", fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                NovaCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth().padding(17.dp)) {
                        Text(t(StringKey.SETTINGS_ABOUT), fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
                        Text("S2 Nova · v${BuildConfig.VERSION_NAME}", fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }
        }
    }

    tutorialStep?.let { step -> TutorialSheet(step = step, onStep = { tutorialStep = it }, onClose = { tutorialStep = null }) }
}

@Composable
private fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(text, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground, modifier = modifier)
}

// The mockup's personal-info box: a muted caption over the value; the
// email (not editable here) sits on --bg-deep with dimmed text.
@Composable
private fun FieldBox(label: String, value: String, onValueChange: (String) -> Unit, enabled: Boolean = true) {
    val colors = NovaColors.current
    val shape = RoundedCornerShape(14.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(if (enabled) Color.Transparent else colors.bgDeep)
            .border(1.dp, if (enabled) MaterialTheme.colorScheme.outlineVariant else MaterialTheme.colorScheme.outline, shape)
            .padding(horizontal = 15.dp, vertical = 13.dp),
    ) {
        Text(label, fontSize = 10.5.sp, color = if (enabled) MaterialTheme.colorScheme.onSurfaceVariant else colors.textDim)
        Spacer(Modifier.height(3.dp))
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            enabled = enabled,
            singleLine = true,
            textStyle = TextStyle(
                fontFamily = NovaFontFamily,
                fontSize = 13.5.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (enabled) MaterialTheme.colorScheme.onBackground else colors.textDim,
            ),
            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
        )
    }
}

@Composable
private fun SwitchRow(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, fontSize = 13.5.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
        NovaSwitch(checked = checked, onCheckedChange = onChange)
    }
}

@Composable
private fun <T> SegmentedRow(label: String, options: List<Pair<T, String>>, selected: T, onSelect: (T) -> Unit) {
    val colors = NovaColors.current
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, fontSize = 13.5.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
        Row(modifier = Modifier.clip(RoundedCornerShape(50)).background(colors.bgDeep)) {
            options.forEach { (value, text) ->
                val active = value == selected
                Text(
                    text,
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (active) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(if (active) MaterialTheme.colorScheme.primary else Color.Transparent)
                        .clickable { onSelect(value) }
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                )
            }
        }
    }
}

// The mockup's shared `pill()`.
@Composable
private fun LockPill(label: String, selected: Boolean, onClick: () -> Unit) {
    val colors = NovaColors.current
    val shape = RoundedCornerShape(50)
    Text(
        label,
        fontSize = 12.sp,
        fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold,
        color = if (selected) Color.White else colors.pillText,
        modifier = Modifier
            .clip(shape)
            .background(if (selected) MaterialTheme.colorScheme.primary else colors.pillSurface)
            .border(1.dp, if (selected) Color.Transparent else colors.pillBorder, shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 15.dp, vertical = 10.dp),
    )
}

// "Repetir el tutorial": the mockup's four-step sheet over Ajustes.
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
private fun TutorialSheet(step: Int, onStep: (Int) -> Unit, onClose: () -> Unit) {
    val t = rememberStrings()
    val (title, body) = TUTORIAL[step]
    val last = step == TUTORIAL.lastIndex
    NovaDraftSheet(onDismiss = onClose, scrimAlpha = 0.72f) {
        Row(modifier = Modifier.fillMaxWidth().padding(start = 4.dp, end = 4.dp, bottom = 16.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            TUTORIAL.indices.forEach { i ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(3.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(if (i <= step) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant),
                )
            }
        }
        Column(modifier = Modifier.padding(horizontal = 4.dp)) {
            Text(t(StringKey.TUTORIAL_STEP_OF).format(step + 1, TUTORIAL.size), fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.2.sp, color = NovaColors.current.accentText)
            Text(t(title), fontSize = 19.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.38).sp, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(top = 10.dp))
            Text(t(body), fontSize = 13.sp, lineHeight = 19.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 9.dp))
        }
        Row(modifier = Modifier.fillMaxWidth().padding(top = 24.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                t(StringKey.TUTORIAL_SKIP),
                fontSize = 12.5.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.clickable(onClick = onClose).padding(horizontal = 4.dp, vertical = 14.dp),
            )
            Spacer(Modifier.weight(1f))
            if (step > 0) {
                Text(
                    t(StringKey.TUTORIAL_BACK),
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = NovaColors.current.accentText,
                    modifier = Modifier.clickable { onStep(step - 1) }.padding(horizontal = 10.dp, vertical = 14.dp),
                )
                Spacer(Modifier.width(12.dp))
            }
            Text(
                t(if (last) StringKey.TUTORIAL_DONE else StringKey.TUTORIAL_NEXT),
                fontSize = 13.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color.White,
                modifier = Modifier
                    .clip(RoundedCornerShape(14.dp))
                    .background(MaterialTheme.colorScheme.primary)
                    .clickable { if (last) onClose() else onStep(step + 1) }
                    .padding(horizontal = 26.dp, vertical = 13.dp),
            )
        }
    }
}
