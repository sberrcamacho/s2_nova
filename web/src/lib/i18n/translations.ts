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

  "common.cancel": { es: "Cancelar", en: "Cancel" },
  "common.close": { es: "Cerrar", en: "Close" },
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
