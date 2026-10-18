package com.s2nova.app.ui.screens.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.isImeVisible
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.BuildConfig
import com.s2nova.app.R
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.ThemeController
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
    Box(
        modifier = Modifier
            .fillMaxSize()
            .appCanvas(MaterialTheme.colorScheme.background),
    ) {
        if (locked != null) LockContent(locked, onUnlocked, onSignOut)
    }
}

@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
private fun LockContent(account: LockedAccount, onUnlocked: () -> Unit, onSignOut: () -> Unit) {
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

    // Nequi-like: the brand mark on top, who is locked in the middle, and the
    // ways back in at the bottom, within reach of the thumb. The column
    // scrolls when the keyboard or a large font leaves no room.
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val minHeight = maxHeight
        val scroll = rememberScrollState()
        // With the keyboard up the actions, not the greeting, stay in view.
        val imeVisible = WindowInsets.isImeVisible
        LaunchedEffect(imeVisible, scroll.maxValue) {
            if (imeVisible) scroll.animateScrollTo(scroll.maxValue)
        }
        Column(Modifier.fillMaxSize().verticalScroll(scroll)) {
            Column(
                modifier = Modifier.fillMaxWidth().heightIn(min = minHeight).padding(horizontal = 24.dp),
                verticalArrangement = Arrangement.SpaceBetween,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Image(
                    painter = painterResource(if (isDarkTheme()) R.drawable.logo_mark_dark else R.drawable.logo_mark_light),
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.padding(top = 24.dp).size(40.dp).clip(RoundedCornerShape(12.dp)),
                )

                LockIdentity(account, Modifier.padding(vertical = 32.dp))

                Column(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    LockActions(
                        account = account,
                        password = password,
                        onPasswordChange = { password = it; error = null },
                        showPassword = showPassword,
                        onToggleShowPassword = { showPassword = !showPassword },
                        error = error,
                        busy = busy,
                        googleBusy = googleBusy,
                        canUseBiometric = canUseBiometric,
                        onUnlock = {
                            busy = true
                            error = null
                            scope.launch {
                                finish(repo.unlock { repo.login(account.email, password) }, tr(StringKey.AUTH_BAD_CREDENTIALS))
                                busy = false
                            }
                        },
                        onBiometric = biometricUnlock,
                        onGoogle = {
                            googleBusy = true
                            error = null
                            scope.launch {
                                GoogleAuthHelper.getIdToken(context, BuildConfig.GOOGLE_WEB_CLIENT_ID)
                                    .fold(
                                        onSuccess = { idToken -> finish(repo.unlockWithGoogle(idToken), tr(StringKey.AUTH_GOOGLE_ERR)) },
                                        onFailure = { error = GoogleAuthHelper.failureMessage(it) { it.toUserMessage(tr(StringKey.AUTH_GOOGLE_ERR)) } },
                                    )
                                googleBusy = false
                            }
                        },
                    )

                    // "¿No eres Laura? Cerrar sesión": forget this account and go to Login.
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 48.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .clickable(enabled = !busy, role = Role.Button) {
                                scope.launch {
                                    repo.forgetLockedAccount()
                                    onSignOut()
                                }
                            },
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            buildAnnotatedString {
                                withStyle(SpanStyle(color = colors.loginTextMuted)) { append(tr(StringKey.LOCK_NOT_YOU, firstNameOf(account.name))) }
                                append(" ")
                                withStyle(SpanStyle(color = colors.link, fontWeight = FontWeight.SemiBold)) { append(tr(StringKey.LOCK_SIGN_OUT)) }
                            },
                            style = NovaType.bodySm,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }
    }
}

// The avatar with its lock badge, the greeting and the reason for the lock.
@Composable
private fun LockIdentity(account: LockedAccount, modifier: Modifier = Modifier) {
    val bg = MaterialTheme.colorScheme.background
    Column(modifier = modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(96.dp)) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.size(88.dp).align(Alignment.Center).clip(CircleShape).background(MaterialTheme.colorScheme.primary),
            ) {
                Text(initialsOf(account.name), fontSize = 30.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onPrimary)
            }
            // The lock reads as "Sesión bloqueada" to a screen reader.
            val lockedLabel = tr(StringKey.LOCK_TITLE)
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(bg)
                    .padding(3.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer)
                    .semantics { contentDescription = lockedLabel },
            ) {
                V2Icon(V2Icons.lock, MaterialTheme.colorScheme.onPrimaryContainer, 16.dp, strokeWidth = 2.1f)
            }
        }
        Spacer(Modifier.height(20.dp))
        Text(
            tr(StringKey.LOCK_GREETING, firstNameOf(account.name)),
            fontSize = 28.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = (-0.03).em,
            lineHeight = 34.sp,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.semantics { heading() },
        )
        Text(
            account.email,
            style = NovaType.bodySm,
            color = NovaColors.current.loginTextMuted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 4.dp),
        )
        Text(
            tr(if (account.hasPassword) StringKey.LOCK_SUB_PASSWORD else StringKey.LOCK_SUB_GOOGLE),
            style = NovaType.bodySm,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 16.dp).widthIn(max = 320.dp),
        )
    }
}

// Password + Desbloquear, with the fingerprint beside it like Nequi's
// keypad; Google under an "O" divider for accounts that have it.
@Composable
private fun LockActions(
    account: LockedAccount,
    password: String,
    onPasswordChange: (String) -> Unit,
    showPassword: Boolean,
    onToggleShowPassword: () -> Unit,
    error: String?,
    busy: Boolean,
    googleBusy: Boolean,
    canUseBiometric: Boolean,
    onUnlock: () -> Unit,
    onBiometric: () -> Unit,
    onGoogle: () -> Unit,
) {
    val colors = NovaColors.current
    if (account.hasPassword) {
        NovaTextField(
            value = password,
            onValueChange = onPasswordChange,
            label = tr(StringKey.AUTH_PASSWORD),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            isPassword = true,
            passwordVisible = showPassword,
            onTogglePasswordVisible = onToggleShowPassword,
        )
    }
    if (error != null) Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
    if (account.hasPassword) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            NovaPrimaryButton(
                text = tr(StringKey.LOCK_UNLOCK),
                enabled = !busy && password.isNotEmpty(),
                loading = busy,
                onClick = onUnlock,
                modifier = Modifier.weight(1f),
            )
            if (canUseBiometric) {
                val label = tr(StringKey.LOCK_BIOMETRIC)
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(56.dp)
                        .alpha(if (busy) 0.38f else 1f)
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.primaryContainer)
                        .border(1.dp, colors.primaryBorder, RoundedCornerShape(12.dp))
                        .clickable(enabled = !busy, role = Role.Button, onClick = onBiometric)
                        .semantics { contentDescription = label },
                ) {
                    V2Icon(V2Icons.fingerprint, MaterialTheme.colorScheme.onPrimaryContainer, 26.dp)
                }
            }
        }
    } else if (canUseBiometric) {
        // A Google-only account: the fingerprint is a full-width button.
        val shape = RoundedCornerShape(12.dp)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .alpha(if (busy) 0.38f else 1f)
                .clip(shape)
                .background(MaterialTheme.colorScheme.primaryContainer)
                .border(1.dp, colors.primaryBorder, shape)
                .clickable(enabled = !busy, role = Role.Button, onClick = onBiometric),
            horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            V2Icon(V2Icons.fingerprint, MaterialTheme.colorScheme.onPrimaryContainer, 22.dp)
            Text(tr(StringKey.LOCK_BIOMETRIC), style = NovaType.label, color = MaterialTheme.colorScheme.onPrimaryContainer, maxLines = 1, softWrap = false, overflow = TextOverflow.Ellipsis)
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
        GoogleSignInButton(enabled = !googleBusy && !busy, loading = googleBusy, onClick = onGoogle)
    }
}

@Composable
private fun isDarkTheme(): Boolean {
    val override by ThemeController.darkOverride.collectAsStateWithLifecycle()
    return override ?: isSystemInDarkTheme()
}

internal fun firstNameOf(name: String): String = name.trim().substringBefore(" ")

internal fun initialsOf(name: String): String =
    name.trim().split(Regex("\\s+")).filter { it.isNotBlank() }.take(2)
        .joinToString("") { it.first().uppercase() }.ifBlank { "S2" }
