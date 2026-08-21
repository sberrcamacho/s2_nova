package com.s2nova.app.data

import android.content.Context
import com.s2nova.app.data.local.OnboardingStore
import com.s2nova.app.data.local.SessionStore
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.repository.AuthRepository
import com.s2nova.app.data.repository.BudgetRepository
import com.s2nova.app.data.repository.CategoryRepository
import com.s2nova.app.data.repository.GoalRepository
import com.s2nova.app.data.repository.NotificationRepository
import com.s2nova.app.data.repository.ProductRepository
import com.s2nova.app.data.repository.RecurringSeriesRepository
import com.s2nova.app.data.repository.TransactionRepository
import com.s2nova.app.data.repository.WalletRepository

// Manual DI container — a single set of repositories shared by every
// screen. No DI framework, no ViewModels: this is intentional (see
// android/AGENTS.md and ARCHITECTURE.md) — repositories are StateFlow-
// backed singletons, now calling the real backend via ApiClient instead of
// holding an in-memory mock array, but the shape screens interact with
// hasn't changed.
object AppContainer {
    lateinit var sessionStore: SessionStore
        private set
    lateinit var onboardingStore: OnboardingStore
        private set

    val categoryRepository = CategoryRepository()
    val walletRepository = WalletRepository()
    val goalRepository = GoalRepository()
    val budgetRepository = BudgetRepository(categoryRepository)
    val transactionRepository = TransactionRepository(categoryRepository)
    val recurringSeriesRepository = RecurringSeriesRepository(categoryRepository)
    val productRepository = ProductRepository()
    val notificationRepository = NotificationRepository()

    lateinit var authRepository: AuthRepository
        private set

    private var initialized = false

    // Call once, from MainActivity.onCreate, before any repository or
    // screen touches the network.
    fun init(context: Context) {
        if (initialized) return
        initialized = true
        ApiClient.init(context)
        sessionStore = SessionStore.getInstance(context)
        onboardingStore = OnboardingStore.getInstance(context)
        authRepository = AuthRepository(sessionStore, onboardingStore)
    }

    // Loads every domain repository fresh from the backend — called after
    // a successful login/register and after a restored session at cold
    // start. Individual failures don't block the others; a screen that
    // needs data it couldn't load will show an empty state rather than
    // crash the whole refresh.
    suspend fun refreshUserData() {
        runCatching { categoryRepository.refresh() }
        runCatching { walletRepository.refresh() }
        runCatching { goalRepository.refresh() }
        runCatching { budgetRepository.refresh() }
        runCatching { transactionRepository.refresh() }
        runCatching { recurringSeriesRepository.refresh() }
        runCatching {
            notificationRepository.refreshFromData(
                budgets = budgetRepository.budgetProgress.value,
                goals = goalRepository.goals.value,
                recurringSeries = recurringSeriesRepository.series.value,
            )
        }
    }
}
