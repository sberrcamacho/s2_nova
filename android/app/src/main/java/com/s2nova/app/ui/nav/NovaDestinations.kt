package com.s2nova.app.ui.nav

object NovaDestinations {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val FORGOT_PASSWORD = "forgot_password"

    const val HOME = "home"
    const val TRANSACTIONS = "transactions"
    const val TRANSACTION_DETAIL = "transaction_detail/{id}"
    const val ADD_TRANSACTION = "add_transaction"
    const val EDIT_TRANSACTION = "edit_transaction/{id}"
    const val SCANNER = "scanner"
    const val BUDGETS = "budgets"
    const val REPORTS = "reports"
    const val NOTIFICATIONS = "notifications"
    const val PROFILE = "profile"
    const val SETTINGS = "settings"

    fun transactionDetail(id: String) = "transaction_detail/$id"
    fun editTransaction(id: String) = "edit_transaction/$id"
}
