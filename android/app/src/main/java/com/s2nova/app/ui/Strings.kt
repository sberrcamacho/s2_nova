package com.s2nova.app.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.AppLanguage

// Small hand-rolled dictionary, same scope/approach as web's
// src/lib/i18n/translations.ts: bottom nav, top bar titles, and the
// Settings screen (where the language switch itself lives) — not a full
// screen-by-screen translation of the app yet.
enum class StringKey {
    NAV_HOME, NAV_REPORTS, NAV_BUDGETS, NAV_PROFILE, NAV_ADD,
    TITLE_TRANSACTIONS, TITLE_REPORTS, TITLE_BUDGETS, TITLE_SETTINGS,
    SETTINGS_PERSONAL_INFO, SETTINGS_FULL_NAME, SETTINGS_EMAIL, SETTINGS_PHONE, SETTINGS_CITY,
    SETTINGS_SAVE_CHANGES, SETTINGS_PREFERENCES, SETTINGS_DARK_MODE, SETTINGS_NOTIFICATIONS,
    SETTINGS_BIOMETRIC, SETTINGS_CURRENCY_FORMAT, SETTINGS_LANGUAGE, SETTINGS_ABOUT,
}

private val ES: Map<StringKey, String> = mapOf(
    StringKey.NAV_HOME to "Inicio",
    StringKey.NAV_REPORTS to "Reportes",
    StringKey.NAV_BUDGETS to "Presupuesto",
    StringKey.NAV_PROFILE to "Perfil",
    StringKey.NAV_ADD to "Agregar",
    StringKey.TITLE_TRANSACTIONS to "Movimientos",
    StringKey.TITLE_REPORTS to "Reportes",
    StringKey.TITLE_BUDGETS to "Presupuestos",
    StringKey.TITLE_SETTINGS to "Configuración",
    StringKey.SETTINGS_PERSONAL_INFO to "Información personal",
    StringKey.SETTINGS_FULL_NAME to "Nombre completo",
    StringKey.SETTINGS_EMAIL to "Correo electrónico",
    StringKey.SETTINGS_PHONE to "Teléfono",
    StringKey.SETTINGS_CITY to "Ciudad",
    StringKey.SETTINGS_SAVE_CHANGES to "Guardar cambios",
    StringKey.SETTINGS_PREFERENCES to "Preferencias",
    StringKey.SETTINGS_DARK_MODE to "Modo oscuro",
    StringKey.SETTINGS_NOTIFICATIONS to "Notificaciones",
    StringKey.SETTINGS_BIOMETRIC to "Inicio biométrico",
    StringKey.SETTINGS_CURRENCY_FORMAT to "Formato de moneda",
    StringKey.SETTINGS_LANGUAGE to "Idioma",
    StringKey.SETTINGS_ABOUT to "Acerca de",
)

private val EN: Map<StringKey, String> = mapOf(
    StringKey.NAV_HOME to "Home",
    StringKey.NAV_REPORTS to "Reports",
    StringKey.NAV_BUDGETS to "Budget",
    StringKey.NAV_PROFILE to "Profile",
    StringKey.NAV_ADD to "Add",
    StringKey.TITLE_TRANSACTIONS to "Transactions",
    StringKey.TITLE_REPORTS to "Reports",
    StringKey.TITLE_BUDGETS to "Budgets",
    StringKey.TITLE_SETTINGS to "Settings",
    StringKey.SETTINGS_PERSONAL_INFO to "Personal information",
    StringKey.SETTINGS_FULL_NAME to "Full name",
    StringKey.SETTINGS_EMAIL to "Email address",
    StringKey.SETTINGS_PHONE to "Phone",
    StringKey.SETTINGS_CITY to "City",
    StringKey.SETTINGS_SAVE_CHANGES to "Save changes",
    StringKey.SETTINGS_PREFERENCES to "Preferences",
    StringKey.SETTINGS_DARK_MODE to "Dark mode",
    StringKey.SETTINGS_NOTIFICATIONS to "Notifications",
    StringKey.SETTINGS_BIOMETRIC to "Biometric login",
    StringKey.SETTINGS_CURRENCY_FORMAT to "Currency format",
    StringKey.SETTINGS_LANGUAGE to "Language",
    StringKey.SETTINGS_ABOUT to "About",
)

fun stringFor(key: StringKey, language: AppLanguage): String =
    (if (language == AppLanguage.EN) EN else ES).getValue(key)

@Composable
fun rememberStrings(): (StringKey) -> String {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val language = user?.preferences?.language ?: AppLanguage.ES
    return { key -> stringFor(key, language) }
}
