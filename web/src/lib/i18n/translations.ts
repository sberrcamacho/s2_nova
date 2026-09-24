import type {
  CategoryId,
  LanguageCode,
  PaymentMethod,
  WalletType,
} from "@/types";

// Small hand-rolled dictionary — no i18n library dependency for a
// mock-data demo app. Covers the app chrome (sidebar, header, page
// titles) and the Settings screen in full, since that's where the
// language switch itself lives and should be visibly proven to work.
const dictionary = {
  "nav.overview": { es: "Resumen", en: "Overview" },
  "nav.transactions": { es: "Movimientos", en: "Transactions" },
  "nav.expenses": { es: "Gastos", en: "Expenses" },
  "nav.income": { es: "Ingresos", en: "Income" },
  "nav.budgets": { es: "Presupuestos", en: "Budgets" },
  "nav.goals": { es: "Objetivos", en: "Goals" },
  "nav.insights": { es: "Sugerencias", en: "Insights" },
  "nav.analytics": { es: "Analítica", en: "Analytics" },
  "nav.reports": { es: "Reportes", en: "Reports" },
  "nav.settings": { es: "Configuración", en: "Settings" },
  "sidebar.fallbackUserName": { es: "Usuario S2 Nova", en: "S2 Nova user" },
  "sidebar.closeMenu": { es: "Cerrar menú", en: "Close menu" },
  "sidebar.mainNavigation": {
    es: "Navegación principal",
    en: "Main navigation",
  },

  "header.search": {
    es: "Buscar movimientos, categorías...",
    en: "Search transactions, categories...",
  },
  "header.openMenu": { es: "Abrir menú", en: "Open menu" },
  "header.notifications": { es: "Notificaciones", en: "Notifications" },
  "header.myProfile": { es: "Mi perfil", en: "My profile" },
  "header.logout": { es: "Cerrar sesión", en: "Log out" },
  "header.sessionClosed": { es: "Sesión cerrada", en: "Session closed" },

  "page.overview.title": { es: "Resumen", en: "Overview" },
  "page.overview.subtitle": {
    es: "Tu panorama financiero completo",
    en: "Your complete financial picture",
  },
  "page.transactions.title": { es: "Transacciones", en: "Transactions" },
  "page.transactions.subtitle": {
    es: "Historial completo de movimientos",
    en: "Full transaction history",
  },
  "page.budgets.title": { es: "Presupuestos", en: "Budgets" },
  "page.budgets.subtitle": {
    es: "Control de límites por categoría",
    en: "Track limits by category",
  },
  "page.goals.title": { es: "Objetivos", en: "Goals" },
  "page.goals.subtitle": {
    es: "Metas de ahorro y pago",
    en: "Savings and payoff targets",
  },
  "page.insights.title": { es: "Sugerencias", en: "Insights" },
  "page.insights.subtitle": {
    es: "Calculado con tus últimos 30 días. Nada aquí es una proyección.",
    en: "Computed from your last 30 days. Nothing here is a projection.",
  },
  "page.analytics.title": { es: "Analítica", en: "Analytics" },
  "page.analytics.subtitle": {
    es: "Gastos, ingresos, flujo de caja y patrimonio",
    en: "Spending, income, cash flow and net worth",
  },
  "page.reports.title": { es: "Reportes", en: "Reports" },
  "page.reports.subtitle": {
    es: "Tendencias históricas y exportación",
    en: "Historical trends and export",
  },
  "page.settings.title": { es: "Configuración", en: "Settings" },
  "page.settings.subtitle": {
    es: "Cuenta, preferencias y seguridad",
    en: "Account, preferences and security",
  },

  "settings.personalInfo": {
    es: "Información personal",
    en: "Personal information",
  },
  "settings.fullName": { es: "Nombre completo", en: "Full name" },
  "settings.email": { es: "Correo electrónico", en: "Email address" },
  "settings.saveChanges": { es: "Guardar cambios", en: "Save changes" },
  "settings.accountSummary": { es: "Resumen de cuenta", en: "Account summary" },
  "settings.memberSince": { es: "Miembro desde", en: "Member since" },
  "settings.transactions": { es: "Transacciones", en: "Transactions" },
  "settings.activeBudgets": {
    es: "Presupuestos activos",
    en: "Active budgets",
  },
  "settings.availableInBudgets": {
    es: "Disponible en presupuestos",
    en: "Available in budgets",
  },
  "settings.preferences": { es: "Preferencias", en: "Preferences" },
  "settings.notifications": { es: "Notificaciones", en: "Notifications" },
  "settings.biometricLogin": { es: "Inicio biométrico", en: "Biometric login" },
  "settings.currencyFormat": { es: "Formato de moneda", en: "Currency format" },
  "settings.language": { es: "Idioma", en: "Language" },
  "settings.spanish": { es: "Español", en: "Spanish" },
  "settings.english": { es: "Inglés", en: "English" },
  "settings.theme": { es: "Tema", en: "Theme" },
  "settings.themeLight": { es: "Claro", en: "Light" },
  "settings.themeDark": { es: "Oscuro", en: "Dark" },
  "settings.themeSystem": { es: "Sistema", en: "System" },
  "settings.dataPrivacy": { es: "Datos y privacidad", en: "Data & privacy" },
  "settings.exportData": { es: "Exportar mis datos", en: "Export my data" },
  "settings.privacySecurity": {
    es: "Privacidad y seguridad",
    en: "Privacy & security",
  },
  "settings.profileUpdatedToast": {
    es: "Perfil actualizado",
    en: "Profile updated",
  },
  "settings.demoDataNote": {
    es: "S2 Nova · Datos de demostración, sin conexión a un backend real.",
    en: "S2 Nova · Demo data, not connected to a real backend.",
  },

  "category.food": { es: "Alimentación", en: "Food" },
  "category.transportation": { es: "Transporte", en: "Transportation" },
  "category.shopping": { es: "Compras", en: "Shopping" },
  "category.health": { es: "Salud", en: "Health" },
  "category.education": { es: "Educación", en: "Education" },
  "category.entertainment": { es: "Entretenimiento", en: "Entertainment" },
  "category.bills": { es: "Servicios", en: "Bills" },
  "category.subscriptions": { es: "Suscripciones", en: "Subscriptions" },
  "category.salary": { es: "Salario", en: "Salary" },
  "category.freelance": { es: "Freelance", en: "Freelance" },
  "category.gift": { es: "Obsequio", en: "Gift" },
  "category.other": { es: "Otros", en: "Other" },

  "paymentMethod.cash": { es: "Efectivo", en: "Cash" },
  "paymentMethod.debit_card": { es: "Tarjeta débito", en: "Debit card" },
  "paymentMethod.credit_card": { es: "Tarjeta crédito", en: "Credit card" },
  "paymentMethod.bank_transfer": { es: "Transferencia", en: "Bank transfer" },
  "paymentMethod.nequi": { es: "Nequi", en: "Nequi" },
  "paymentMethod.daviplata": { es: "Daviplata", en: "Daviplata" },

  "budgetStatus.on_track": { es: "En curso", en: "On track" },
  "budgetStatus.near_limit": { es: "Cerca del límite", en: "Near limit" },
  "budgetStatus.over_budget": { es: "Excedido", en: "Over budget" },

  "common.dismissNotification": {
    es: "Descartar notificación",
    en: "Dismiss notification",
  },
  "common.comingSoon": { es: "Próximamente", en: "Coming soon" },
  "common.exportSimulated": {
    es: "Exportación simulada — no hay archivo real en este entorno de demostración.",
    en: "Simulated export — there's no real file in this demo environment.",
  },
  "common.periodSelected": {
    es: "Periodo seleccionado",
    en: "Selected period",
  },
  "common.last": { es: "Últimos", en: "Last" },
  "common.months": { es: "meses", en: "months" },
  "common.last6Months": { es: "Últimos 6 meses", en: "Last 6 months" },
  "common.cumulativeSavings": {
    es: "Ahorro acumulado",
    en: "Cumulative savings",
  },
  "common.previous": { es: "Anterior", en: "Previous" },
  "common.next": { es: "Siguiente", en: "Next" },
  "common.showing": { es: "Mostrando", en: "Showing" },
  "common.of": { es: "de", en: "of" },
  "common.noExpensesTitle": { es: "Sin gastos", en: "No expenses" },
  "common.noExpensesDescription": {
    es: "No hay gastos en este periodo.",
    en: "No expenses in this period.",
  },
  "common.noDataTitle": { es: "Sin datos", en: "No data" },
  "common.weekShort": { es: "Sem", en: "Wk" },
  "common.today": { es: "Hoy", en: "Today" },
  "common.yesterday": { es: "Ayer", en: "Yesterday" },

  "overview.balance": { es: "Saldo actual", en: "Current balance" },
  "overview.totalIncome": { es: "Ingresos totales", en: "Total income" },
  "overview.totalExpenses": { es: "Gastos totales", en: "Total expenses" },
  "overview.savings": { es: "Ahorro", en: "Savings" },
  "overview.incomeVsExpenses": {
    es: "Ingresos vs. gastos",
    en: "Income vs. expenses",
  },
  "overview.monthlyComparison": {
    es: "Comparativo mensual",
    en: "Monthly comparison",
  },
  "overview.viewAllTransactions": { es: "Ver todas", en: "View all" },
  "overview.recentTransactions": {
    es: "Transacciones recientes",
    en: "Recent transactions",
  },
  "overview.emptyTransactionsTitle": {
    es: "Aún no hay transacciones",
    en: "No transactions yet",
  },
  "overview.emptyTransactionsDescription": {
    es: "Agrega movimientos desde la app móvil para verlos aquí.",
    en: "Add transactions from the mobile app to see them here.",
  },

  "expenses.totalSpent": { es: "Total gastado", en: "Total spent" },
  "expenses.avgPerTransaction": {
    es: "Promedio por transacción",
    en: "Average per transaction",
  },
  "expenses.topCategory": { es: "Categoría principal", en: "Top category" },
  "expenses.monthlyExpenses": {
    es: "Gastos mensuales",
    en: "Monthly expenses",
  },
  "expenses.distributionByCategory": {
    es: "Distribución por categoría",
    en: "Spending by category",
  },
  "expenses.noDataDescription": {
    es: "No hay gastos en el periodo seleccionado.",
    en: "No expenses in the selected period.",
  },
  "expenses.periodExpenses": {
    es: "Gastos del periodo",
    en: "Period expenses",
  },
  "expenses.emptyRegisteredTitle": {
    es: "Sin gastos registrados",
    en: "No expenses recorded",
  },

  "income.totalIncome": { es: "Total de ingresos", en: "Total income" },
  "income.avgPerIncome": {
    es: "Promedio por ingreso",
    en: "Average per income",
  },
  "income.topSource": { es: "Fuente principal", en: "Top source" },
  "income.monthlyIncome": { es: "Ingresos mensuales", en: "Monthly income" },
  "income.growing": { es: "Creciendo", en: "Growing" },
  "income.declining": { es: "Bajando", en: "Declining" },
  "income.incomeSources": { es: "Fuentes de ingreso", en: "Income sources" },
  "income.noIncomeTitle": { es: "Sin ingresos", en: "No income" },
  "income.noIncomeDescription": {
    es: "No hay ingresos en este periodo.",
    en: "No income in this period.",
  },
  "income.incomeVsSavings": {
    es: "Ingresos vs. ahorro",
    en: "Income vs. savings",
  },
  "income.noDataDescription": {
    es: "No hay ingresos en el periodo seleccionado.",
    en: "No income in the selected period.",
  },
  "income.periodIncome": { es: "Ingresos del periodo", en: "Period income" },
  "income.emptyRegisteredTitle": {
    es: "Sin ingresos registrados",
    en: "No income recorded",
  },

  "budgets.totalBudget": { es: "Presupuesto total", en: "Total budget" },
  "budgets.spentThisMonth": { es: "Gastado este mes", en: "Spent this month" },
  "budgets.ofBudget": { es: "del presupuesto", en: "of budget" },
  "budgets.overCategories": {
    es: "Categorías excedidas",
    en: "Categories over budget",
  },
  "budgets.monthlyLimit": { es: "Límite mensual", en: "Monthly limit" },
  "budgets.utilization": {
    es: "Utilización de presupuesto",
    en: "Budget utilization",
  },
  "budgets.remaining": { es: "disponibles", en: "remaining" },
  "budgets.overLimit": { es: "por encima del límite", en: "over the limit" },
  "budgets.historicalPerformance": {
    es: "Desempeño histórico",
    en: "Historical performance",
  },
  "budgets.historicalNote": {
    es: "El límite histórico usa el límite actual como referencia — los límites de meses anteriores no se guardan.",
    en: "The historical limit uses today's limit as a reference — past months' limits aren't stored.",
  },
  "budgets.spent": { es: "Gastado", en: "Spent" },
  "budgets.limitProxy": { es: "Límite (actual)", en: "Limit (current)" },
  "wallets.emptyTitle": { es: "Sin wallets todavía", en: "No wallets yet" },
  "wallets.type.cash": { es: "Efectivo", en: "Cash" },
  "wallets.type.bank": { es: "Banco", en: "Banking" },
  "wallets.type.savings": { es: "Ahorros", en: "Savings" },
  "wallets.type.crypto": { es: "Bitcoin/Cripto", en: "Bitcoin/Crypto" },
  "wallets.type.other": { es: "Otro", en: "Other" },

  "goals.emptyReadOnly": {
    es: "Aún no tienes objetivos. Crea uno desde la app de Android.",
    en: "No goals yet. Create one from the Android app.",
  },
  "goals.contributionsOverTime": {
    es: "Contribuciones en el tiempo",
    en: "Contributions over time",
  },
  "goals.insufficientData": {
    es: "Datos insuficientes para mostrar una tendencia de contribuciones.",
    en: "Not enough data to show a contribution trend.",
  },

  "recurring.monthlyExpenses": {
    es: "Gastos recurrentes/mes",
    en: "Recurring expenses/mo",
  },
  "recurring.monthlyIncome": {
    es: "Ingresos recurrentes/mes",
    en: "Recurring income/mo",
  },
  "recurring.subscriptions": {
    es: "Suscripciones/mes",
    en: "Subscriptions/mo",
  },
  "recurring.empty": {
    es: "Sin movimientos recurrentes.",
    en: "No recurring items.",
  },
  "recurring.dueToday": { es: "Vence hoy", en: "Due today" },
  "recurring.interval.weekly": { es: "Semanal", en: "Weekly" },
  "recurring.interval.monthly": { es: "Mensual", en: "Monthly" },
  "recurring.interval.yearly": { es: "Anual", en: "Yearly" },

  "netWorth.total": { es: "Patrimonio neto", en: "Net worth" },
  "netWorth.lent": { es: "Prestado (pendiente)", en: "Lent (outstanding)" },
  "netWorth.borrowed": {
    es: "Recibido en préstamo (pendiente)",
    en: "Borrowed (outstanding)",
  },
  "netWorth.wallets": { es: "Wallets", en: "Wallets" },

  "insights.empty": {
    es: "No hay sugerencias por ahora — todo se ve en buen camino.",
    en: "No suggestions right now — everything looks on track.",
  },
  "insights.tone.positive": { es: "Positivo", en: "Positive" },
  "insights.tone.warning": { es: "Atención", en: "Warning" },
  "insights.tone.negative": { es: "Alerta", en: "Alert" },
  "insights.tone.neutral": { es: "Info", en: "Info" },
  "insights.vs": { es: "vs", en: "vs" },
  "insights.avg": { es: "prom.", en: "avg." },
  "insights.viewAll": {
    es: "Ver todas las sugerencias",
    en: "View all insights",
  },
  "insights.showMore": { es: "Ver más sugerencias", en: "Show more insights" },
  "insights.showLess": { es: "Ver menos", en: "Show less" },
  "overview.insightsTitle": {
    es: "Sugerencias para ti",
    en: "Suggestions for you",
  },
  "overview.financialHealth": {
    es: "Salud financiera",
    en: "Financial health",
  },
  "overview.whatChanged": { es: "¿Qué cambió?", en: "What changed?" },
  "overview.vsLastMonth": { es: "vs. mes anterior", en: "vs. last month" },
  "overview.noPreviousData": {
    es: "Sin datos del mes anterior",
    en: "No prior-month data",
  },
  "overview.upcomingEvents": { es: "Próximos eventos", en: "Upcoming events" },
  "overview.noUpcoming": {
    es: "Sin movimientos próximos",
    en: "No upcoming events",
  },
  "overview.goalsProgress": {
    es: "Progreso de objetivos",
    en: "Goals progress",
  },
  "overview.noGoals": { es: "Aún no tienes objetivos", en: "No goals yet" },
  "health.category.savings": { es: "Ahorro", en: "Savings" },
  "health.category.budget": { es: "Presupuesto", en: "Budget" },
  "health.category.cashFlow": { es: "Flujo de caja", en: "Cash Flow" },
  "health.category.goals": { es: "Objetivos", en: "Goals" },
  "health.category.debt": { es: "Deuda", en: "Debt" },
  "health.status.good": { es: "Bien", en: "Good" },
  "health.status.fair": { es: "Regular", en: "Fair" },
  "health.status.low": { es: "Bajo", en: "Low" },
  "health.status.onTrack": { es: "En curso", en: "On track" },
  "health.status.nearLimit": { es: "Cerca del límite", en: "Near limit" },
  "health.status.overBudget": { es: "Excedido", en: "Over budget" },
  "health.status.positive": { es: "Positivo", en: "Positive" },
  "health.status.tight": { es: "Ajustado", en: "Tight" },
  "health.status.negative": { es: "Negativo", en: "Negative" },
  "health.status.attention": { es: "Atención", en: "Attention" },
  "health.status.moderate": { es: "Moderado", en: "Moderate" },
  "health.status.high": { es: "Alto", en: "High" },
  "health.status.none": { es: "N/D", en: "N/A" },
  "health.savings.saving": { es: "Ahorrando el", en: "Saving" },
  "health.savings.ofIncome": {
    es: "de tus ingresos este mes",
    en: "of your income this month",
  },
  "health.savings.noIncome": {
    es: "Sin ingresos registrados este mes",
    en: "No income recorded this month",
  },
  "health.budget.none": {
    es: "Aún no tienes presupuestos definidos",
    en: "You don't have any budgets set yet",
  },
  "health.budget.categoryOver": {
    es: "categoría excedida",
    en: "category over budget",
  },
  "health.budget.categoriesOver": {
    es: "categorías excedidas",
    en: "categories over budget",
  },
  "health.budget.categoryNear": {
    es: "categoría cerca del límite",
    en: "category near its limit",
  },
  "health.budget.categoriesNear": {
    es: "categorías cerca del límite",
    en: "categories near their limit",
  },
  "health.budget.allOnTrack": {
    es: "Todos los presupuestos van en curso",
    en: "All budgets are on track",
  },
  "health.cashFlow.net": { es: "Neto de", en: "Net of" },
  "health.cashFlow.improved": {
    es: "este mes — mejor que el mes pasado",
    en: "this month — better than last month",
  },
  "health.cashFlow.worsened": {
    es: "este mes — peor que el mes pasado",
    en: "this month — worse than last month",
  },
  "health.goals.none": {
    es: "Aún no tienes objetivos definidos",
    en: "You don't have any goals set yet",
  },
  "health.goals.onTrack": {
    es: "Todos los objetivos van en curso",
    en: "All goals are on track",
  },
  "health.goals.oneBehind": {
    es: "objetivo con fecha cercana y avance bajo",
    en: "goal close to its deadline with low progress",
  },
  "health.goals.multipleBehind": {
    es: "objetivos con fecha cercana y avance bajo",
    en: "goals close to their deadline with low progress",
  },
  "health.debt.none": {
    es: "Sin deudas pendientes",
    en: "No outstanding debt",
  },
  "health.debt.outstanding": { es: "Debes", en: "You owe" },
  "insights.budgetPace.title": {
    es: "Ritmo de presupuesto",
    en: "Budget pace",
  },
  "insights.budgetPace.prefix": {
    es: "Vas a exceder tu presupuesto de",
    en: "You're on track to exceed your",
  },
  "insights.budgetPace.middle": {
    es: "en aproximadamente",
    en: "budget in about",
  },
  "insights.budgetPace.suffix": {
    es: "días si mantienes este ritmo",
    en: "days at this rate",
  },
  "insights.categorySpike.title": {
    es: "Categoría en aumento",
    en: "Category on the rise",
  },
  "insights.categorySpike.suffix": {
    es: "más que el mes pasado",
    en: "more than last month",
  },
  "insights.subscriptions.title": { es: "Suscripciones", en: "Subscriptions" },
  "insights.subscriptions.prefix": { es: "Estás pagando", en: "You're paying" },
  "insights.subscriptions.suffix": {
    es: "al mes en suscripciones — vale la pena revisarlas",
    en: "/month in subscriptions — worth reviewing",
  },
  "insights.savingsRate.title": { es: "Tasa de ahorro", en: "Savings rate" },
  "insights.savingsRate.prefix": {
    es: "Tu tasa de ahorro cambió",
    en: "Your savings rate changed",
  },
  "insights.savingsRate.suffix": {
    es: "puntos en los últimos meses",
    en: "points over the last few months",
  },
  "insights.goalTarget.title": { es: "Meta de ahorro", en: "Savings goal" },
  "insights.goalTarget.prefix": {
    es: "Necesitas ahorrar",
    en: "You need to save",
  },
  "insights.goalTarget.middle": {
    es: "al mes para alcanzar",
    en: "a month to reach",
  },
  "insights.goalTarget.suffix": {
    es: "antes de la fecha objetivo",
    en: "by its target date",
  },
  "insights.unusualTransaction.title": {
    es: "Gasto inusual",
    en: "Unusual expense",
  },
  "insights.unusualTransaction.middle": { es: "en", en: "in" },
  "insights.unusualTransaction.suffix": {
    es: "está muy por encima de lo habitual",
    en: "is well above your usual average",
  },
  "insights.monthProjection.title": {
    es: "Proyección de fin de mes",
    en: "End-of-month projection",
  },
  "insights.monthProjection.prefix": {
    es: "A este ritmo, terminarás el mes gastando",
    en: "At this pace, you'll end the month spending",
  },
  "insights.monthProjection.suffix": {
    es: "vs. el mes pasado",
    en: "vs. last month",
  },
  "insights.categoryShare.title": {
    es: "Categoría dominante",
    en: "Top category",
  },
  "insights.categoryShare.suffix": { es: "representa el", en: "makes up" },
  "insights.categoryShare.ofExpenses": {
    es: "de tus gastos",
    en: "of your expenses",
  },
  "insights.goalProgress.title": {
    es: "Progreso de objetivo",
    en: "Goal progress",
  },
  "insights.goalProgress.suffix": { es: "va en el", en: "is" },
  "insights.goalProgress.complete": { es: "completado", en: "complete" },
  "insights.upcomingExpenses.title": {
    es: "Gastos próximos",
    en: "Upcoming expenses",
  },
  "insights.upcomingExpenses.prefix": { es: "Tienes", en: "You have" },
  "insights.upcomingExpenses.suffix": {
    es: "en gastos recurrentes próximos.",
    en: "in upcoming recurring expenses.",
  },
  "insights.spendingStreak.title": {
    es: "Racha de gasto",
    en: "Spending streak",
  },
  "insights.spendingStreak.prefix": {
    es: "Tu gasto ha subido",
    en: "Your spending has increased for",
  },
  "insights.spendingStreak.suffix": {
    es: "meses seguidos.",
    en: "consecutive months.",
  },

  "categories.breakdown": {
    es: "Desglose por categoría",
    en: "Breakdown by category",
  },

  "analytics.tab.spending": { es: "Gastos", en: "Spending" },
  "analytics.tab.income": { es: "Ingresos", en: "Income" },
  "analytics.tab.cashFlow": { es: "Flujo de caja", en: "Cash Flow" },
  "analytics.tab.netWorth": { es: "Patrimonio", en: "Net Worth" },
  "analytics.cashFlow.netThisMonth": {
    es: "Flujo neto este mes",
    en: "Net cash flow this month",
  },
  "analytics.cashFlow.trend": {
    es: "Tendencia de flujo de caja",
    en: "Cash flow trend",
  },
  "analytics.cashFlow.trendSubtitle": {
    es: "Ahorro acumulado — últimos 6 meses",
    en: "Cumulative savings — last 6 months",
  },
  "analytics.cashFlow.upcomingImpact": {
    es: "Impacto de próximos movimientos",
    en: "Impact of upcoming movements",
  },
  "analytics.cashFlow.upcomingImpactSubtitle": {
    es: "Cómo afectarán tu flujo de caja los movimientos recurrentes activos",
    en: "How active recurring items will affect your cash flow",
  },
  "analytics.burnRate": { es: "Ritmo de gasto", en: "Burn rate" },
  "analytics.perDaySuffix": { es: "/día", en: "/day" },
  "analytics.bestMonth": { es: "Mejor mes", en: "Best month" },
  "analytics.worstMonth": { es: "Peor mes", en: "Worst month" },
  "analytics.forecastNextMonth": {
    es: "Pronóstico próx. mes",
    en: "Next month forecast",
  },
  "analytics.incomeVsExpensesLast6": {
    es: "Ingresos vs. gastos — últimos 6 meses",
    en: "Income vs. expenses — last 6 months",
  },
  "analytics.expenseTrend": { es: "Tendencia de gastos", en: "Expense trend" },
  "analytics.monthlyEvolution": {
    es: "Evolución mensual",
    en: "Monthly evolution",
  },
  "analytics.accumulatedBalance": {
    es: "Saldo acumulado",
    en: "Cumulative balance",
  },
  "analytics.categoryAnalysis": {
    es: "Análisis por categoría",
    en: "Category analysis",
  },
  "analytics.monthlyExpenseShare": {
    es: "Participación del gasto total del mes",
    en: "Share of this month's total spending",
  },
  "analytics.spendingHabits": {
    es: "Análisis de hábitos de gasto",
    en: "Spending habits analysis",
  },
  "analytics.weekdayAvg": {
    es: "Promedio entre semana",
    en: "Weekday average",
  },
  "analytics.weekendAvg": {
    es: "Promedio fin de semana",
    en: "Weekend average",
  },
  "analytics.peakSpendingDay": {
    es: "Día de mayor gasto",
    en: "Peak spending day",
  },

  "reports.export": { es: "Exportar PDF", en: "Export PDF" },
  "reports.netSavings": { es: "Ahorro neto", en: "Net savings" },
  "reports.avgMonthlySavings": {
    es: "Ahorro mensual promedio",
    en: "Average monthly savings",
  },
  "reports.netSavingsTrend": {
    es: "Tendencia de ahorro neto",
    en: "Net savings trend",
  },
  "reports.weeklySpendingPattern": {
    es: "Patrón de gasto semanal",
    en: "Weekly spending pattern",
  },
  "reports.currentMonth": { es: "Mes actual", en: "Current month" },
  "reports.topCategories": {
    es: "Categorías principales",
    en: "Top categories",
  },
  "reports.budgetPerformance": {
    es: "Desempeño de presupuestos",
    en: "Budget performance",
  },
  "reports.goalsProgress": {
    es: "Progreso de objetivos",
    en: "Goals progress",
  },

  "txn.searchPlaceholder": {
    es: "Buscar por descripción o comercio…",
    en: "Search by description or merchant…",
  },
  "txn.filterAllTypes": { es: "Todos los tipos", en: "All types" },
  "txn.filterAllCategories": {
    es: "Todas las categorías",
    en: "All categories",
  },
  "txn.filterAllMethods": { es: "Todos los métodos", en: "All methods" },
  "txn.emptyTitle": { es: "Sin resultados", en: "No results" },
  "txn.emptyDescription": {
    es: "Ajusta la búsqueda o los filtros.",
    en: "Adjust your search or filters.",
  },
  "txn.colDate": { es: "Fecha", en: "Date" },
  "txn.colDescription": { es: "Descripción", en: "Description" },
  "txn.colCategory": { es: "Categoría", en: "Category" },
  "txn.colType": { es: "Tipo", en: "Type" },
  "txn.colAmount": { es: "Monto", en: "Amount" },
  "txn.colMethod": { es: "Método", en: "Method" },
  "txn.colStatus": { es: "Estado", en: "Status" },
  "txn.typeIncome": { es: "Ingreso", en: "Income" },
  "txn.typeExpense": { es: "Gasto", en: "Expense" },
  "txn.typeTransfer": { es: "Transferencia", en: "Transfer" },
  "txn.statusCompleted": { es: "Completado", en: "Completed" },
  "txn.statusPlanned": { es: "Próximo", en: "Upcoming" },

  "dateRange.thisMonth": { es: "Este mes", en: "This month" },
  "dateRange.lastMonth": { es: "Mes pasado", en: "Last month" },
  "dateRange.last3Months": { es: "Últimos 3 meses", en: "Last 3 months" },
  "dateRange.thisYear": { es: "Este año", en: "This year" },

  // Overview redesign
  "overview.netThisMonth": { es: "neto este mes", en: "net this month" },
  "overview.financialHealthSubtitle": {
    es: "Cinco chequeos, actualizados a diario",
    en: "Five checks, updated daily",
  },
  "overview.insightsSubtitle": {
    es: "Ordenadas por impacto este mes",
    en: "Ranked by impact this month",
  },
  "overview.upcomingEventsSubtitle": {
    es: "Próximos 14 días, de series recurrentes activas",
    en: "Next 14 days, from active recurring series",
  },
  "overview.manageInApp": {
    es: "Gestionar en la app →",
    en: "Manage in app →",
  },

  // Analytics redesign
  "analytics.monthsOfRunway": {
    es: "Meses de reserva",
    en: "Months of runway",
  },
  "analytics.fixedVsVariable": {
    es: "Fijo vs. variable",
    en: "Fixed vs. variable",
  },
  "analytics.freelanceNote": {
    es: "El ingreso freelance puede variar de un mes a otro — planea con tu promedio, no con tu mejor mes.",
    en: "Freelance income can vary month to month — plan around your average, not your best month.",
  },
  "analytics.cashFlow.projectedBalance": {
    es: "Saldo proyectado",
    en: "Projected balance",
  },
  "analytics.cashFlow.lowestProjected": {
    es: "Saldo proyectado más bajo antes del próximo pago:",
    en: "Lowest projected balance before your next payday:",
  },
  "analytics.rangeSubtitlePrefix": { es: "Últimos", en: "Last" },
  "analytics.rangeSubtitleSuffix": { es: "meses", en: "months" },
  "netWorth.lentOut": { es: "Prestado", en: "Lent out" },
  "netWorth.borrowedTile": { es: "Recibido en préstamo", en: "Borrowed" },
  "netWorth.lentAndBorrowed": {
    es: "Prestado y recibido en préstamo",
    en: "Lent and borrowed",
  },

  // Budgets redesign
  "budgets.readOnlyNote": {
    es: "Solo lectura aquí — los límites se configuran en la app móvil.",
    en: "Read-only here — limits are set in the mobile app.",
  },
  "budgets.daysLeftSuffix": { es: "días restantes en", en: "days left in" },

  // Goals redesign
  "goals.readOnlyNote": {
    es: "Solo progreso. Los objetivos se crean y editan en la app móvil.",
    en: "Progress only. Goals are created and edited in the mobile app.",
  },

  // Reports redesign
  "reports.reviewOf": { es: "Revisión de", en: "Review of" },
  "reports.comparedWith": { es: "comparado con", en: "compared with" },
  "reports.periodTotals": { es: "Totales del periodo", en: "Period totals" },
  "reports.colMetric": { es: "MÉTRICA", en: "METRIC" },
  "reports.colChange": { es: "CAMBIO", en: "CHANGE" },
  "reports.savingsRate": { es: "Tasa de ahorro", en: "Savings rate" },

  // Settings redesign
  "settings.hideAmounts": {
    es: "Ocultar montos por defecto",
    en: "Hide amounts by default",
  },
  "settings.hideAmountsHint": {
    es: "Se difuminan hasta pasar el cursor",
    en: "Blurred until you hover",
  },
  "settings.biometricAndroidOnly": {
    es: "Solo Android — se ignora en la web",
    en: "Android only — ignored on web",
  },
  "settings.editProfile": { es: "Editar perfil", en: "Edit profile" },
  "settings.memberSincePrefix": { es: "Miembro desde", en: "Member since" },
  "settings.security": { es: "Seguridad", en: "Security" },
  "settings.password": { es: "Contraseña", en: "Password" },
  "settings.passwordHint": {
    es: "Última actualización hace tiempo",
    en: "Last updated a while ago",
  },
  "settings.change": { es: "Cambiar", en: "Change" },
  "settings.activeSessions": { es: "Sesiones activas", en: "Active sessions" },
  "settings.activeSessionsHint": {
    es: "Administra dónde iniciaste sesión",
    en: "Manage where you are signed in",
  },
  "settings.manage": { es: "Gestionar", en: "Manage" },
  "settings.deleteAccount": { es: "Eliminar cuenta", en: "Delete account" },
  "settings.deleteAccountHint": {
    es: "Se elimina todo permanentemente",
    en: "Permanently removes everything",
  },

  // Real auth (login/register/change password)
  "settings.changePasswordTitle": {
    es: "Cambiar contraseña",
    en: "Change password",
  },
  "settings.createPasswordTitle": {
    es: "Crear contraseña",
    en: "Create password",
  },
  "settings.createPasswordHint": {
    es: "Iniciaste sesión con Google — crea una contraseña para poder entrar también con tu correo.",
    en: "You signed in with Google — create a password so you can also log in with your email.",
  },
  "settings.currentPassword": {
    es: "Contraseña actual",
    en: "Current password",
  },
  "settings.newPassword": { es: "Nueva contraseña", en: "New password" },
  "settings.confirmNewPassword": {
    es: "Confirmar nueva contraseña",
    en: "Confirm new password",
  },
  "settings.passwordChangedToast": {
    es: "Contraseña actualizada. Vuelve a iniciar sesión.",
    en: "Password updated. Please log in again.",
  },
  "settings.passwordMismatch": {
    es: "Las contraseñas no coinciden.",
    en: "Passwords don't match.",
  },

  "auth.loginTitle": { es: "Iniciar sesión", en: "Sign in" },
  "auth.loginSubtitle": {
    es: "Tus finanzas, bajo control.",
    en: "Your finances, under control.",
  },
  "auth.registerTitle": { es: "Crear cuenta", en: "Create account" },
  "auth.registerSubtitle": {
    es: "Gratis, sin tarjeta de crédito.",
    en: "Free, no credit card required.",
  },
  "auth.showPassword": { es: "Mostrar contraseña", en: "Show password" },
  "auth.hidePassword": { es: "Ocultar contraseña", en: "Hide password" },
  "auth.submitLogin": { es: "Entrar", en: "Sign in" },
  "auth.submitRegister": { es: "Crear cuenta", en: "Create account" },
  "auth.noAccount": { es: "¿Nuevo en S2 Nova?", en: "New to S2 Nova?" },
  "auth.signUpLink": { es: "Crear cuenta", en: "Create account" },
  "auth.hasAccount": {
    es: "¿Ya tienes cuenta?",
    en: "Already have an account?",
  },
  "auth.signInLink": { es: "Inicia sesión", en: "Sign in" },
  "auth.orDivider": { es: "o", en: "or" },
  "auth.orWithEmail": { es: "O CON TU CORREO", en: "OR WITH YOUR EMAIL" },
  "auth.continueWithGoogle": {
    es: "Continuar con Google",
    en: "Continue with Google",
  },
  "auth.forgotPassword": { es: "¿Olvidaste?", en: "Forgot?" },
  "auth.rememberMe": {
    es: "Mantener sesión iniciada",
    en: "Keep me signed in",
  },
  "auth.encryptedData": {
    es: "Datos cifrados de extremo a extremo",
    en: "End-to-end encrypted data",
  },
  "auth.invalidEmail": {
    es: "Ingresa un correo válido.",
    en: "Enter a valid email.",
  },
  "auth.passwordTooShort": {
    es: "La contraseña debe tener al menos 8 caracteres.",
    en: "Password must be at least 8 characters.",
  },
  "auth.emailFieldLabel": { es: "CORREO", en: "EMAIL" },
  "auth.passwordFieldLabel": { es: "CONTRASEÑA", en: "PASSWORD" },
  "auth.nameFieldLabel": { es: "NOMBRE", en: "NAME" },
  "auth.registerWithGoogle": {
    es: "Registrarse con Google",
    en: "Sign up with Google",
  },
  "auth.passwordStrengthSecure": { es: "Segura", en: "Strong" },
  "auth.passwordHint": {
    es: "Mínimo 8 caracteres, una mayúscula y un número.",
    en: "At least 8 characters, one uppercase letter, and one number.",
  },
  "auth.termsPrefix": { es: "Acepto los ", en: "I accept the " },
  "auth.termsLink": { es: "Términos", en: "Terms" },
  "auth.termsMiddle": { es: " y la ", en: " and the " },
  "auth.privacyLink": { es: "Política de privacidad", en: "Privacy Policy" },
  "auth.termsRequired": {
    es: "Debes aceptar los Términos para continuar.",
    en: "You must accept the Terms to continue.",
  },
  "auth.nameRequired": { es: "Ingresa tu nombre.", en: "Enter your name." },
  // ── Stage 2 v2 shell, Inicio, Planes (s2_nova_stage2_handoff) ──
  "v2.nav.inicio": { es: "Inicio", en: "Home" },
  "v2.nav.movimientos": { es: "Movimientos", en: "Transactions" },
  "v2.nav.planes": { es: "Planes", en: "Plans" },
  "v2.nav.reportes": { es: "Reportes", en: "Reports" },
  "v2.nav.ajustes": { es: "Ajustes", en: "Settings" },
  "v2.sidebar.tagline": { es: "PERSONAL FINANCE", en: "PERSONAL FINANCE" },
  "v2.sidebar.editProfile": { es: "Editar perfil", en: "Edit profile" },
  "v2.sidebar.logout": { es: "Cerrar sesión", en: "Log out" },
  "v2.header.search": { es: "Buscar movimientos, categorías…", en: "Search transactions, categories…" },
  "v2.header.newTx": { es: "Nuevo movimiento", en: "New transaction" },
  "inicio.balance": { es: "SALDO TOTAL", en: "TOTAL BALANCE" },
  "inicio.walletsOne": { es: "1 billetera", en: "1 wallet" },
  "inicio.walletsMany": { es: "{0} billeteras", en: "{0} wallets" },
  "inicio.showAmounts": { es: "Mostrar montos", en: "Show amounts" },
  "inicio.hideAmounts": { es: "Ocultar montos", en: "Hide amounts" },
  "inicio.amountHidden": { es: "Monto oculto", en: "Amount hidden" },
  "inicio.monthIncome": { es: "Ingresos del mes", en: "Income this month" },
  "inicio.monthExpenses": { es: "Gastos del mes", en: "Expenses this month" },
  "inicio.syncError": { es: "No pudimos actualizar tus datos.", en: "We couldn't update your data." },
  "inicio.retry": { es: "Reintentar", en: "Retry" },
  "inicio.wallets.title": { es: "Billeteras", en: "Wallets" },
  "inicio.wallets.subtitle": { es: "El saldo total es la suma de tus billeteras", en: "Your total balance is the sum of your wallets" },
  "inicio.wallets.share": { es: "{0}% del total", en: "{0}% of total" },
  "inicio.wallets.empty": { es: "Agrega tu primera billetera", en: "Add your first wallet" },
  "inicio.walletKind.savings": { es: "Cuenta de ahorros", en: "Savings account" },
  "inicio.walletKind.debit": { es: "Cuenta débito", en: "Debit account" },
  "inicio.walletKind.credit": { es: "Tarjeta de crédito", en: "Credit card" },
  "inicio.walletKind.digital": { es: "Billetera digital", en: "Digital wallet" },
  "inicio.walletKind.cash": { es: "Efectivo", en: "Cash" },
  "inicio.walletKind.crypto": { es: "Cripto", en: "Crypto" },
  "inicio.walletKind.other": { es: "Otra", en: "Other" },
  "inicio.alerts.title": { es: "Alertas", en: "Alerts" },
  "inicio.alerts.oneOpen": { es: "1 pendiente", en: "1 pending" },
  "inicio.alerts.manyOpen": { es: "{0} pendientes", en: "{0} pending" },
  "inicio.alerts.none": { es: "Sin alertas pendientes.", en: "No pending alerts." },
  "inicio.alerts.restore": { es: "Restaurar", en: "Restore" },
  "inicio.alerts.dismiss": { es: "Descartar", en: "Dismiss" },
  "alert.seriesDue.title": { es: "{0} vence hoy", en: "{0} is due today" },
  "alert.seriesOverdue.title": { es: "{0} venció el {1}", en: "{0} was due {1}" },
  "alert.series.body": { es: "{0} · confírmalo para que afecte el saldo.", en: "{0} · confirm it so it affects your balance." },
  "alert.loanLent.title": { es: "{0} te debe", en: "{0} owes you" },
  "alert.loanBorrowed.title": { es: "Le debes a {0}", en: "You owe {0}" },
  "alert.loan.body": { es: "{0} · vence {1}.", en: "{0} · due {1}." },
  "alert.budget.title": { es: "{0} al {1}% del límite", en: "{0} at {1}% of its limit" },
  "alert.budget.body": { es: "{0} de {1} este mes.", en: "{0} of {1} this month." },
  "alert.budget.pace": { es: " A este ritmo se supera en ~{0} días.", en: " At this pace it's exceeded in ~{0} days." },
  "alert.goal.title": { es: "{0} está al {1}%", en: "{0} is at {1}%" },
  "alert.goal.body": { es: "Faltan {0} para cumplirla.", en: "{0} left to reach it." },
  "inicio.budgets.title": { es: "Presupuestos", en: "Budgets" },
  "inicio.budgets.subtitle": { es: "Quedan {0} días de {1} · ordenados por riesgo", en: "{0} days left in {1} · sorted by risk" },
  "inicio.budgets.subtitleOne": { es: "Queda 1 día de {0} · ordenados por riesgo", en: "1 day left in {0} · sorted by risk" },
  "inicio.budgets.subtitleLast": { es: "Último día de {0} · ordenados por riesgo", en: "Last day of {0} · sorted by risk" },
  "inicio.budgets.available": { es: "Disponible {0}", en: "{0} available" },
  "inicio.budgets.overBy": { es: "Superado por {0}", en: "Over by {0}" },
  "inicio.budgets.exceeds": { es: "Se supera en ~{0} días a este ritmo", en: "Exceeded in ~{0} days at this pace" },
  "inicio.budgets.exceedsOne": { es: "Se supera en ~1 día a este ritmo", en: "Exceeded in ~1 day at this pace" },
  "inicio.budgets.closes": { es: "Cerraría en ~{0}", en: "Would close at ~{0}" },
  "inicio.budgets.relaxed": { es: "Holgado", en: "Comfortable" },
  "inicio.budgets.over": { es: "Superado", en: "Over budget" },
  "inicio.budgets.empty": { es: "Aún no tienes presupuestos este mes.", en: "You have no budgets this month yet." },
  "inicio.seeInPlanes": { es: "Ver en Planes →", en: "See in Plans →" },
  "inicio.seeInReportes": { es: "Ver en Reportes →", en: "See in Reports →" },
  "inicio.seeInMovimientos": { es: "Ver en Movimientos →", en: "See in Transactions →" },
  "inicio.goals.title": { es: "Metas", en: "Goals" },
  "inicio.goals.subtitle": { es: "Aportes acumulados y fecha estimada", en: "Contributions so far and estimated date" },
  "inicio.goals.progress": { es: "{0} de {1}", en: "{0} of {1}" },
  "inicio.goals.eta": { es: "Estimada: {0}", en: "Estimated: {0}" },
  "inicio.goals.target": { es: " · meta {0}", en: " · target {0}" },
  "inicio.goals.insufficient": { es: "Sin historial suficiente para estimar", en: "Not enough history to estimate" },
  "inicio.goals.done": { es: "Meta cumplida", en: "Goal reached" },
  "inicio.goals.empty": { es: "Aún no tienes metas.", en: "You have no goals yet." },
  "inicio.loans.title": { es: "Préstamos", en: "Loans" },
  "inicio.loans.subtitle": { es: "{0} abiertos · {1} saldados", en: "{0} open · {1} settled" },
  "inicio.loans.owedToYou": { es: "Te deben", en: "Owed to you" },
  "inicio.loans.youOwe": { es: "Debes", en: "You owe" },
  "inicio.loans.due": { es: "Vence {0} · {1}", en: "Due {0} · {1}" },
  "inicio.categories.title": { es: "Gasto por categoría", en: "Spending by category" },
  "inicio.categories.empty": { es: "Sin gastos registrados este mes.", en: "No spending recorded this month." },
  "inicio.upcoming.title": { es: "Próximos 14 días", en: "Next 14 days" },
  "inicio.upcoming.subtitle": { es: "Desde tus programados · con saldo proyectado", en: "From your scheduled items · with projected balance" },
  "inicio.upcoming.today": { es: "HOY", en: "TODAY" },
  "inicio.upcoming.dueToday": { es: "Vence hoy · por confirmar", en: "Due today · to confirm" },
  "inicio.upcoming.balance": { es: "Saldo {0}", en: "Balance {0}" },
  "inicio.upcoming.empty": { es: "Nada programado en los próximos 14 días.", en: "Nothing scheduled in the next 14 days." },
  "event.sub": { es: "Programado · {0}", en: "Scheduled · {0}" },
  "event.interval.weekly": { es: "semanal", en: "weekly" },
  "event.interval.monthly": { es: "mensual", en: "monthly" },
  "event.interval.yearly": { es: "anual", en: "yearly" },
  "event.date": { es: "Fecha", en: "Date" },
  "event.category": { es: "Categoría", en: "Category" },
  "event.wallet": { es: "Billetera", en: "Wallet" },
  "event.next": { es: "Siguiente", en: "Next" },
  "event.today": { es: "Hoy", en: "Today" },
  "event.skip": { es: "Omitir esta vez", en: "Skip this time" },
  "event.confirmExpense": { es: "Confirmar pago", en: "Confirm payment" },
  "event.confirmIncome": { es: "Confirmar ingreso", en: "Confirm income" },
  "event.skipped": { es: "{0} omitido este mes", en: "{0} skipped this time" },
  "event.confirmed": { es: "{0} confirmado", en: "{0} confirmed" },
  "common.close": { es: "Cerrar", en: "Close" },
  "common.cancel": { es: "Cancelar", en: "Cancel" },
  "newTx.title": { es: "Nuevo movimiento", en: "New transaction" },
  "newTx.expense": { es: "Gasto", en: "Expense" },
  "newTx.income": { es: "Ingreso", en: "Income" },
  "newTx.transfer": { es: "Transferencia", en: "Transfer" },
  "newTx.amount": { es: "MONTO", en: "AMOUNT" },
  "newTx.description": { es: "DESCRIPCIÓN", en: "DESCRIPTION" },
  "newTx.descriptionPlaceholder": { es: "Ej. Mercado semanal", en: "e.g. Weekly groceries" },
  "newTx.suggested": { es: "Categoría sugerida: {0}", en: "Suggested category: {0}" },
  "newTx.category": { es: "CATEGORÍA", en: "CATEGORY" },
  "newTx.wallet": { es: "BILLETERA", en: "WALLET" },
  "newTx.from": { es: "DESDE", en: "FROM" },
  "newTx.to": { es: "TRANSFERIR A", en: "TRANSFER TO" },
  "newTx.errAmount": { es: "Escribe el monto.", en: "Enter the amount." },
  "newTx.errDescription": { es: "Escribe una descripción.", en: "Enter a description." },
  "newTx.errCategory": { es: "Elige una categoría.", en: "Pick a category." },
  "newTx.errWallet": { es: "Elige una billetera.", en: "Pick a wallet." },
  "newTx.errTarget": { es: "Elige la billetera de destino.", en: "Pick the destination wallet." },
  "newTx.noWallets": { es: "Agrega una billetera en Android para registrar movimientos.", en: "Add a wallet on Android to record transactions." },
  "newTx.save": { es: "Guardar movimiento", en: "Save transaction" },
  "newTx.saved": { es: "Movimiento guardado", en: "Transaction saved" },
  "planes.title": { es: "Planes", en: "Plans" },
  "planes.subtitle": { es: "Presupuestos, metas y préstamos. Los mismos que ves en Android.", en: "Budgets, goals and loans. The same ones you see on Android." },
  "planes.tab.budgets": { es: "Presupuestos", en: "Budgets" },
  "planes.tab.goals": { es: "Metas", en: "Goals" },
  "planes.tab.loans": { es: "Préstamos", en: "Loans" },
  "loans.lent": { es: "Prestado", en: "Lent" },
  "loans.borrowed": { es: "Recibido", en: "Borrowed" },
  "loans.pendingLent": { es: "TE DEBEN", en: "OWED TO YOU" },
  "loans.pendingBorrowed": { es: "DEBES", en: "YOU OWE" },
  "loans.paidLent": { es: "YA TE PAGARON", en: "ALREADY PAID TO YOU" },
  "loans.paidBorrowed": { es: "YA PAGASTE", en: "ALREADY PAID" },
  "loans.nextDue": { es: "PRÓXIMO VENCIMIENTO", en: "NEXT DUE DATE" },
  "loans.noDue": { es: "Sin vencimientos", en: "No due dates" },
  "loans.metaLent": { es: "Prestado desde {0} · {1}", en: "Lent from {0} · {1}" },
  "loans.metaBorrowed": { es: "Recibido en {0} · {1}", en: "Received in {0} · {1}" },
  "loans.metaDue": { es: " · vence {0}", en: " · due {0}" },
  "loans.pending": { es: "Pendiente", en: "Pending" },
  "loans.settled": { es: "Saldado", en: "Settled" },
  "loans.pendingAmount": { es: "{0} pendiente", en: "{0} pending" },
  "loans.progress": { es: "{0} de {1} · {2}%", en: "{0} of {1} · {2}%" },
  "loans.history": { es: "HISTORIAL", en: "HISTORY" },
  "loans.historyLent": { es: "{0} · Préstamo desde {1}", en: "{0} · Loan from {1}" },
  "loans.historyBorrowed": { es: "{0} · Recibido en {1}", en: "{0} · Received in {1}" },
  "loans.historyPayment": { es: "{0} · Abono en {1}", en: "{0} · Payment into {1}" },
  "loans.pay": { es: "Registrar abono", en: "Record payment" },
  "loans.emptyLent": { es: "No tienes préstamos a otras personas.", en: "You haven't lent money to anyone." },
  "loans.emptyBorrowed": { es: "No tienes deudas registradas.", en: "You have no recorded debts." },
  "loans.paySub": { es: "{0} · pendiente {1}", en: "{0} · {1} pending" },
  "loans.payAmount": { es: "MONTO", en: "AMOUNT" },
  "loans.payHint": { es: "Por defecto, el saldo pendiente completo. Puedes registrar un abono parcial.", en: "Defaults to the full pending balance. You can record a partial payment." },
  "loans.receiveIn": { es: "RECIBIR EN", en: "RECEIVE INTO" },
  "loans.payFrom": { es: "PAGAR DESDE", en: "PAY FROM" },
  "loans.payError": { es: "El abono debe ser mayor que 0 y no superar {0}.", en: "The payment must be greater than 0 and no more than {0}." },
  "loans.paySave": { es: "Guardar abono", en: "Save payment" },
  "loans.settledToast": { es: "Préstamo saldado", en: "Loan settled" },
  "loans.paidToast": { es: "Abono registrado", en: "Payment recorded" },
  "loans.unknownPerson": { es: "Sin nombre", en: "No name" },
} as const satisfies Record<string, Record<LanguageCode, string>>;

export type TranslationKey = keyof typeof dictionary;

export function translate(key: TranslationKey, language: LanguageCode): string {
  return dictionary[key][language];
}

// `CategoryId`/`PaymentMethod` values are the exact suffix of their
// `category.*`/`paymentMethod.*` dictionary keys, so every category/payment
// label in the app goes through this instead of the (Spanish-only) `label`
// field on the mock data in `data/categories.ts`.
export function categoryTranslationKey(id: CategoryId): TranslationKey {
  return `category.${id}` as TranslationKey;
}

export function paymentMethodTranslationKey(id: PaymentMethod): TranslationKey {
  return `paymentMethod.${id}` as TranslationKey;
}

export function walletTypeTranslationKey(type: WalletType): TranslationKey {
  return `wallets.type.${type}` as TranslationKey;
}

export function insightToneTranslationKey(
  tone: "positive" | "warning" | "negative" | "neutral",
): TranslationKey {
  return `insights.tone.${tone}` as TranslationKey;
}

export function recurringIntervalTranslationKey(
  interval: "weekly" | "monthly" | "yearly",
): TranslationKey {
  return `recurring.interval.${interval}` as TranslationKey;
}

export function healthCategoryTranslationKey(
  key: "savings" | "budget" | "cashFlow" | "goals" | "debt",
): TranslationKey {
  return `health.category.${key}` as TranslationKey;
}

export function healthStatusTranslationKey(
  status:
    | "good"
    | "fair"
    | "low"
    | "onTrack"
    | "nearLimit"
    | "overBudget"
    | "positive"
    | "tight"
    | "negative"
    | "attention"
    | "moderate"
    | "high"
    | "none",
): TranslationKey {
  return `health.status.${status}` as TranslationKey;
}
