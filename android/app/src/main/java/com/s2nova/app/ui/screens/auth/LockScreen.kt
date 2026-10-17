package com.s2nova.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.BuildConfig
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.local.LockedAccount
import com.s2nova.app.data.remote.toUserMessage
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.GoogleSignInButton
import com.s2nova.app.ui.components.NovaPrimaryButton
import com.s2nova.app.ui.components.NovaTextField
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.components.biometricsAvailable
import com.s2nova.app.ui.components.confirmBiometric
import com.s2nova.app.ui.components.findFragmentActivity
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.NovaType
import com.s2nova.app.ui.theme.appCanvas
import com.s2nova.app.ui.tr
import kotlinx.coroutines.launch

// After "Cierre automático": only the account that was signed in can come
// back — its password (or Google, for an account that signs in with
// Google), or the fingerprint when "Ingreso biométrico" is on — and "Cerrar
// sesión" forgets it and goes to Login, where Crear cuenta is.
@Composable
fun LockScreen(onUnlocked: () -> Unit, onSignOut: () -> Unit) {
    val account by AppContainer.authRepository.lockedAccount.collectAsStateWithLifecycle(initialValue = null)
    val locked = account
    LaunchedEffect(Unit) {
        // Nothing locked (cleared from elsewhere): Login instead.
        if (AppContainer.authRepository.lockedAccountOnce() == null) onSignOut()
    }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .appCanvas(MaterialTheme.colorScheme.background)
            .padding(horizontal = 24.dp),
    ) {
        if (locked != null) LockContent(locked, onUnlocked, onSignOut)
    }
}

@Composable
private fun androidx.compose.foundation.layout.ColumnScope.LockContent(account: LockedAccount, onUnlocked: () -> Unit, onSignOut: () -> Unit) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val colors = NovaColors.current
    val repo = AppContainer.authRepository
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var googleBusy by remember { mutableStateOf(false) }

    // The fingerprint only when this phone's credential is this account's.
    val enrolled by repo.biometricEnrolled.collectAsStateWithLifecycle(initialValue = false)
    var biometricOwner by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(enrolled) { biometricOwner = AppContainer.biometricStore.userId() }
    val canUseBiometric = enrolled && biometricOwner == account.userId && biometricsAvailable(context)

    suspend fun finish(result: Result<Unit>, fallback: String) {
        if (result.isSuccess) {
            AppContainer.refreshUserData()
            onUnlocked()
        } else {
            error = result.exceptionOrNull()?.toUserMessage(fallback) ?: fallback
        }
    }

    val biometricUnlock: () -> Unit = {
        scope.launch {
            val activity = context.findFragmentActivity() ?: return@launch
            val cipher = AppContainer.biometricStore.decryptCipher()
            if (cipher == null) {
                error = tr(StringKey.BIO_LOGIN_ERR)
                return@launch
            }
            val unlocked = activity.confirmBiometric(
                tr(StringKey.BIO_PROMPT_TITLE), tr(StringKey.BIO_PROMPT_LOGIN), tr(StringKey.BIO_PROMPT_CANCEL), cipher,
            ) ?: return@launch
            busy = true
            error = null
            finish(repo.unlock { repo.loginWithBiometric(unlocked) }, tr(StringKey.BIO_LOGIN_ERR))
            busy = false
        }
    }
    // The prompt opens by itself once, like on Login.
    var autoPrompted by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(canUseBiometric) {
        if (canUseBiometric && !autoPrompted) {
            autoPrompted = true
            biometricUnlock()
        }
    }

    Spacer(Modifier.height(28.dp))
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.size(48.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary),
        ) {
            Text(initialsOf(account.name), style = NovaType.label, color = MaterialTheme.colorScheme.onPrimary)
        }
        Column(Modifier.weight(1f)) {
            Text(account.name, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(account.email, style = NovaType.bodySm, color = colors.loginTextMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
    Spacer(Modifier.height(20.dp))
    Text(
        tr(StringKey.LOCK_TITLE),
        fontSize = 28.sp,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = (-0.03).em,
        lineHeight = 34.sp,
        color = MaterialTheme.colorScheme.onBackground,
    )
    Text(
        tr(if (account.hasPassword) StringKey.LOCK_SUB_PASSWORD else StringKey.LOCK_SUB_GOOGLE),
        fontSize = 14.sp,
        color = colors.loginTextMuted,
        modifier = Modifier.padding(top = 7.dp),
    )
    Spacer(Modifier.height(20.dp))

    Column(
        modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        if (account.hasPassword) {
            NovaTextField(
                value = password,
                onValueChange = { password = it; error = null },
                label = tr(StringKey.AUTH_PASSWORD),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                isPassword = true,
                passwordVisible = showPassword,
                onTogglePasswordVisible = { showPassword = !showPassword },
            )
        }
        if (error != null) Text(error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        if (account.hasPassword) {
            NovaPrimaryButton(
                text = tr(StringKey.LOCK_UNLOCK),
                enabled = !busy && password.isNotEmpty(),
                loading = busy,
                onClick = {
                    busy = true
                    error = null
                    scope.launch {
                        finish(repo.unlock { repo.login(account.email, password) }, tr(StringKey.AUTH_BAD_CREDENTIALS))
                        busy = false
                    }
                },
            )
        }
        if (canUseBiometric) {
            val shape = RoundedCornerShape(12.dp)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .alpha(if (busy) 0.38f else 1f)
                    .clip(shape)
                    .border(1.dp, colors.borderInput, shape)
                    .clickable(enabled = !busy, role = Role.Button, onClick = biometricUnlock),
                horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                V2Icon(V2Icons.fingerprint, MaterialTheme.colorScheme.onBackground, 20.dp)
                Text(tr(StringKey.LOCK_BIOMETRIC), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, softWrap = false)
            }
        }
        if (account.hasGoogle && BuildConfig.GOOGLE_WEB_CLIENT_ID.isNotBlank()) {
            if (account.hasPassword || canUseBiometric) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    HorizontalDivider(modifier = Modifier.weight(1f))
                    Text(
                        text = tr(StringKey.AUTH_OR),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 0.08.em,
                        color = colors.loginTextMuted,
                        modifier = Modifier.padding(horizontal = 12.dp),
                    )
                    HorizontalDivider(modifier = Modifier.weight(1f))
                }
            }
            GoogleSignInButton(
                enabled = !googleBusy && !busy,
                loading = googleBusy,
                onClick = {
                    googleBusy = true
                    error = null
                    scope.launch {
                        GoogleAuthHelper.getIdToken(context, BuildConfig.GOOGLE_WEB_CLIENT_ID)
                            .fold(
                                onSuccess = { idToken -> finish(repo.unlock { repo.loginWithGoogle(idToken) }, tr(StringKey.AUTH_GOOGLE_ERR)) },
                                onFailure = { error = GoogleAuthHelper.failureMessage(it) { it.toUserMessage(tr(StringKey.AUTH_GOOGLE_ERR)) } },
                            )
                        googleBusy = false
                    }
                },
            )
        }
    }

    // "Cerrar sesión": forget this account and go to Login.
    val shape = RoundedCornerShape(12.dp)
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp)
            .clip(shape)
            .border(1.dp, colors.borderInput, shape)
            .clickable(enabled = !busy, role = Role.Button) {
                scope.launch {
                    repo.forgetLockedAccount()
                    onSignOut()
                }
            },
    ) {
        Text(tr(StringKey.LOCK_SIGN_OUT), style = NovaType.label, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, softWrap = false)
    }
    Text(
        tr(StringKey.LOCK_SIGN_OUT_HINT),
        style = NovaType.bodySm,
        color = colors.loginTextMuted,
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 24.dp),
        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
    )
}

internal fun initialsOf(name: String): String =
    name.trim().split(Regex("\\s+")).filter { it.isNotBlank() }.take(2)
        .joinToString("") { it.first().uppercase() }.ifBlank { "S2" }
