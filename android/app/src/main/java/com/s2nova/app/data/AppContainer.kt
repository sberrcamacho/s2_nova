package com.s2nova.app.data

import android.content.Context
import com.s2nova.app.data.local.DemoModeStore
import com.s2nova.app.data.local.OnboardingStore
import com.s2nova.app.data.local.SessionStore
import com.s2nova.app.data.mock.DemoData
import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.data.model.Currency
import com.s2nova.app.data.model.User
import com.s2nova.app.data.model.UserPreferences
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.repository.AuthRepository
import com.s2nova.app.data.repository.BudgetRepository
import com.s2nova.app.data.repository.CategoryRepository
import com.s2nova.app.data.repository.DemoModeFlag
import com.s2nova.app.data.repository.GoalRepository
import com.s2nova.app.data.repository.NotificationRepository
import com.s2nova.app.data.repository.ProductRepository
import com.s2nova.app.data.repository.RecurringSeriesRepository
import com.s2nova.app.data.repository.TransactionRepository
import com.s2nova.app.data.repository.WalletRepository
import kotlinx.coroutines.flow.Flow

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
    lateinit var demoModeStore: DemoModeStore
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
        demoModeStore = DemoModeStore.getInstance(context)
        val credentialManager = androidx.credentials.CredentialManager.create(context.applicationContext)
        authRepository = AuthRepository(sessionStore, onboardingStore, credentialManager)
    }

    val demoModeActive: Flow<Boolean> get() = demoModeStore.demoModeActive

    // Fallback only — the demo toggle is only reachable while signed in, so
    // there's always a real currentUser to copy preferences from in practice.
    private val DEFAULT_DEMO_PREFERENCES = UserPreferences(
        darkTheme = true, notifications = true, biometricLogin = false,
        currency = Currency.COP, language = AppLanguage.ES,
    )

    // The real signed-in user, saved just before enterDemoMode() swaps
    // currentUser for the fictitious local persona, so exitDemoMode() can
    // restore it instantly without a network round trip.
    private var realUserSnapshot: User? = null

    // Local-only preview of a populated account (Settings > Modo demo) —
    // swaps the signed-in identity for a fictitious local persona and
    // overrides every financial repository's in-memory data with sample
    // data (data/mock/DemoData.kt), so charts/screens can be browsed
    // without touching the real account. Every repository's mutating
    // methods (create/update/delete/...) also check DemoModeFlag and
    // no-op instead of reaching the backend, so nothing typed or tapped
    // while previewing can ever affect the real signed-in account — see
    // each repository's guards. Never touches the backend; per-device via
    // demoModeStore.
    suspend fun enterDemoMode() {
        // Set first: every repository's refresh()/mutation checks this flag
        // and bails out, so a screen's own LaunchedEffect(Unit) {
        // repo.refresh() } can't race the seeding below and overwrite it
        // with real data, and no in-flight action can slip through to the
        // real backend.
        DemoModeFlag.set(true)
        realUserSnapshot = authRepository.currentUser.value
        authRepository.setCurrentUserLocally(DemoData.user(realUserSnapshot?.preferences ?: DEFAULT_DEMO_PREFERENCES))
        walletRepository.loadDemo(DemoData.wallets)
        transactionRepository.loadDemo(DemoData.transactions)
        budgetRepository.loadDemo(DemoData.budgetProgress)
        goalRepository.loadDemo(DemoData.goals)
        recurringSeriesRepository.loadDemo(DemoData.recurringSeries)
        demoModeStore.setDemoModeActive(true)
    }

    // Restores the signed-in user + their real data from the backend and
    // clears the per-device demo flag. Anything added/edited/deleted while
    // previewing was never sent to the backend (see enterDemoMode's doc
    // comment), so it simply vanishes here rather than needing to be
    // "undone".
    suspend fun exitDemoMode() {
        DemoModeFlag.set(false)
        demoModeStore.setDemoModeActive(false)
        realUserSnapshot?.let { authRepository.setCurrentUserLocally(it) }
        realUserSnapshot = null
        refreshUserData()
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
