package com.s2nova.app

import android.os.Bundle
import android.view.WindowManager
import androidx.fragment.app.FragmentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.getValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.ThemeController
import com.s2nova.app.ui.components.reportUserInteraction
import com.s2nova.app.ui.nav.NovaApp
import com.s2nova.app.ui.theme.S2NovaTheme
import kotlinx.coroutines.launch

// A FragmentActivity because the biometric prompt ("Ingreso biométrico") needs one.
class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        AppContainer.init(applicationContext)
        installSplashScreen()
        super.onCreate(savedInstanceState)
        // Balances and movements stay out of the recent-apps preview and
        // out of screenshots/screen recordings. Debug builds can opt out for
        // visual checks: `adb shell settings put global s2nova_allow_capture 1`.
        val allowCapture = BuildConfig.DEBUG &&
            android.provider.Settings.Global.getInt(contentResolver, "s2nova_allow_capture", 0) == 1
        if (!allowCapture) window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
        enableEdgeToEdge()
        openSuggestionFrom(intent)
        setContent {
            val darkOverride by ThemeController.darkOverride.collectAsStateWithLifecycle()
            S2NovaTheme(darkTheme = darkOverride ?: isSystemInDarkTheme()) {
                NovaApp()
            }
        }
    }

    // "Cierre automático": remember when the user was last here, for a
    // process that gets killed in the background (AuthRepository.bootstrap()).
    override fun onStop() {
        super.onStop()
        com.s2nova.app.data.notifications.AlertNotifier.appInForeground = false
        AppContainer.appScope.launch { AppContainer.idleTimeoutStore.persist() }
    }

    override fun onStart() {
        super.onStart()
        com.s2nova.app.data.notifications.AlertNotifier.appInForeground = true
    }

    // A "¿Registrar…?" notification opens Nuevo movimiento with it.
    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        openSuggestionFrom(intent)
    }

    private fun openSuggestionFrom(intent: android.content.Intent?) {
        intent?.getStringExtra(com.s2nova.app.data.notifications.NotificationCapture.EXTRA_SUGGESTION)?.let {
            com.s2nova.app.data.notifications.SuggestionLaunch.request(it)
            com.s2nova.app.data.notifications.NotificationCapture.cancel(it)
            intent.removeExtra(com.s2nova.app.data.notifications.NotificationCapture.EXTRA_SUGGESTION)
        }
    }

    // "Cierre automático" counts any touch or key press as activity.
    override fun onUserInteraction() {
        super.onUserInteraction()
        reportUserInteraction()
    }
}
