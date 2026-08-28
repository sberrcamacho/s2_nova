package com.s2nova.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
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

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onForgotPassword: () -> Unit,
    onGoToRegister: () -> Unit,
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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 24.dp),
    ) {
        Spacer(modifier = Modifier.height(52.dp))

        // Header
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            AuthLogo()
            Column {
                Text(
                    text = "Iniciar sesión",
                    fontSize = 30.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = (-0.03).em,
                    lineHeight = 33.6.sp,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Text(
                    text = "Tus finanzas, siempre al día.",
                    fontSize = 13.5.sp,
                    color = colors.loginTextMuted,
                    modifier = Modifier.padding(top = 7.dp),
                )
            }
        }

        Spacer(modifier = Modifier.height(28.dp))

        // Scrollable middle: fields + actions, so the footer stays pinned near
        // the bottom on tall screens without breaking small-screen scrolling.
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(28.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                NovaTextField(
                    value = email,
                    onValueChange = { email = it; error = null },
                    label = "CORREO",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                )
                NovaTextField(
                    value = password,
                    onValueChange = { password = it; error = null },
                    label = "CONTRASEÑA",
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
                        text = "¿Olvidaste tu contraseña?",
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.loginPrimary,
                        modifier = Modifier
                            .clickable(onClick = onForgotPassword)
                            .padding(vertical = 8.dp),
                    )
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                NovaPrimaryButton(
                    text = "Entrar",
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
                                    error = it.toUserMessage("Correo o contraseña incorrectos.")
                                }
                        }
                    },
                    enabled = !loading,
                    loading = loading,
                )

                if (BuildConfig.GOOGLE_WEB_CLIENT_ID.isNotBlank()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        HorizontalDivider(modifier = Modifier.weight(1f))
                        Text(
                            text = "O",
                            fontSize = 10.5.sp,
                            fontWeight = FontWeight.Bold,
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
                                            it.toUserMessage("No pudimos iniciar sesión con Google.")
                                        }
                                    }
                            }
                        },
                        enabled = !googleLoading,
                        loading = googleLoading,
                    )
                }
            }
        }

        // Footer — pinned near the bottom (the weighted scrollable column above
        // pushes this down), mirroring the mockup's `margin-top:auto` footer.
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 26.dp),
        ) {
            Row {
                Text(
                    text = "¿Nuevo aquí? ",
                    fontSize = 13.sp,
                    color = colors.loginTextMuted,
                )
                Text(
                    text = "Crear cuenta",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isDark) MaterialTheme.colorScheme.onBackground else colors.loginPrimary,
                    modifier = Modifier.clickable(onClick = onGoToRegister),
                )
            }
            Box(
                modifier = Modifier
                    .size(width = 134.dp, height = 5.dp)
                    .clip(RoundedCornerShape(percent = 50))
                    .background(if (isDark) Color.White.copy(alpha = 0.22f) else Color(0xFFD8D8E2)),
            )
        }
    }
}
