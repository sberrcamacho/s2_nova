package com.s2nova.app.ui.nav

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.repository.DemoModeFlag
import com.s2nova.app.data.model.LoanKind
import com.s2nova.app.ui.AlertTarget
import com.s2nova.app.ui.components.AddActionsSheet
import com.s2nova.app.ui.screens.addtransaction.AddTransactionScreen
import com.s2nova.app.ui.screens.auth.ForgotPasswordScreen
import com.s2nova.app.ui.screens.auth.LoginScreen
import com.s2nova.app.ui.screens.auth.RegisterScreen
import com.s2nova.app.ui.screens.budgets.PlanesScreen
import com.s2nova.app.ui.screens.home.HomeScreen
import com.s2nova.app.ui.screens.onboarding.OnboardingBudgetScreen
import com.s2nova.app.ui.screens.onboarding.OnboardingFlowState
import com.s2nova.app.ui.screens.onboarding.OnboardingIncomeScreen
import com.s2nova.app.ui.screens.onboarding.OnboardingTutorialScreen
import com.s2nova.app.ui.screens.onboarding.OnboardingWalletScreen
import com.s2nova.app.ui.screens.onboarding.OnboardingWelcomeScreen
import com.s2nova.app.ui.screens.onboarding.completeOnboarding
import com.s2nova.app.ui.screens.profile.ProfileScreen
import com.s2nova.app.ui.screens.recurring.RecurringScreen
import com.s2nova.app.ui.screens.reports.ReportsScreen
import com.s2nova.app.ui.screens.scanner.ScannerScreen
import com.s2nova.app.ui.screens.settings.SettingsScreen
import com.s2nova.app.ui.screens.splash.SplashScreen
import com.s2nova.app.ui.screens.transactions.TransactionDetailScreen
import com.s2nova.app.ui.screens.transactions.TransactionsScreen
import com.s2nova.app.ui.screens.wallets.WalletsScreen
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberStrings
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@Composable
fun NovaApp() {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    var showAddSheet by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val onboardingFlowState = remember { OnboardingFlowState() }
    val snackbarHostState = remember { SnackbarHostState() }
    val t = rememberStrings()

    // If this process's NavHost was just recreated from a saved back stack
    // (process death while backgrounded, not an explicit relaunch) without
    // ever having run this process's own splash bootstrap, force it back to
    // SPLASH so AuthRepository.bootstrap()/AppContainer.refreshUserData()
    // actually run before any screen reads the (currently empty) repository
    // StateFlows. See AppContainer.sessionBootstrapped's doc comment.
    LaunchedEffect(Unit) {
        if (!AppContainer.sessionBootstrapped) {
            navController.navigateAsRoot(NovaDestinations.SPLASH)
        }
    }

    // Where a freshly authenticated session lands: onboarding for a user
    // who hasn't completed it yet (fresh register, or an existing account
    // whose local onboarding flag isn't set on this device), Home
    // otherwise. See AuthRepository.fetchAndSyncMe for how the local flag
    // stays in sync with the backend's.
    suspend fun routeAfterAuth() {
        val done = AppContainer.onboardingStore.onboardingCompleted.first()
        navController.navigateAsRoot(if (done) NovaDestinations.HOME else NovaDestinations.ONBOARDING_WELCOME)
    }

    // Fires whenever ApiClient's Authenticator gives up because the refresh
    // token is also dead (see SessionStore.expire()) — redirects to Login
    // from wherever the user happens to be, instead of letting the
    // triggering screen's refresh() throw an uncaught HttpException.
    LaunchedEffect(Unit) {
        AppContainer.sessionStore.sessionExpired.collect {
            navController.navigateAsRoot(NovaDestinations.LOGIN)
            snackbarHostState.showSnackbar(t(StringKey.COMMON_SESSION_EXPIRED))
        }
    }

    // Switches bottom-bar tabs: Inicio stays the root, so Back from any
    // other tab returns to it instead of walking the tab history.
    fun navigateToTab(route: String) {
        navController.navigate(route) {
            popUpTo(NovaDestinations.HOME) { inclusive = false }
            launchSingleTop = true
        }
    }

    fun openAlertTarget(target: AlertTarget) {
        when (target) {
            AlertTarget.PROGRAMADOS -> navController.navigate(NovaDestinations.RECURRING)
            AlertTarget.PLANES_BUDGETS -> navigateToTab(NovaDestinations.budgets(tab = 0))
            AlertTarget.PLANES_GOALS -> navigateToTab(NovaDestinations.budgets(tab = 1))
            AlertTarget.PLANES_LOANS_LENT -> navigateToTab(NovaDestinations.budgets(tab = 2, side = LoanKind.LENT.name))
            AlertTarget.PLANES_LOANS_BORROWED -> navigateToTab(NovaDestinations.budgets(tab = 2, side = LoanKind.BORROWED.name))
        }
    }

    com.s2nova.app.ui.components.AppLockGate {
    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            if (bottomBarVisibleFor(currentRoute)) {
                NovaBottomBar(
                    currentRoute = currentRoute,
                    onNavigate = { route -> navigateToTab(route) },
                    onFabClick = { showAddSheet = true },
                )
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = NovaDestinations.SPLASH,
            modifier = Modifier.padding(padding),
        ) {
            composable(NovaDestinations.SPLASH) {
                SplashScreen()
                LaunchedSplashNavigation(navController)
            }

            composable(NovaDestinations.LOGIN) {
                LoginScreen(
                    onLoginSuccess = { scope.launch { routeAfterAuth() } },
                    onForgotPassword = { navController.navigate(NovaDestinations.FORGOT_PASSWORD) },
                    onGoToRegister = { navController.navigate(NovaDestinations.REGISTER) },
                )
            }
            composable(NovaDestinations.REGISTER) {
                RegisterScreen(
                    onRegisterSuccess = { scope.launch { routeAfterAuth() } },
                    onGoToLogin = { navController.popBackStack() },
                )
            }
            composable(NovaDestinations.FORGOT_PASSWORD) {
                ForgotPasswordScreen(onBackToLogin = { navController.popBackStack() })
            }

            composable(NovaDestinations.ONBOARDING_WELCOME) {
                OnboardingWelcomeScreen(
                    onNext = { navController.navigate(NovaDestinations.ONBOARDING_INCOME) },
                    onSkipAll = { scope.launch { completeOnboarding(); navController.navigateAsRoot(NovaDestinations.HOME) } },
                )
            }
            composable(NovaDestinations.ONBOARDING_INCOME) {
                OnboardingIncomeScreen(
                    state = onboardingFlowState,
                    onNext = { navController.navigate(NovaDestinations.ONBOARDING_WALLET) },
                    onBack = { navController.popBackStack() },
                    onSkip = { navController.navigate(NovaDestinations.ONBOARDING_WALLET) },
                )
            }
            composable(NovaDestinations.ONBOARDING_WALLET) {
                OnboardingWalletScreen(
                    state = onboardingFlowState,
                    onNext = { navController.navigate(NovaDestinations.ONBOARDING_BUDGET) },
                    onBack = { navController.popBackStack() },
                    onSkip = { navController.navigate(NovaDestinations.ONBOARDING_BUDGET) },
                )
            }
            composable(NovaDestinations.ONBOARDING_BUDGET) {
                OnboardingBudgetScreen(
                    state = onboardingFlowState,
                    onNext = { navController.navigate(NovaDestinations.ONBOARDING_TUTORIAL) },
                    onBack = { navController.popBackStack() },
                    onSkip = { navController.navigate(NovaDestinations.ONBOARDING_TUTORIAL) },
                )
            }
            composable(NovaDestinations.ONBOARDING_TUTORIAL) {
                OnboardingTutorialScreen(
                    onFinish = { scope.launch { completeOnboarding(); navController.navigateAsRoot(NovaDestinations.HOME) } },
                    onSkip = { scope.launch { completeOnboarding(); navController.navigateAsRoot(NovaDestinations.HOME) } },
                )
            }

            composable(NovaDestinations.HOME) {
                HomeScreen(
                    onOpenProfile = { navController.navigate(NovaDestinations.PROFILE) },
                    onOpenTransactions = { navigateToTab(NovaDestinations.TRANSACTIONS) },
                    onOpenTransactionDetail = { id -> navController.navigate(NovaDestinations.transactionDetail(id)) },
                    onOpenBudgets = { navigateToTab(NovaDestinations.budgets(tab = 0)) },
                    onOpenRecurring = { navController.navigate(NovaDestinations.RECURRING) },
                    onOpenWallets = { navController.navigate(NovaDestinations.WALLETS) },
                    onOpenAlertTarget = ::openAlertTarget,
                )
            }
            composable(NovaDestinations.TRANSACTIONS) {
                TransactionsScreen(
                    onOpenRecurring = { navController.navigate(NovaDestinations.RECURRING) },
                    onOpenDetail = { id -> navController.navigate(NovaDestinations.transactionDetail(id)) },
                )
            }
            composable(
                NovaDestinations.TRANSACTION_DETAIL,
                arguments = listOf(navArgument("id") { type = androidx.navigation.NavType.StringType }),
            ) { entry ->
                val id = entry.arguments?.getString("id").orEmpty()
                TransactionDetailScreen(
                    transactionId = id,
                    onBack = { navController.popBackStack() },
                    onEdit = { editId -> navController.navigate(NovaDestinations.editTransaction(editId)) },
                    onDeleted = { navController.popBackStack() },
                )
            }
            composable(NovaDestinations.ADD_TRANSACTION) {
                AddTransactionScreen(
                    onSaved = { navController.popBackStack() },
                    onBack = { navController.popBackStack() },
                    onAddWallet = { navController.navigate(NovaDestinations.WALLETS) },
                    onOpenRecurring = { navController.navigate(NovaDestinations.RECURRING) },
                )
            }
            composable(
                NovaDestinations.EDIT_TRANSACTION,
                arguments = listOf(navArgument("id") { type = androidx.navigation.NavType.StringType }),
            ) { entry ->
                val id = entry.arguments?.getString("id").orEmpty()
                AddTransactionScreen(
                    editTransactionId = id,
                    onSaved = { navController.popBackStack() },
                    onBack = { navController.popBackStack() },
                    onAddWallet = { navController.navigate(NovaDestinations.WALLETS) },
                    onOpenRecurring = { navController.navigate(NovaDestinations.RECURRING) },
                )
            }
            composable(NovaDestinations.SCANNER) {
                ScannerScreen(
                    onClose = { navController.popBackStack() },
                    onPurchaseRegistered = { navController.navigateAsRoot(NovaDestinations.HOME) },
                )
            }
            composable(
                NovaDestinations.BUDGETS_ROUTE,
                arguments = listOf(
                    navArgument("tab") { type = androidx.navigation.NavType.IntType; defaultValue = 0 },
                    navArgument("side") { type = androidx.navigation.NavType.StringType; nullable = true; defaultValue = null },
                ),
            ) { entry ->
                PlanesScreen(
                    initialTab = entry.arguments?.getInt("tab") ?: 0,
                    initialLoanSide = entry.arguments?.getString("side")?.let { side -> LoanKind.entries.find { it.name == side } } ?: LoanKind.LENT,
                )
            }
            composable(NovaDestinations.WALLETS) { WalletsScreen(onBack = { navController.popBackStack() }) }
            composable(NovaDestinations.RECURRING) { RecurringScreen(onBack = { navController.popBackStack() }) }
            composable(NovaDestinations.REPORTS) { ReportsScreen() }
            composable(NovaDestinations.PROFILE) {
                ProfileScreen(
                    onBack = { navController.popBackStack() },
                    onOpenSettings = { navController.navigate(NovaDestinations.SETTINGS) },
                    onOpenWallets = { navController.navigate(NovaDestinations.WALLETS) },
                    onOpenRecurring = { navController.navigate(NovaDestinations.RECURRING) },
                    onLogout = {
                        scope.launch {
                            // Demo mode has no switch of its own any more, so
                            // signing out is also the way out of it.
                            if (DemoModeFlag.active) AppContainer.exitDemoMode()
                            AppContainer.authRepository.logout()
                            navController.navigateAsRoot(NovaDestinations.LOGIN)
                        }
                    },
                )
            }
            composable(NovaDestinations.SETTINGS) {
                SettingsScreen(onBack = { navController.popBackStack() })
            }
        }
    }

    if (showAddSheet) {
        AddActionsSheet(
            onDismiss = { showAddSheet = false },
            onAddManually = {
                showAddSheet = false
                navController.navigate(NovaDestinations.ADD_TRANSACTION)
            },
            onScan = {
                showAddSheet = false
                navController.navigate(NovaDestinations.SCANNER)
            },
        )
    }
    }
}

@Composable
private fun LaunchedSplashNavigation(navController: NavHostController) {
    LaunchedEffect(Unit) {
        AppContainer.sessionBootstrapped = true
        kotlinx.coroutines.delay(400)
        val loggedIn = AppContainer.authRepository.bootstrap()
        if (loggedIn) {
            if (AppContainer.demoModeActive.first()) {
                AppContainer.enterDemoMode()
            } else {
                AppContainer.refreshUserData()
            }
        }
        val onboardingDone = AppContainer.onboardingStore.onboardingCompleted.first()
        navController.navigateAsRoot(splashDestinationFor(loggedIn, onboardingDone))
    }
}

// Pure — kept separate from LaunchedSplashNavigation's suspend/NavHost body
// so this routing decision is unit-testable without a NavController.
internal fun splashDestinationFor(loggedIn: Boolean, onboardingDone: Boolean): String = when {
    !loggedIn -> NovaDestinations.LOGIN
    !onboardingDone -> NovaDestinations.ONBOARDING_WELCOME
    else -> NovaDestinations.HOME
}

private fun NavHostController.navigateAsRoot(route: String) {
    navigate(route) {
        popUpTo(0) { inclusive = true }
        launchSingleTop = true
    }
}
