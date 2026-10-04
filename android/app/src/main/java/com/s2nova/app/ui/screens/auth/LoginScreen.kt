package com.s2nova.app.ui.screens.auth

import com.s2nova.app.ui.theme.appCanvas
import com.s2nova.app.ui.components.biometricsAvailable
import com.s2nova.app.ui.components.confirmBiometric
import com.s2nova.app.ui.components.findFragmentActivity
import androidx.compose.ui.draw.alpha
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.foundation.border
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.offset
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.BuildConfig
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.ThemeController
import com.s2nova.app.data.remote.toUserMessage
import com.s2nova.app.ui.components.GoogleSignInButton
import com.s2nova.app.ui.components.NovaPrimaryButton
import com.s2nova.app.ui.components.NovaTextField
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch
import com.s2nova.app.ui.tr
import com.s2nova.app.ui.StringKey

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onForgotPassword: () -> Unit,
    onGoToRegister: () -> Unit,
    onGuest: () -> Unit = {},
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var googleLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val colors = NovaColors.current
    val darkOverride by ThemeController.darkOverride.collectAsStateWithLifecycle()
    val isDark = darkOverride ?: isSystemInDarkTheme()

    // "Ingreso biométrico": offered when this phone holds a credential. The
    // prompt opens by itself once on arriving here; the button repeats it.
    val biometricEnrolled by AppContainer.authRepository.biometricEnrolled.collectAsStateWithLifecycle(initialValue = false)
    val canUseBiometric = biometricEnrolled && biometricsAvailable(context)
    var biometricLoading by remember { mutableStateOf(false) }
    val biometricLogin: () -> Unit = {
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
            biometricLoading = true
            error = null
            AppContainer.authRepository.loginWithBiometric(unlocked)
                .onSuccess {
                    AppContainer.refreshUserData()
                    biometricLoading = false
                    onLoginSuccess()
                }
                .onFailure {
                    biometricLoading = false
                    error = it.toUserMessage(tr(StringKey.BIO_LOGIN_ERR))
                }
        }
    }
    var autoPrompted by androidx.compose.runtime.saveable.rememberSaveable { mutableStateOf(false) }
    androidx.compose.runtime.LaunchedEffect(canUseBiometric) {
        if (canUseBiometric && !autoPrompted) {
            autoPrompted = true
            biometricLogin()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .appCanvas(MaterialTheme.colorScheme.background)
            .padding(horizontal = 24.dp),
    ) {
        Spacer(modifier = Modifier.height(28.dp))

        // Header
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            AuthLogo()
            Column {
                Text(
                    text = tr(StringKey.AUTH_LOGIN_TITLE),
                    fontSize = 28.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = (-0.03).em,
                    lineHeight = 34.sp,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Text(
                    text = tr(StringKey.AUTH_LOGIN_SUB),
                    fontSize = 14.sp,
                    color = colors.loginTextMuted,
                    modifier = Modifier.padding(top = 7.dp),
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Scrollable middle: fields + actions, so the footer stays pinned near
        // the bottom on tall screens without breaking small-screen scrolling.
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                NovaTextField(
                    value = email,
                    onValueChange = { email = it; error = null },
                    label = tr(StringKey.AUTH_EMAIL),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                )
                NovaTextField(
                    value = password,
                    onValueChange = { password = it; error = null },
                    label = tr(StringKey.AUTH_PASSWORD),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    isPassword = true,
                    passwordVisible = showPassword,
                    onTogglePasswordVisible = { showPassword = !showPassword },
                )

                if (error != null) {
                    Text(error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }

                Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = tr(StringKey.AUTH_FORGOT),
                        style = com.s2nova.app.ui.theme.NovaType.label,
                        // `link`, not `primary`: primary is 2.5:1 on the dark background.
                        color = colors.link,
                        modifier = Modifier
                            .clickable(role = androidx.compose.ui.semantics.Role.Button, onClick = onForgotPassword)
                            .padding(vertical = 14.dp),
                    )
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                NovaPrimaryButton(
                    text = tr(StringKey.AUTH_ENTER),
                    onClick = {
                        loading = true
                        scope.launch {
                            AppContainer.authRepository.login(email, password)
                                .onSuccess {
                                    AppContainer.refreshUserData()
                                    loading = false
                                    onLoginSuccess()
                                }
                                .onFailure {
                                    loading = false
                                    error = it.toUserMessage(tr(StringKey.AUTH_BAD_CREDENTIALS))
                                }
                        }
                    },
                    enabled = !loading,
                    loading = loading,
                )

                if (canUseBiometric) {
                    // Secondary button (§6.3).
                    val shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .alpha(if (biometricLoading) 0.38f else 1f)
                            .clip(shape)
                            .border(1.dp, colors.borderInput, shape)
                            .clickable(enabled = !biometricLoading, role = androidx.compose.ui.semantics.Role.Button, onClick = biometricLogin),
                        horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        com.s2nova.app.ui.components.V2Icon(com.s2nova.app.ui.components.V2Icons.fingerprint, MaterialTheme.colorScheme.onBackground, 20.dp)
                        Text(tr(StringKey.AUTH_BIOMETRIC_ENTER), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, softWrap = false)
                    }
                }

                if (BuildConfig.GOOGLE_WEB_CLIENT_ID.isNotBlank()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
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

                    GoogleSignInButton(
                        onClick = {
                            googleLoading = true
                            error = null
                            scope.launch {
                                GoogleAuthHelper.getIdToken(context, BuildConfig.GOOGLE_WEB_CLIENT_ID)
                                    .mapCatching { idToken -> AppContainer.authRepository.loginWithGoogle(idToken).getOrThrow() }
                                    .onSuccess {
                                        AppContainer.refreshUserData()
                                        googleLoading = false
                                        onLoginSuccess()
                                    }
                                    .onFailure {
                                        googleLoading = false
                                        error = if (it is androidx.credentials.exceptions.GetCredentialCancellationException) {
                                            null
                                        } else {
                                            it.toUserMessage(tr(StringKey.AUTH_GOOGLE_ERR))
                                        }
                                    }
                            }
                        },
                        enabled = !googleLoading,
                        loading = googleLoading,
                    )
                }

                // "Continuar como invitado" (ONBOARDING.md §1).
                androidx.compose.foundation.layout.Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .clip(androidx.compose.foundation.shape.RoundedCornerShape(12.dp))
                        .border(1.dp, com.s2nova.app.ui.theme.NovaColors.current.borderInput, androidx.compose.foundation.shape.RoundedCornerShape(12.dp))
                        .clickable(onClick = onGuest),
                    horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(10.dp, androidx.compose.ui.Alignment.CenterHorizontally),
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                ) {
                    com.s2nova.app.ui.components.V2Icon(com.s2nova.app.ui.components.V2Icons.enter, MaterialTheme.colorScheme.onSurfaceVariant, 18.dp)
                    Text(tr(StringKey.AUTH_GUEST), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground)
                }
                Text(
                    tr(StringKey.AUTH_GUEST_HINT),
                    fontSize = 12.sp,
                    color = colors.textDim,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    // margin-top: -6px under the button.
                    modifier = Modifier.fillMaxWidth().offset(y = (-6).dp),
                )
            }
        }

        // Footer — pinned near the bottom (the weighted scrollable column above
        // pushes this down), mirroring the mockup's `margin-top:auto` footer.
        // No decorative home-indicator bar here — that was the mockup faking
        // phone chrome for a static image; the real device already draws its
        // own system navigation affordance, so adding one here would just be
        // a second, fake nav bar on top of it.
        Row(
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp, bottom = 12.dp)
                .heightIn(min = 48.dp)
                .clickable(role = androidx.compose.ui.semantics.Role.Button, onClick = onGoToRegister),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = tr(StringKey.AUTH_NEW_HERE) + " ",
                style = com.s2nova.app.ui.theme.NovaType.bodySm,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = tr(StringKey.AUTH_CREATE),
                style = com.s2nova.app.ui.theme.NovaType.label,
                color = colors.link,
            )
        }
    }
}
