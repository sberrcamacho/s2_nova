package com.s2nova.app.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.lifecycle.Lifecycle
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.repeatOnLifecycle
import com.s2nova.app.data.AppContainer
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val CHECK_EVERY_MS = 15_000L
private const val HEARTBEAT_EVERY_MS = 60_000L

@Volatile private var lastHeartbeatAt = 0L

// Every touch of the app counts as activity (MainActivity.onUserInteraction,
// plus bottom sheets, which live in their own window). While the user is
// active the server hears about it at most once a minute, so its own idle
// check (backend lib/sessions.ts) leaves the session alone.
fun reportUserInteraction() {
    val now = System.currentTimeMillis()
    AppContainer.idleTimeoutStore.touch(now)
    // Only a signed-in, real session has anything to report (touches on
    // Login mustn't use up the minute).
    val reportable = AppContainer.authRepository.currentUser.value != null && !com.s2nova.app.data.repository.DemoModeFlag.active
    if (reportable && now - lastHeartbeatAt >= HEARTBEAT_EVERY_MS) {
        lastHeartbeatAt = now
        AppContainer.appScope.launch { AppContainer.authRepository.reportActivity() }
    }
}

// For content in a separate window (sheets, dialogs): taps there don't
// reach MainActivity.onUserInteraction.
fun Modifier.countsAsActivity(): Modifier = pointerInput(Unit) {
    awaitPointerEventScope {
        while (true) {
            awaitPointerEvent(PointerEventPass.Initial)
            reportUserInteraction()
        }
    }
}

// "Cierre automático" (Ajustes): after the chosen minutes without the user
// touching the app, sign out for real — the server revokes the session and
// this device forgets its tokens — and go to Login. Checked while the app
// is in the foreground and again the moment it comes back, so rotating the
// screen or leaving and reopening the app doesn't dodge it; a restart after
// the process was killed is caught by AuthRepository.bootstrap(), from the
// time MainActivity.onStop persisted. Applies to
// Google-only accounts and to guest mode as well.
@Composable
fun IdleLogoutEffect() {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val minutes = user?.preferences?.autoLockMinutes ?: 0
    val lifecycleOwner = LocalLifecycleOwner.current
    val signedIn = user != null

    LaunchedEffect(signedIn, minutes, lifecycleOwner) {
        if (!signedIn || minutes <= 0) return@LaunchedEffect
        val limit = minutes * 60_000L
        lifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
            while (true) {
                if (AppContainer.idleTimeoutStore.idleMillis() >= limit) {
                    AppContainer.authRepository.logoutForIdle()
                    return@repeatOnLifecycle
                }
                // Also saved here, not only in MainActivity.onStop, for a
                // process that dies without stopping (crash, update).
                AppContainer.idleTimeoutStore.persist()
                delay(CHECK_EVERY_MS)
            }
        }
    }

}
