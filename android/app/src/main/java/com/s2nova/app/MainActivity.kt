package com.s2nova.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.ThemeController
import com.s2nova.app.ui.nav.NovaApp
import com.s2nova.app.ui.theme.S2NovaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val darkOverride by ThemeController.darkOverride.collectAsStateWithLifecycle()
            S2NovaTheme(darkTheme = darkOverride ?: isSystemInDarkTheme()) {
                NovaApp()
            }
        }
    }
}
