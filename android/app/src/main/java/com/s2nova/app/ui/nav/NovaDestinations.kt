package com.s2nova.app.ui.nav

object NovaDestinations {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val FORGOT_PASSWORD = "forgot_password"

    const val ONBOARDING_WELCOME = "onboarding_welcome"
    const val ONBOARDING_INCOME = "onboarding_income"
    const val ONBOARDING_WALLET = "onboarding_wallet"
    const val ONBOARDING_BUDGET = "onboarding_budget"
    const val ONBOARDING_TUTORIAL = "onboarding_tutorial"

    const val HOME = "home"
    const val TRANSACTIONS = "transactions"
    const val TRANSACTION_DETAIL = "transaction_detail/{id}"
    const val ADD_TRANSACTION = "add_transaction"
    const val EDIT_TRANSACTION = "edit_transaction/{id}"
    const val SCANNER = "scanner"
    const val BUDGETS = "budgets"

    // Planes with a preselected tab (0 Presupuestos, 1 Metas, 2 Préstamos)
    // and loan side — alert targets deep-link here. Navigating to plain
    // BUDGETS falls back to the defaults.
    const val BUDGETS_ROUTE = "budgets?tab={tab}&side={side}"
    const val WALLETS = "wallets"
    const val RECURRING = "recurring"
    const val REPORTS = "reports"
    const val PROFILE = "profile"
    const val SETTINGS = "settings"

    fun transactionDetail(id: String) = "transaction_detail/$id"
    fun editTransaction(id: String) = "edit_transaction/$id"
    fun budgets(tab: Int, side: String? = null) = "budgets?tab=$tab" + (side?.let { "&side=$it" } ?: "")
}
