package com.s2nova.app.data

import android.content.Context
import com.s2nova.app.data.local.AlertStateStore
import com.s2nova.app.data.local.DemoModeStore
import com.s2nova.app.data.local.IdleTimeoutStore
import com.s2nova.app.data.local.OnboardingStore
import com.s2nova.app.data.local.SessionStore
import com.s2nova.app.data.mock.DemoData
import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.data.model.Currency
import com.s2nova.app.data.model.User
import com.s2nova.app.data.model.UserPreferences
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.repository.AlertRepository
import com.s2nova.app.data.repository.AuthRepository
import com.s2nova.app.data.repository.BudgetRepository
import com.s2nova.app.data.repository.CategoryRepository
import com.s2nova.app.data.repository.CurrencyRepository
import com.s2nova.app.data.repository.DemoModeFlag
import com.s2nova.app.data.repository.GoalRepository
import com.s2nova.app.data.repository.NotificationRepository
import com.s2nova.app.data.repository.ProductRepository
import com.s2nova.app.data.repository.RecurringSeriesRepository
import com.s2nova.app.data.repository.SummaryRepository
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
    lateinit var idleTimeoutStore: IdleTimeoutStore
        private set
    lateinit var alertStateStore: AlertStateStore
        private set

    // `by lazy` (not eager `val`s) is load-bearing: merely referencing
    // AppContainer.init(...) from MainActivity.onCreate forces this object's
    // <clinit> to run every property initializer below *before* init()'s own
    // body executes — so an eager `val = CategoryRepository()` would
    // evaluate that constructor's `api: ApiService = ApiClient.api` default
    // argument while ApiClient.appContext is still unset, crashing every
    // launch with UninitializedPropertyAccessException. Deferring
    // construction to first access (which only happens after init() has
    // already called ApiClient.init(context)) avoids that ordering trap.
    val categoryRepository by lazy { CategoryRepository() }
    val walletRepository by lazy { WalletRepository() }
    val currencyRepository by lazy { CurrencyRepository() }
    val goalRepository by lazy { GoalRepository() }
    val budgetRepository by lazy { BudgetRepository(categoryRepository) }
    val transactionRepository by lazy { TransactionRepository(categoryRepository) }
    val recurringSeriesRepository by lazy { RecurringSeriesRepository(categoryRepository) }
    val productRepository by lazy { ProductRepository() }
    val notificationRepository by lazy { NotificationRepository() }
    val summaryRepository by lazy { SummaryRepository(categoryRepository) }
    val alertRepository by lazy { AlertRepository(categoryRepository, stateStore = alertStateStore) }

    lateinit var authRepository: AuthRepository
        private set

    private var initialized = false

    // Guards against Compose Navigation's own process-death restoration:
    // rememberNavController() persists its back stack via the Activity's
    // saved-instance-state Bundle, so when the OS kills a backgrounded app
    // and the user reopens it, NavHost can restore straight to a screen
    // like Home instead of SPLASH — even though this fresh process just
    // recreated every repository singleton at its empty default. Without
    // this flag, LaunchedSplashNavigation (the only place bootstrap()/
    // refreshUserData() run) never fires, so Home renders a null user and
    // empty StateFlows: a real account looking wiped out, even though
    // SessionStore's tokens were never touched. NovaApp() checks this flag
    // on every fresh composition and forces the restored back stack back
    // to SPLASH when it's still false for this process.
    var sessionBootstrapped: Boolean = false

    // Outlives any one screen: deferred deletions ("Deshacer" window) and
    // uploads keep running after the screen that started them closes.
    val appScope = kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.SupervisorJob() + kotlinx.coroutines.Dispatchers.Main.immediate)

    // Call once, from MainActivity.onCreate, before any repository or
    // screen touches the network.
    fun init(context: Context) {
        if (initialized) return
        initialized = true
        ApiClient.init(context)
        Taxonomy.init(context)
        sessionStore = SessionStore.getInstance(context)
        onboardingStore = OnboardingStore.getInstance(context)
        demoModeStore = DemoModeStore.getInstance(context)
        idleTimeoutStore = IdleTimeoutStore.getInstance(context)
        alertStateStore = AlertStateStore.getInstance(context)
        val credentialManager = androidx.credentials.CredentialManager.create(context.applicationContext)
        authRepository = AuthRepository(sessionStore, onboardingStore, credentialManager)
    }

    val demoModeActive: Flow<Boolean> get() = demoModeStore.demoModeActive

    private val GUEST_PREFERENCES = UserPreferences(
        darkTheme = true, notifications = true, biometricLogin = false,
        currency = Currency.COP, language = AppLanguage.ES,
    )

    // "Continuar como invitado" (ONBOARDING.md §1): a sandboxed example
    // account with the mockup's seed data. Every repository mutation checks
    // DemoModeFlag and applies in memory only — nothing reaches the backend,
    // and nothing survives signing out. There is no way to switch to it from
    // inside a real account.
    fun enterGuestMode() {
        DemoModeFlag.set(true)
        authRepository.setCurrentUserLocally(DemoData.user(GUEST_PREFERENCES))
        categoryRepository.loadDemo()
        currencyRepository.loadDemo(DemoData.currencies, "COP")
        walletRepository.principal = "COP"
        walletRepository.loadDemo(DemoData.wallets)
        transactionRepository.loadDemo(DemoData.transactions)
        budgetRepository.loadDemo(DemoData.budgetProgress)
        goalRepository.loadDemo(DemoData.goals)
        recurringSeriesRepository.loadDemo(DemoData.recurringSeries)
        summaryRepository.loadDemo(DemoData.monthSummaries)
        alertRepository.loadDemo(DemoData.alerts)
    }

    val isGuest: Boolean get() = DemoModeFlag.active

    // Loads every domain repository fresh from the backend — called after
    // a successful login/register and after a restored session at cold
    // start. Individual failures don't block the others; a screen that
    // needs data it couldn't load will show an empty state rather than
    // crash the whole refresh.
    suspend fun refreshUserData() {
        runCatching { categoryRepository.refresh() }
        runCatching { currencyRepository.refresh() }
        walletRepository.principal = currencyRepository.principal
        runCatching { walletRepository.refresh() }
        runCatching { goalRepository.refresh() }
        runCatching { budgetRepository.refresh() }
        runCatching { transactionRepository.refresh() }
        runCatching { recurringSeriesRepository.refresh() }
        runCatching { summaryRepository.refresh() }
        runCatching { alertRepository.refresh() }
    }
}
