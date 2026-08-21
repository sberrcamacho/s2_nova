package com.s2nova.app.ui.nav

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
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
import com.s2nova.app.ui.components.AddActionsSheet
import com.s2nova.app.ui.screens.addtransaction.AddTransactionScreen
import com.s2nova.app.ui.screens.auth.ForgotPasswordScreen
import com.s2nova.app.ui.screens.auth.LoginScreen
import com.s2nova.app.ui.screens.auth.RegisterScreen
import com.s2nova.app.ui.screens.budgets.BudgetsScreen
import com.s2nova.app.ui.screens.home.HomeScreen
import com.s2nova.app.ui.screens.loans.LoansScreen
import com.s2nova.app.ui.screens.notifications.NotificationsScreen
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

    // Where a freshly authenticated session lands: onboarding for a user
    // who hasn't completed it yet (fresh register, or an existing account
    // whose local onboarding flag isn't set on this device), Home
    // otherwise. See AuthRepository.fetchAndSyncMe for how the local flag
    // stays in sync with the backend's.
    suspend fun routeAfterAuth() {
        val done = AppContainer.onboardingStore.onboardingCompleted.first()
        navController.navigateAsRoot(if (done) NovaDestinations.HOME else NovaDestinations.ONBOARDING_WELCOME)
    }

    Scaffold(
        bottomBar = {
            if (bottomBarVisibleFor(currentRoute)) {
                NovaBottomBar(
                    currentRoute = currentRoute,
                    onNavigate = { route ->
                        navController.navigate(route) {
                            popUpTo(NovaDestinations.HOME) { inclusive = false }
                            launchSingleTop = true
                        }
                    },
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
                    onOpenNotifications = { navController.navigate(NovaDestinations.NOTIFICATIONS) },
                    onOpenProfile = { navController.navigate(NovaDestinations.PROFILE) },
                    onOpenTransactions = { navController.navigate(NovaDestinations.TRANSACTIONS) },
                )
            }
            composable(NovaDestinations.TRANSACTIONS) {
                TransactionsScreen(
                    onBack = { navController.popBackStack() },
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
            composable(NovaDestinations.BUDGETS) { BudgetsScreen() }
            composable(NovaDestinations.WALLETS) { WalletsScreen(onBack = { navController.popBackStack() }) }
            composable(NovaDestinations.RECURRING) { RecurringScreen(onBack = { navController.popBackStack() }) }
            composable(NovaDestinations.LOANS) { LoansScreen(onBack = { navController.popBackStack() }) }
            composable(NovaDestinations.REPORTS) { ReportsScreen() }
            composable(NovaDestinations.NOTIFICATIONS) {
                NotificationsScreen(onBack = { navController.popBackStack() })
            }
            composable(NovaDestinations.PROFILE) {
                ProfileScreen(
                    onOpenSettings = { navController.navigate(NovaDestinations.SETTINGS) },
                    onOpenWallets = { navController.navigate(NovaDestinations.WALLETS) },
                    onOpenRecurring = { navController.navigate(NovaDestinations.RECURRING) },
                    onOpenLoans = { navController.navigate(NovaDestinations.LOANS) },
                    onLogout = {
                        scope.launch {
                            AppContainer.authRepository.logout()
                            navController.navigateAsRoot(NovaDestinations.LOGIN)
                        }
                    },
                    onShowComingSoon = { },
                )
            }
            composable(NovaDestinations.SETTINGS) {
                SettingsScreen(
                    onBack = { navController.popBackStack() },
                    onReplayTutorial = {
                        scope.launch {
                            AppContainer.onboardingStore.resetTutorial()
                            navController.navigateAsRoot(NovaDestinations.ONBOARDING_TUTORIAL)
                        }
                    },
                )
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

@Composable
private fun LaunchedSplashNavigation(navController: NavHostController) {
    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(400)
        val loggedIn = AppContainer.authRepository.bootstrap()
        if (loggedIn) {
            AppContainer.refreshUserData()
        }
        val onboardingDone = AppContainer.onboardingStore.onboardingCompleted.first()
        val target = when {
            !loggedIn -> NovaDestinations.LOGIN
            !onboardingDone -> NovaDestinations.ONBOARDING_WELCOME
            else -> NovaDestinations.HOME
        }
        navController.navigateAsRoot(target)
    }
}

private fun NavHostController.navigateAsRoot(route: String) {
    navigate(route) {
        popUpTo(0) { inclusive = true }
        launchSingleTop = true
    }
}
