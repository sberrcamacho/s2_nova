package com.s2nova.app.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.PaymentMethod

// Small hand-rolled dictionary, same scope/approach as web's
// src/lib/i18n/translations.ts. Covers every screen except auth (no user/
// language preference exists yet before login) and the barcode scanner
// (explicitly out of scope — see AGENTS.md).
enum class StringKey {
    NAV_HOME, NAV_REPORTS, NAV_BUDGETS, NAV_PROFILE, NAV_ADD,
    TITLE_TRANSACTIONS, TITLE_REPORTS, TITLE_BUDGETS, TITLE_SETTINGS,
    SETTINGS_PERSONAL_INFO, SETTINGS_FULL_NAME, SETTINGS_EMAIL, SETTINGS_PHONE, SETTINGS_CITY,
    SETTINGS_SAVE_CHANGES, SETTINGS_PREFERENCES, SETTINGS_DARK_MODE, SETTINGS_NOTIFICATIONS,
    SETTINGS_BIOMETRIC, SETTINGS_CURRENCY_FORMAT, SETTINGS_LANGUAGE, SETTINGS_ABOUT,
    SETTINGS_ABOUT_NOTE,

    ADD_TXN_TITLE_NEW, ADD_TXN_TITLE_EDIT, ADD_TXN_EXPENSE, ADD_TXN_INCOME,
    ADD_TXN_AMOUNT, ADD_TXN_DESCRIPTION, ADD_TXN_DESCRIPTION_PLACEHOLDER,
    ADD_TXN_CATEGORY, ADD_TXN_PAYMENT_METHOD, ADD_TXN_NOTE, ADD_TXN_NOTE_PLACEHOLDER,
    ADD_TXN_SAVE_NEW, ADD_TXN_SAVE_EDIT, ADD_TXN_ERROR_AMOUNT, ADD_TXN_ERROR_DESCRIPTION,

    ADD_ACTION_MANUAL_TITLE, ADD_ACTION_MANUAL_SUBTITLE,
    ADD_ACTION_SCAN_TITLE, ADD_ACTION_SCAN_SUBTITLE,

    PROFILE_DEMO_ACCOUNT, PROFILE_TRANSACTIONS, PROFILE_BUDGETS, PROFILE_AVAILABLE,
    PROFILE_ACCOUNT_SECURITY, PROFILE_EDIT_PROFILE, PROFILE_CHANGE_PASSWORD, PROFILE_TWO_FACTOR,
    PROFILE_PREFERENCES, PROFILE_PRIVACY, PROFILE_LOGOUT,

    CATEGORY_FOOD, CATEGORY_TRANSPORTATION, CATEGORY_SHOPPING, CATEGORY_HEALTH,
    CATEGORY_EDUCATION, CATEGORY_ENTERTAINMENT, CATEGORY_BILLS, CATEGORY_SUBSCRIPTIONS,
    CATEGORY_SALARY, CATEGORY_FREELANCE, CATEGORY_OTHER,

    PAYMENT_CASH, PAYMENT_DEBIT_CARD, PAYMENT_CREDIT_CARD, PAYMENT_BANK_TRANSFER,
    PAYMENT_NEQUI, PAYMENT_DAVIPLATA,

    COMMON_CANCEL, COMMON_SAVE,

    HOME_GREETING, HOME_BALANCE, HOME_INCOME, HOME_EXPENSES, HOME_SAVINGS,
    HOME_EXPENSE_SUMMARY, HOME_NO_EXPENSES, HOME_RECENT_TXNS, HOME_SEE_ALL,

    NOTIF_MARK_ALL_READ, NOTIF_EMPTY,

    REPORTS_RANGE_WEEK, REPORTS_RANGE_MONTH, REPORTS_RANGE_YEAR, REPORTS_TOTAL_SPENT,
    REPORTS_AVG_DAILY, REPORTS_HIGHEST_MONTH, REPORTS_SAVINGS_RATE, REPORTS_PERIOD,
    REPORTS_TOP_SPENDING,

    TXN_LIST_SEARCH_PLACEHOLDER, TXN_LIST_FILTER_ALL, TXN_LIST_EMPTY_TITLE, TXN_LIST_EMPTY_SUBTITLE,

    TXN_DETAIL_TITLE, TXN_DETAIL_EDIT_CD, TXN_DETAIL_NOT_FOUND, TXN_DETAIL_DATE,
    TXN_DETAIL_MERCHANT, TXN_DETAIL_NOTE, TXN_DETAIL_DELETE, TXN_DETAIL_DELETE_DIALOG_TITLE,
    TXN_DETAIL_DELETE_CONFIRM_PREFIX, TXN_DETAIL_DELETE_CONFIRM_SUFFIX, TXN_DETAIL_DELETE_CONFIRM,

    BUDGETS_MONTH_LABEL, BUDGETS_UTILIZED, BUDGETS_NEW, BUDGETS_MONTHLY_LIMIT,
    BUDGETS_EDIT_TITLE_PREFIX, BUDGETS_CREATE, BUDGETS_OF, BUDGETS_REMAINING, BUDGETS_OVER_LIMIT,
    BUDGET_STATUS_OVER, BUDGET_STATUS_NEAR, BUDGET_STATUS_ON_TRACK,
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
    StringKey.SETTINGS_ABOUT_NOTE to "Datos de demostración, sin conexión a un backend real.",

    StringKey.ADD_TXN_TITLE_NEW to "Agregar movimiento",
    StringKey.ADD_TXN_TITLE_EDIT to "Editar movimiento",
    StringKey.ADD_TXN_EXPENSE to "Gasto",
    StringKey.ADD_TXN_INCOME to "Ingreso",
    StringKey.ADD_TXN_AMOUNT to "Monto",
    StringKey.ADD_TXN_DESCRIPTION to "Descripción",
    StringKey.ADD_TXN_DESCRIPTION_PLACEHOLDER to "Ej. Mercado semanal",
    StringKey.ADD_TXN_CATEGORY to "Categoría",
    StringKey.ADD_TXN_PAYMENT_METHOD to "Método de pago",
    StringKey.ADD_TXN_NOTE to "Nota (opcional)",
    StringKey.ADD_TXN_NOTE_PLACEHOLDER to "Agrega una nota",
    StringKey.ADD_TXN_SAVE_NEW to "Guardar movimiento",
    StringKey.ADD_TXN_SAVE_EDIT to "Guardar cambios",
    StringKey.ADD_TXN_ERROR_AMOUNT to "Ingresa un monto válido.",
    StringKey.ADD_TXN_ERROR_DESCRIPTION to "Ingresa una descripción.",

    StringKey.ADD_ACTION_MANUAL_TITLE to "Agregar manualmente",
    StringKey.ADD_ACTION_MANUAL_SUBTITLE to "Registra un ingreso o gasto",
    StringKey.ADD_ACTION_SCAN_TITLE to "Escanear código de barras",
    StringKey.ADD_ACTION_SCAN_SUBTITLE to "Registra una compra al instante",

    StringKey.PROFILE_DEMO_ACCOUNT to "Cuenta demo",
    StringKey.PROFILE_TRANSACTIONS to "Transacciones",
    StringKey.PROFILE_BUDGETS to "Presupuestos",
    StringKey.PROFILE_AVAILABLE to "Disponible",
    StringKey.PROFILE_ACCOUNT_SECURITY to "CUENTA Y SEGURIDAD",
    StringKey.PROFILE_EDIT_PROFILE to "Editar perfil",
    StringKey.PROFILE_CHANGE_PASSWORD to "Cambiar contraseña",
    StringKey.PROFILE_TWO_FACTOR to "Autenticación de dos factores",
    StringKey.PROFILE_PREFERENCES to "PREFERENCIAS",
    StringKey.PROFILE_PRIVACY to "Privacidad y seguridad",
    StringKey.PROFILE_LOGOUT to "Cerrar sesión",

    StringKey.CATEGORY_FOOD to "Alimentación",
    StringKey.CATEGORY_TRANSPORTATION to "Transporte",
    StringKey.CATEGORY_SHOPPING to "Compras",
    StringKey.CATEGORY_HEALTH to "Salud",
    StringKey.CATEGORY_EDUCATION to "Educación",
    StringKey.CATEGORY_ENTERTAINMENT to "Entretenimiento",
    StringKey.CATEGORY_BILLS to "Servicios",
    StringKey.CATEGORY_SUBSCRIPTIONS to "Suscripciones",
    StringKey.CATEGORY_SALARY to "Salario",
    StringKey.CATEGORY_FREELANCE to "Freelance",
    StringKey.CATEGORY_OTHER to "Otros",

    StringKey.PAYMENT_CASH to "Efectivo",
    StringKey.PAYMENT_DEBIT_CARD to "Tarjeta débito",
    StringKey.PAYMENT_CREDIT_CARD to "Tarjeta crédito",
    StringKey.PAYMENT_BANK_TRANSFER to "Transferencia",
    StringKey.PAYMENT_NEQUI to "Nequi",
    StringKey.PAYMENT_DAVIPLATA to "Daviplata",

    StringKey.COMMON_CANCEL to "Cancelar",
    StringKey.COMMON_SAVE to "Guardar",

    StringKey.HOME_GREETING to "HOLA",
    StringKey.HOME_BALANCE to "SALDO ACTUAL",
    StringKey.HOME_INCOME to "Ingresos",
    StringKey.HOME_EXPENSES to "Gastos",
    StringKey.HOME_SAVINGS to "Ahorro",
    StringKey.HOME_EXPENSE_SUMMARY to "Resumen de gastos",
    StringKey.HOME_NO_EXPENSES to "Sin gastos este mes.",
    StringKey.HOME_RECENT_TXNS to "Movimientos recientes",
    StringKey.HOME_SEE_ALL to "Ver todos",

    StringKey.NOTIF_MARK_ALL_READ to "Marcar todo leído",
    StringKey.NOTIF_EMPTY to "No tienes notificaciones.",

    StringKey.REPORTS_RANGE_WEEK to "Semana",
    StringKey.REPORTS_RANGE_MONTH to "Mes",
    StringKey.REPORTS_RANGE_YEAR to "Año",
    StringKey.REPORTS_TOTAL_SPENT to "GASTO TOTAL",
    StringKey.REPORTS_AVG_DAILY to "Promedio diario",
    StringKey.REPORTS_HIGHEST_MONTH to "Mes más alto",
    StringKey.REPORTS_SAVINGS_RATE to "Tasa de ahorro",
    StringKey.REPORTS_PERIOD to "Periodo",
    StringKey.REPORTS_TOP_SPENDING to "Mayor gasto",

    StringKey.TXN_LIST_SEARCH_PLACEHOLDER to "Buscar por descripción o comercio",
    StringKey.TXN_LIST_FILTER_ALL to "Todos",
    StringKey.TXN_LIST_EMPTY_TITLE to "Sin resultados",
    StringKey.TXN_LIST_EMPTY_SUBTITLE to "Ajusta la búsqueda o los filtros.",

    StringKey.TXN_DETAIL_TITLE to "Detalle del movimiento",
    StringKey.TXN_DETAIL_EDIT_CD to "Editar",
    StringKey.TXN_DETAIL_NOT_FOUND to "Este movimiento ya no existe.",
    StringKey.TXN_DETAIL_DATE to "Fecha",
    StringKey.TXN_DETAIL_MERCHANT to "Comercio",
    StringKey.TXN_DETAIL_NOTE to "Nota",
    StringKey.TXN_DETAIL_DELETE to "Eliminar movimiento",
    StringKey.TXN_DETAIL_DELETE_DIALOG_TITLE to "Eliminar transacción",
    StringKey.TXN_DETAIL_DELETE_CONFIRM_PREFIX to "¿Seguro que deseas eliminar",
    StringKey.TXN_DETAIL_DELETE_CONFIRM_SUFFIX to "? Esta acción no se puede deshacer.",
    StringKey.TXN_DETAIL_DELETE_CONFIRM to "Eliminar",

    StringKey.BUDGETS_MONTH_LABEL to "PRESUPUESTO DEL MES",
    StringKey.BUDGETS_UTILIZED to "utilizado",
    StringKey.BUDGETS_NEW to "Nuevo presupuesto",
    StringKey.BUDGETS_MONTHLY_LIMIT to "Límite mensual",
    StringKey.BUDGETS_EDIT_TITLE_PREFIX to "Editar presupuesto de",
    StringKey.BUDGETS_CREATE to "Crear",
    StringKey.BUDGETS_OF to "de",
    StringKey.BUDGETS_REMAINING to "disponibles",
    StringKey.BUDGETS_OVER_LIMIT to "por encima del límite",
    StringKey.BUDGET_STATUS_OVER to "Excedido",
    StringKey.BUDGET_STATUS_NEAR to "Cerca del límite",
    StringKey.BUDGET_STATUS_ON_TRACK to "En curso",
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
    StringKey.SETTINGS_ABOUT_NOTE to "Demo data, not connected to a real backend.",

    StringKey.ADD_TXN_TITLE_NEW to "Add transaction",
    StringKey.ADD_TXN_TITLE_EDIT to "Edit transaction",
    StringKey.ADD_TXN_EXPENSE to "Expense",
    StringKey.ADD_TXN_INCOME to "Income",
    StringKey.ADD_TXN_AMOUNT to "Amount",
    StringKey.ADD_TXN_DESCRIPTION to "Description",
    StringKey.ADD_TXN_DESCRIPTION_PLACEHOLDER to "E.g. Weekly groceries",
    StringKey.ADD_TXN_CATEGORY to "Category",
    StringKey.ADD_TXN_PAYMENT_METHOD to "Payment method",
    StringKey.ADD_TXN_NOTE to "Note (optional)",
    StringKey.ADD_TXN_NOTE_PLACEHOLDER to "Add a note",
    StringKey.ADD_TXN_SAVE_NEW to "Save transaction",
    StringKey.ADD_TXN_SAVE_EDIT to "Save changes",
    StringKey.ADD_TXN_ERROR_AMOUNT to "Enter a valid amount.",
    StringKey.ADD_TXN_ERROR_DESCRIPTION to "Enter a description.",

    StringKey.ADD_ACTION_MANUAL_TITLE to "Add manually",
    StringKey.ADD_ACTION_MANUAL_SUBTITLE to "Record an expense or income",
    StringKey.ADD_ACTION_SCAN_TITLE to "Scan barcode",
    StringKey.ADD_ACTION_SCAN_SUBTITLE to "Record a purchase instantly",

    StringKey.PROFILE_DEMO_ACCOUNT to "Demo account",
    StringKey.PROFILE_TRANSACTIONS to "Transactions",
    StringKey.PROFILE_BUDGETS to "Budgets",
    StringKey.PROFILE_AVAILABLE to "Available",
    StringKey.PROFILE_ACCOUNT_SECURITY to "ACCOUNT & SECURITY",
    StringKey.PROFILE_EDIT_PROFILE to "Edit profile",
    StringKey.PROFILE_CHANGE_PASSWORD to "Change password",
    StringKey.PROFILE_TWO_FACTOR to "Two-factor authentication",
    StringKey.PROFILE_PREFERENCES to "PREFERENCES",
    StringKey.PROFILE_PRIVACY to "Privacy & security",
    StringKey.PROFILE_LOGOUT to "Log out",

    StringKey.CATEGORY_FOOD to "Food",
    StringKey.CATEGORY_TRANSPORTATION to "Transportation",
    StringKey.CATEGORY_SHOPPING to "Shopping",
    StringKey.CATEGORY_HEALTH to "Health",
    StringKey.CATEGORY_EDUCATION to "Education",
    StringKey.CATEGORY_ENTERTAINMENT to "Entertainment",
    StringKey.CATEGORY_BILLS to "Bills",
    StringKey.CATEGORY_SUBSCRIPTIONS to "Subscriptions",
    StringKey.CATEGORY_SALARY to "Salary",
    StringKey.CATEGORY_FREELANCE to "Freelance",
    StringKey.CATEGORY_OTHER to "Other",

    StringKey.PAYMENT_CASH to "Cash",
    StringKey.PAYMENT_DEBIT_CARD to "Debit card",
    StringKey.PAYMENT_CREDIT_CARD to "Credit card",
    StringKey.PAYMENT_BANK_TRANSFER to "Bank transfer",
    StringKey.PAYMENT_NEQUI to "Nequi",
    StringKey.PAYMENT_DAVIPLATA to "Daviplata",

    StringKey.COMMON_CANCEL to "Cancel",
    StringKey.COMMON_SAVE to "Save",

    StringKey.HOME_GREETING to "HELLO",
    StringKey.HOME_BALANCE to "CURRENT BALANCE",
    StringKey.HOME_INCOME to "Income",
    StringKey.HOME_EXPENSES to "Expenses",
    StringKey.HOME_SAVINGS to "Savings",
    StringKey.HOME_EXPENSE_SUMMARY to "Expense summary",
    StringKey.HOME_NO_EXPENSES to "No expenses this month.",
    StringKey.HOME_RECENT_TXNS to "Recent transactions",
    StringKey.HOME_SEE_ALL to "See all",

    StringKey.NOTIF_MARK_ALL_READ to "Mark all as read",
    StringKey.NOTIF_EMPTY to "You have no notifications.",

    StringKey.REPORTS_RANGE_WEEK to "Week",
    StringKey.REPORTS_RANGE_MONTH to "Month",
    StringKey.REPORTS_RANGE_YEAR to "Year",
    StringKey.REPORTS_TOTAL_SPENT to "TOTAL SPENT",
    StringKey.REPORTS_AVG_DAILY to "Daily average",
    StringKey.REPORTS_HIGHEST_MONTH to "Highest month",
    StringKey.REPORTS_SAVINGS_RATE to "Savings rate",
    StringKey.REPORTS_PERIOD to "Period",
    StringKey.REPORTS_TOP_SPENDING to "Top spending",

    StringKey.TXN_LIST_SEARCH_PLACEHOLDER to "Search by description or merchant",
    StringKey.TXN_LIST_FILTER_ALL to "All",
    StringKey.TXN_LIST_EMPTY_TITLE to "No results",
    StringKey.TXN_LIST_EMPTY_SUBTITLE to "Adjust your search or filters.",

    StringKey.TXN_DETAIL_TITLE to "Transaction detail",
    StringKey.TXN_DETAIL_EDIT_CD to "Edit",
    StringKey.TXN_DETAIL_NOT_FOUND to "This transaction no longer exists.",
    StringKey.TXN_DETAIL_DATE to "Date",
    StringKey.TXN_DETAIL_MERCHANT to "Merchant",
    StringKey.TXN_DETAIL_NOTE to "Note",
    StringKey.TXN_DETAIL_DELETE to "Delete transaction",
    StringKey.TXN_DETAIL_DELETE_DIALOG_TITLE to "Delete transaction",
    StringKey.TXN_DETAIL_DELETE_CONFIRM_PREFIX to "Are you sure you want to delete",
    StringKey.TXN_DETAIL_DELETE_CONFIRM_SUFFIX to "? This action cannot be undone.",
    StringKey.TXN_DETAIL_DELETE_CONFIRM to "Delete",

    StringKey.BUDGETS_MONTH_LABEL to "THIS MONTH'S BUDGET",
    StringKey.BUDGETS_UTILIZED to "used",
    StringKey.BUDGETS_NEW to "New budget",
    StringKey.BUDGETS_MONTHLY_LIMIT to "Monthly limit",
    StringKey.BUDGETS_EDIT_TITLE_PREFIX to "Edit budget for",
    StringKey.BUDGETS_CREATE to "Create",
    StringKey.BUDGETS_OF to "of",
    StringKey.BUDGETS_REMAINING to "remaining",
    StringKey.BUDGETS_OVER_LIMIT to "over the limit",
    StringKey.BUDGET_STATUS_OVER to "Over budget",
    StringKey.BUDGET_STATUS_NEAR to "Near limit",
    StringKey.BUDGET_STATUS_ON_TRACK to "On track",
)

fun stringFor(key: StringKey, language: AppLanguage): String =
    (if (language == AppLanguage.EN) EN else ES).getValue(key)

// Maps mock-data ids to their StringKey so every screen that shows a
// category/payment-method name goes through the same translated lookup
// instead of reading the (Spanish-only) `label` field on the mock data
// directly.
fun categoryStringKey(id: CategoryId): StringKey = when (id) {
    CategoryId.FOOD -> StringKey.CATEGORY_FOOD
    CategoryId.TRANSPORTATION -> StringKey.CATEGORY_TRANSPORTATION
    CategoryId.SHOPPING -> StringKey.CATEGORY_SHOPPING
    CategoryId.HEALTH -> StringKey.CATEGORY_HEALTH
    CategoryId.EDUCATION -> StringKey.CATEGORY_EDUCATION
    CategoryId.ENTERTAINMENT -> StringKey.CATEGORY_ENTERTAINMENT
    CategoryId.BILLS -> StringKey.CATEGORY_BILLS
    CategoryId.SUBSCRIPTIONS -> StringKey.CATEGORY_SUBSCRIPTIONS
    CategoryId.SALARY -> StringKey.CATEGORY_SALARY
    CategoryId.FREELANCE -> StringKey.CATEGORY_FREELANCE
    CategoryId.OTHER -> StringKey.CATEGORY_OTHER
}

fun paymentMethodStringKey(id: PaymentMethod): StringKey = when (id) {
    PaymentMethod.CASH -> StringKey.PAYMENT_CASH
    PaymentMethod.DEBIT_CARD -> StringKey.PAYMENT_DEBIT_CARD
    PaymentMethod.CREDIT_CARD -> StringKey.PAYMENT_CREDIT_CARD
    PaymentMethod.BANK_TRANSFER -> StringKey.PAYMENT_BANK_TRANSFER
    PaymentMethod.NEQUI -> StringKey.PAYMENT_NEQUI
    PaymentMethod.DAVIPLATA -> StringKey.PAYMENT_DAVIPLATA
}

fun budgetStatusStringKey(status: com.s2nova.app.data.model.BudgetStatus): StringKey = when (status) {
    com.s2nova.app.data.model.BudgetStatus.OVER_BUDGET -> StringKey.BUDGET_STATUS_OVER
    com.s2nova.app.data.model.BudgetStatus.NEAR_LIMIT -> StringKey.BUDGET_STATUS_NEAR
    com.s2nova.app.data.model.BudgetStatus.ON_TRACK -> StringKey.BUDGET_STATUS_ON_TRACK
}

@Composable
fun rememberStrings(): (StringKey) -> String {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val language = user?.preferences?.language ?: AppLanguage.ES
    return { key -> stringFor(key, language) }
}
