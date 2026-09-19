package com.s2nova.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.zIndex
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberStrings
import kotlinx.coroutines.launch

// Enforces UserPreferences.autoLockMinutes: records a timestamp whenever
// the single Activity stops (backgrounded, screen off, task-switched away
// from), and on the next start compares elapsed time against the
// preference, showing a full-screen password challenge above the whole
// nav graph when it's exceeded. `0` means "Nunca" (disabled); a user with
// no password set (Google-only, hasPassword == false) is never locked,
// since there would be no way back in — see AGENTS.md's Stage 7c note on
// scoping this to password-only re-entry (no biometric prompt wired up
// yet, since biometricLogin itself has no enforcement anywhere in the app
// today either).
@Composable
fun AppLockGate(content: @Composable () -> Unit) {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    var locked by remember { mutableStateOf(false) }

    DisposableEffect(lifecycleOwner, user?.id) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_STOP -> {
                    scope.launch { AppContainer.idleTimeoutStore.recordInteractionNow() }
                }
                Lifecycle.Event.ON_START -> {
                    val minutes = user?.preferences?.autoLockMinutes ?: 0
                    val canLock = user != null && user?.hasPassword == true && minutes > 0
                    if (canLock) {
                        scope.launch {
                            val elapsed = AppContainer.idleTimeoutStore.millisSinceLastInteraction()
                            if (elapsed != null && elapsed >= minutes * 60_000L) {
                                locked = true
                            }
                        }
                    }
                }
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    content()

    if (locked) {
        LockOverlay(
            onUnlock = {
                locked = false
                scope.launch { AppContainer.idleTimeoutStore.recordInteractionNow() }
            },
        )
    }
}

@Composable
private fun LockOverlay(onUnlock: () -> Unit) {
    val t = rememberStrings()
    val scope = rememberCoroutineScope()
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var checking by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .zIndex(100f)
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(t(StringKey.APP_LOCK_TITLE), style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onBackground)
            Text(
                t(StringKey.APP_LOCK_SUBTITLE),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp, bottom = 20.dp),
            )
            OutlinedTextField(
                value = password,
                onValueChange = { password = it; error = null },
                label = { Text(t(StringKey.SETTINGS_CURRENT_PASSWORD)) },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
            )
            if (error != null) {
                Text(error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp))
            }
            Button(
                enabled = !checking && password.isNotBlank(),
                onClick = {
                    checking = true
                    scope.launch {
                        val ok = runCatching { AppContainer.authRepository.verifyPassword(password) }.getOrDefault(false)
                        checking = false
                        if (ok) onUnlock() else error = t(StringKey.APP_LOCK_ERROR)
                    }
                },
                modifier = Modifier.fillMaxWidth().padding(top = 20.dp),
            ) {
                if (checking) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp))
                } else {
                    Text(t(StringKey.APP_LOCK_UNLOCK))
                }
            }
        }
    }
}
