package com.s2nova.app.ui.screens.splash

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.R
import com.s2nova.app.data.ThemeController

@Composable
fun SplashScreen() {
    val darkOverride by ThemeController.darkOverride.collectAsStateWithLifecycle()
    val isDark = darkOverride ?: isSystemInDarkTheme()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Image(
                painter = painterResource(if (isDark) R.drawable.splash_icon_dark else R.drawable.splash_icon_light),
                contentDescription = null,
                modifier = Modifier.size(72.dp),
            )
            CircularProgressIndicator(
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .padding(top = 24.dp)
                    .size(28.dp),
                strokeWidth = 3.dp,
            )
        }
    }
}
