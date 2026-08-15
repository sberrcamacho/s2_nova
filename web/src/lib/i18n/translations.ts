import type { LanguageCode } from '@/types'

// Small hand-rolled dictionary — no i18n library dependency for a
// mock-data demo app. Covers the app chrome (sidebar, header, page
// titles) and the Settings screen in full, since that's where the
// language switch itself lives and should be visibly proven to work.
const dictionary = {
  'nav.overview': { es: 'Resumen', en: 'Overview' },
  'nav.transactions': { es: 'Movimientos', en: 'Transactions' },
  'nav.expenses': { es: 'Gastos', en: 'Expenses' },
  'nav.income': { es: 'Ingresos', en: 'Income' },
  'nav.budgets': { es: 'Presupuestos', en: 'Budgets' },
  'nav.categories': { es: 'Categorías', en: 'Categories' },
  'nav.analytics': { es: 'Analítica', en: 'Analytics' },
  'nav.reports': { es: 'Reportes', en: 'Reports' },
  'nav.settings': { es: 'Configuración', en: 'Settings' },
  'nav.group.transactions': { es: 'Transacciones', en: 'Transactions' },
  'nav.group.planning': { es: 'Planificación', en: 'Planning' },
  'nav.group.analysis': { es: 'Análisis', en: 'Analysis' },
  'sidebar.demoAccount': { es: 'Cuenta demo', en: 'Demo account' },
  'sidebar.closeMenu': { es: 'Cerrar menú', en: 'Close menu' },

  'header.search': { es: 'Buscar movimientos, categorías...', en: 'Search transactions, categories...' },
  'header.openMenu': { es: 'Abrir menú', en: 'Open menu' },
  'header.changeTheme': { es: 'Cambiar tema', en: 'Change theme' },
  'header.notifications': { es: 'Notificaciones', en: 'Notifications' },
  'header.myProfile': { es: 'Mi perfil', en: 'My profile' },
  'header.logout': { es: 'Cerrar sesión', en: 'Log out' },
  'header.sessionClosed': { es: 'Sesión cerrada', en: 'Session closed' },

  'page.overview.title': { es: 'Resumen', en: 'Overview' },
  'page.overview.subtitle': { es: 'Tu panorama financiero completo', en: 'Your complete financial picture' },
  'page.transactions.title': { es: 'Transacciones', en: 'Transactions' },
  'page.transactions.subtitle': { es: 'Historial completo de movimientos', en: 'Full transaction history' },
  'page.expenses.title': { es: 'Gastos', en: 'Expenses' },
  'page.expenses.subtitle': { es: 'Análisis detallado de tus gastos', en: 'Detailed breakdown of your spending' },
  'page.income.title': { es: 'Ingresos', en: 'Income' },
  'page.income.subtitle': { es: 'Fuentes y evolución de tus ingresos', en: 'Sources and trends in your income' },
  'page.budgets.title': { es: 'Presupuestos', en: 'Budgets' },
  'page.budgets.subtitle': { es: 'Control de límites por categoría', en: 'Track limits by category' },
  'page.categories.title': { es: 'Categorías', en: 'Categories' },
  'page.categories.subtitle': { es: 'Distribución de tu gasto por categoría', en: 'Your spending split by category' },
  'page.analytics.title': { es: 'Analítica', en: 'Analytics' },
  'page.analytics.subtitle': { es: 'Tendencias y comparativas', en: 'Trends and comparisons' },
  'page.reports.title': { es: 'Reportes', en: 'Reports' },
  'page.reports.subtitle': { es: 'Tendencias históricas y exportación', en: 'Historical trends and export' },
  'page.settings.title': { es: 'Configuración', en: 'Settings' },
  'page.settings.subtitle': { es: 'Cuenta, preferencias y seguridad', en: 'Account, preferences and security' },

  'settings.personalInfo': { es: 'Información personal', en: 'Personal information' },
  'settings.fullName': { es: 'Nombre completo', en: 'Full name' },
  'settings.email': { es: 'Correo electrónico', en: 'Email address' },
  'settings.phone': { es: 'Teléfono', en: 'Phone' },
  'settings.city': { es: 'Ciudad', en: 'City' },
  'settings.saveChanges': { es: 'Guardar cambios', en: 'Save changes' },
  'settings.accountSummary': { es: 'Resumen de cuenta', en: 'Account summary' },
  'settings.memberSince': { es: 'Miembro desde', en: 'Member since' },
  'settings.transactions': { es: 'Transacciones', en: 'Transactions' },
  'settings.activeBudgets': { es: 'Presupuestos activos', en: 'Active budgets' },
  'settings.availableInBudgets': { es: 'Disponible en presupuestos', en: 'Available in budgets' },
  'settings.preferences': { es: 'Preferencias', en: 'Preferences' },
  'settings.theme': { es: 'Tema', en: 'Theme' },
  'settings.light': { es: 'Claro', en: 'Light' },
  'settings.dark': { es: 'Oscuro', en: 'Dark' },
  'settings.notifications': { es: 'Notificaciones', en: 'Notifications' },
  'settings.biometricLogin': { es: 'Inicio biométrico', en: 'Biometric login' },
  'settings.currencyFormat': { es: 'Formato de moneda', en: 'Currency format' },
  'settings.language': { es: 'Idioma', en: 'Language' },
  'settings.spanish': { es: 'Español', en: 'Spanish' },
  'settings.english': { es: 'Inglés', en: 'English' },
  'settings.dataPrivacy': { es: 'Datos y privacidad', en: 'Data & privacy' },
  'settings.exportData': { es: 'Exportar mis datos', en: 'Export my data' },
  'settings.privacySecurity': { es: 'Privacidad y seguridad', en: 'Privacy & security' },
  'settings.demoDataNote': {
    es: 'S2 Nova · Datos de demostración, sin conexión a un backend real.',
    en: 'S2 Nova · Demo data, not connected to a real backend.',
  },
} as const satisfies Record<string, Record<LanguageCode, string>>

export type TranslationKey = keyof typeof dictionary

export function translate(key: TranslationKey, language: LanguageCode): string {
  return dictionary[key][language]
}
