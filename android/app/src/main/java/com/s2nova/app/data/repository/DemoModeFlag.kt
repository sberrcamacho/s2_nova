package com.s2nova.app.data.repository

// In-memory mirror of AppContainer.demoModeStore's persisted flag, checked
// synchronously at the top of every repository's refresh() (see
// WalletRepository, TransactionRepository, BudgetRepository, GoalRepository,
// RecurringSeriesRepository). Without this, a screen's own
// `LaunchedEffect(Unit) { repository.refresh() }` — every list screen has
// one — would silently overwrite the fictitious demo dataset with the
// signed-in user's (typically empty) real data the moment it's opened,
// since refresh() calls the real backend unconditionally. Lives outside
// AppContainer so repositories can read it without a circular reference
// back to the singleton that constructs them.
object DemoModeFlag {
    @Volatile var active: Boolean = false
        private set

    fun set(value: Boolean) {
        active = value
    }
}
