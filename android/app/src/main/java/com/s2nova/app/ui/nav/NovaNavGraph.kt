package com.s2nova.app.ui.nav

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import com.s2nova.app.ui.screens.notifications.NotificationsScreen
import com.s2nova.app.ui.screens.profile.ProfileScreen
import com.s2nova.app.ui.screens.reports.ReportsScreen
import com.s2nova.app.ui.screens.scanner.ScannerScreen
import com.s2nova.app.ui.screens.settings.SettingsScreen
import com.s2nova.app.ui.screens.splash.SplashScreen
import com.s2nova.app.ui.screens.transactions.TransactionDetailScreen
import com.s2nova.app.ui.screens.transactions.TransactionsScreen

@Composable
fun NovaApp() {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    var showAddSheet by remember { mutableStateOf(false) }

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
                    onLoginSuccess = { navController.navigateAsRoot(NovaDestinations.HOME) },
                    onForgotPassword = { navController.navigate(NovaDestinations.FORGOT_PASSWORD) },
                    onGoToRegister = { navController.navigate(NovaDestinations.REGISTER) },
                )
            }
            composable(NovaDestinations.REGISTER) {
                RegisterScreen(
                    onRegisterSuccess = { navController.navigateAsRoot(NovaDestinations.HOME) },
                    onGoToLogin = { navController.popBackStack() },
                )
            }
            composable(NovaDestinations.FORGOT_PASSWORD) {
                ForgotPasswordScreen(onBackToLogin = { navController.popBackStack() })
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
                )
            }
            composable(NovaDestinations.SCANNER) {
                ScannerScreen(
                    onClose = { navController.popBackStack() },
                    onPurchaseRegistered = { navController.navigateAsRoot(NovaDestinations.HOME) },
                )
            }
            composable(NovaDestinations.BUDGETS) { BudgetsScreen() }
            composable(NovaDestinations.REPORTS) { ReportsScreen() }
            composable(NovaDestinations.NOTIFICATIONS) {
                NotificationsScreen(onBack = { navController.popBackStack() })
            }
            composable(NovaDestinations.PROFILE) {
                ProfileScreen(
                    onOpenSettings = { navController.navigate(NovaDestinations.SETTINGS) },
                    onLogout = {
                        AppContainer.authRepository.logout()
                        navController.navigateAsRoot(NovaDestinations.LOGIN)
                    },
                    onShowComingSoon = { },
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

@Composable
private fun LaunchedSplashNavigation(navController: NavHostController) {
    androidx.compose.runtime.LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(400)
        val loggedIn = AppContainer.authRepository.currentUser.value != null
        navController.navigateAsRoot(if (loggedIn) NovaDestinations.HOME else NovaDestinations.LOGIN)
    }
}

private fun NavHostController.navigateAsRoot(route: String) {
    navigate(route) {
        popUpTo(0) { inclusive = true }
        launchSingleTop = true
    }
}
