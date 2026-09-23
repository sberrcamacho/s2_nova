package com.s2nova.app.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.draw.clip
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.BuildConfig
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.ThemeController
import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.data.model.Currency
import com.s2nova.app.data.remote.UpdatePreferencesRequest
import com.s2nova.app.data.remote.toUserMessage
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaSwitch
import com.s2nova.app.ui.components.NovaTopBar
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaFontFamily
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(onBack: () -> Unit, onReplayTutorial: () -> Unit, onPasswordChanged: () -> Unit) {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val darkOverride by ThemeController.darkOverride.collectAsStateWithLifecycle()
    val isDark = darkOverride ?: androidx.compose.foundation.isSystemInDarkTheme()

    var name by remember { mutableStateOf(user?.name ?: "") }
    var phone by remember { mutableStateOf(user?.phone ?: "") }
    var city by remember { mutableStateOf(user?.city ?: "") }
    var notifications by remember { mutableStateOf(user?.preferences?.notifications ?: true) }
    var biometric by remember { mutableStateOf(user?.preferences?.biometricLogin ?: false) }
    var blurBalance by remember { mutableStateOf(user?.preferences?.blurBalance ?: false) }
    var autoLockMinutes by remember { mutableStateOf(user?.preferences?.autoLockMinutes ?: 5) }
    var showPasswordDialog by remember { mutableStateOf(false) }
    val currency = user?.preferences?.currency ?: Currency.COP
    val language = user?.preferences?.language ?: AppLanguage.ES
    val demoModeActive by AppContainer.demoModeActive.collectAsStateWithLifecycle(initialValue = false)
    val t = rememberStrings()
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = { NovaTopBar(title = t(StringKey.TITLE_SETTINGS), onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
        ) {
            Text(
                t(StringKey.SETTINGS_PERSONAL_INFO),
                fontSize = 14.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Spacer(Modifier.height(12.dp))
            SettingsFieldBox(label = t(StringKey.SETTINGS_FULL_NAME), value = name, onValueChange = { name = it })
            Spacer(Modifier.height(12.dp))
            SettingsFieldBox(label = t(StringKey.SETTINGS_EMAIL), value = user?.email ?: "", onValueChange = {}, enabled = false)
            Spacer(Modifier.height(12.dp))
            SettingsFieldBox(label = t(StringKey.SETTINGS_PHONE), value = phone, onValueChange = { phone = it })
            Spacer(Modifier.height(12.dp))
            SettingsFieldBox(label = t(StringKey.SETTINGS_CITY), value = city, onValueChange = { city = it })
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = { scope.launch { AppContainer.authRepository.updateProfile(name = name, phone = phone.trim().ifBlank { null }, city = city.trim().ifBlank { null }) } },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(14.dp),
            ) { Text(t(StringKey.SETTINGS_SAVE_CHANGES), modifier = Modifier.padding(vertical = 4.dp)) }

            NovaCard(modifier = Modifier.fillMaxWidth().padding(top = 20.dp).clickable { showPasswordDialog = true }) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                ) {
                    Text(
                        if (user?.hasPassword == true) t(StringKey.SETTINGS_CHANGE_PASSWORD) else t(StringKey.SETTINGS_CREATE_PASSWORD),
                        fontSize = 13.5.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                }
            }

            Text(
                t(StringKey.SETTINGS_PREFERENCES),
                fontSize = 14.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(top = 28.dp, bottom = 12.dp),
            )
            NovaCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    PreferenceRow(t(StringKey.SETTINGS_DARK_MODE), isDark) { ThemeController.setDark(it) }
                    Spacer(Modifier.height(14.dp))
                    PreferenceRow(t(StringKey.SETTINGS_NOTIFICATIONS), notifications) {
                        notifications = it
                        AppContainer.authRepository.updateUser { u -> u.copy(preferences = u.preferences.copy(notifications = it)) }
                        scope.launch { AppContainer.authRepository.persistPreferences(UpdatePreferencesRequest(notifications = it)) }
                    }
                    Spacer(Modifier.height(14.dp))
                    PreferenceRow(t(StringKey.SETTINGS_BIOMETRIC), biometric) {
                        biometric = it
                        AppContainer.authRepository.updateUser { u -> u.copy(preferences = u.preferences.copy(biometricLogin = it)) }
                        scope.launch { AppContainer.authRepository.persistPreferences(UpdatePreferencesRequest(biometricLogin = it)) }
                    }
                    Spacer(Modifier.height(14.dp))
                    PreferenceChoiceRow(
                        label = t(StringKey.SETTINGS_CURRENCY_FORMAT),
                        options = listOf(Currency.COP to "COP", Currency.USD to "USD"),
                        selected = currency,
                        onSelect = {
                            AppContainer.authRepository.updateUser { u -> u.copy(preferences = u.preferences.copy(currency = it)) }
                            scope.launch { AppContainer.authRepository.persistPreferences(UpdatePreferencesRequest(currency = it.name)) }
                        },
                    )
                    Spacer(Modifier.height(14.dp))
                    PreferenceChoiceRow(
                        label = t(StringKey.SETTINGS_LANGUAGE),
                        options = listOf(AppLanguage.ES to "Español", AppLanguage.EN to "English"),
                        selected = language,
                        onSelect = {
                            AppContainer.authRepository.updateUser { u -> u.copy(preferences = u.preferences.copy(language = it)) }
                            scope.launch { AppContainer.authRepository.persistPreferences(UpdatePreferencesRequest(language = it.name.lowercase())) }
                        },
                    )
                }
            }

            Text(
                t(StringKey.SETTINGS_PRIVACY_SESSION),
                fontSize = 14.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(top = 28.dp, bottom = 12.dp),
            )
            NovaCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    PreferenceRow(t(StringKey.SETTINGS_BLUR_BALANCE), blurBalance) {
                        blurBalance = it
                        AppContainer.authRepository.updateUser { u -> u.copy(preferences = u.preferences.copy(blurBalance = it)) }
                        scope.launch { AppContainer.authRepository.persistPreferences(UpdatePreferencesRequest(blurBalance = it)) }
                    }
                    Text(
                        t(if (blurBalance) StringKey.SETTINGS_BLUR_BALANCE_HELP_ON else StringKey.SETTINGS_BLUR_BALANCE_HELP_OFF),
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                    Spacer(Modifier.height(16.dp))
                    androidx.compose.material3.HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                    Spacer(Modifier.height(16.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                        Text(t(StringKey.SETTINGS_AUTO_LOCK), fontSize = 13.5.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground)
                        Text(
                            if (autoLockMinutes == 0) t(StringKey.SETTINGS_AUTO_LOCK_NEVER) else "$autoLockMinutes ${t(StringKey.SETTINGS_AUTO_LOCK_MINUTES_SUFFIX)}",
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.secondary,
                        )
                    }
                    androidx.compose.foundation.layout.FlowRow(
                        modifier = Modifier.padding(top = 11.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        listOf(1, 5, 15, 60, 0).forEach { minutes ->
                            val label = if (minutes == 0) t(StringKey.SETTINGS_AUTO_LOCK_NEVER) else "$minutes ${t(StringKey.SETTINGS_AUTO_LOCK_MINUTES_SUFFIX)}"
                            val active = autoLockMinutes == minutes
                            Text(
                                label,
                                fontSize = 12.sp,
                                fontWeight = if (active) FontWeight.Bold else FontWeight.SemiBold,
                                color = if (active) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onBackground,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(50))
                                    .background(if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                                    .clickable {
                                        autoLockMinutes = minutes
                                        AppContainer.authRepository.updateUser { u -> u.copy(preferences = u.preferences.copy(autoLockMinutes = minutes)) }
                                        scope.launch { AppContainer.authRepository.persistPreferences(UpdatePreferencesRequest(autoLockMinutes = minutes)) }
                                    }
                                    .padding(horizontal = 14.dp, vertical = 9.dp),
                            )
                        }
                    }
                    Text(
                        t(
                            if (autoLockMinutes == 0) StringKey.SETTINGS_AUTO_LOCK_HELP_NEVER
                            else if (biometric) StringKey.SETTINGS_AUTO_LOCK_HELP_BIOMETRIC
                            else StringKey.SETTINGS_AUTO_LOCK_HELP_PASSWORD,
                        ),
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 10.dp),
                    )
                }
            }

            NovaCard(modifier = Modifier.fillMaxWidth().padding(top = 20.dp).clickable(onClick = onReplayTutorial)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                ) {
                    Text(t(StringKey.SETTINGS_REPLAY_TUTORIAL), fontSize = 13.5.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground)
                }
            }

            NovaCard(modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(t(StringKey.SETTINGS_ABOUT), fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
                    Text(
                        "S2 Nova · v${BuildConfig.VERSION_NAME} · ${t(StringKey.SETTINGS_ABOUT_NOTE)}",
                        fontSize = 11.5.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }

            NovaCard(modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                    ) {
                        Text(t(StringKey.SETTINGS_DEMO_MODE), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onBackground)
                        NovaSwitch(
                            checked = demoModeActive,
                            onCheckedChange = { active ->
                                scope.launch {
                                    if (active) AppContainer.enterDemoMode() else AppContainer.exitDemoMode()
                                }
                            },
                        )
                    }
                    Text(
                        t(StringKey.SETTINGS_DEMO_MODE_NOTE),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
            }

            Spacer(Modifier.height(32.dp))
        }
    }

    if (showPasswordDialog) {
        ChangePasswordDialog(
            hasPassword = user?.hasPassword == true,
            onDismiss = { showPasswordDialog = false },
            onChanged = {
                showPasswordDialog = false
                onPasswordChanged()
            },
        )
    }
}

@Composable
private fun ChangePasswordDialog(hasPassword: Boolean, onDismiss: () -> Unit, onChanged: () -> Unit) {
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val t = rememberStrings()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (hasPassword) t(StringKey.SETTINGS_CHANGE_PASSWORD) else t(StringKey.SETTINGS_CREATE_PASSWORD)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (hasPassword) {
                    OutlinedTextField(
                        value = currentPassword,
                        onValueChange = { currentPassword = it; error = null },
                        label = { Text(t(StringKey.SETTINGS_CURRENT_PASSWORD)) },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                OutlinedTextField(
                    value = newPassword,
                    onValueChange = { newPassword = it; error = null },
                    label = { Text(t(StringKey.SETTINGS_NEW_PASSWORD)) },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = confirmPassword,
                    onValueChange = { confirmPassword = it; error = null },
                    label = { Text(t(StringKey.SETTINGS_CONFIRM_NEW_PASSWORD)) },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth(),
                )
                if (error != null) {
                    Text(error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(
                enabled = !loading,
                onClick = {
                    if (newPassword != confirmPassword) {
                        error = t(StringKey.SETTINGS_PASSWORD_MISMATCH)
                        return@Button
                    }
                    loading = true
                    scope.launch {
                        AppContainer.authRepository
                            .changePassword(if (hasPassword) currentPassword else null, newPassword)
                            .onSuccess {
                                AppContainer.authRepository.logout()
                                loading = false
                                onChanged()
                            }
                            .onFailure {
                                loading = false
                                error = it.toUserMessage(t(StringKey.SETTINGS_PASSWORD_MISMATCH))
                            }
                    }
                },
            ) {
                if (loading) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp))
                } else {
                    Text(t(StringKey.SETTINGS_CHANGE))
                }
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(t(StringKey.COMMON_CANCEL)) } },
    )
}

// Mirrors the mockup's personal-info fields: a bordered box with a static
// muted caption above an editable value, not Material's floating-label
// OutlinedTextField.
@Composable
private fun SettingsFieldBox(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(if (enabled) androidx.compose.ui.graphics.Color.Transparent else MaterialTheme.colorScheme.surfaceVariant)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(14.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Text(label, fontSize = 10.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                color = if (enabled) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurfaceVariant,
            ),
            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
        )
    }
}

@Composable
private fun PreferenceRow(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
    ) {
        Text(label, fontSize = 13.5.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground)
        NovaSwitch(checked = checked, onCheckedChange = onChange)
    }
}

@Composable
private fun <T> PreferenceChoiceRow(label: String, options: List<Pair<T, String>>, selected: T, onSelect: (T) -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
        Text(label, fontSize = 13.5.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground)
        Row(
            modifier = Modifier
                .clip(RoundedCornerShape(50))
                .background(MaterialTheme.colorScheme.surfaceVariant),
        ) {
            options.forEach { (value, optLabel) ->
                val active = value == selected
                Text(
                    optLabel,
                    style = MaterialTheme.typography.labelMedium,
                    color = if (active) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(if (active) MaterialTheme.colorScheme.primary else androidx.compose.ui.graphics.Color.Transparent)
                        .clickable { onSelect(value) }
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                )
            }
        }
    }
}
