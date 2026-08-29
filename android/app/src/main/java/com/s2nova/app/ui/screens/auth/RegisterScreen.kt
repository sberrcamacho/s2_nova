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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.s2nova.app.BuildConfig
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.remote.toUserMessage
import com.s2nova.app.ui.components.GoogleSignInButton
import com.s2nova.app.ui.components.NovaPrimaryButton
import com.s2nova.app.ui.components.NovaTextField
import com.s2nova.app.ui.components.PasswordStrengthMeter
import com.s2nova.app.ui.components.TermsCheckbox
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch

@Composable
fun RegisterScreen(
    onRegisterSuccess: () -> Unit,
    onGoToLogin: () -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var agreedToTerms by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var googleLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val colors = NovaColors.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 24.dp),
    ) {
        Box(
            modifier = Modifier
                .padding(top = 12.dp)
                .size(40.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(colors.loginSurface)
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
                .clickable(onClick = onGoToLogin),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Volver",
                tint = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.size(16.dp),
            )
        }

        Spacer(modifier = Modifier.height(22.dp))

        Column {
            Text(
                text = "Crear cuenta",
                fontSize = 30.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = (-0.03).em,
                lineHeight = 33.6.sp,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Text(
                text = "Gratis, sin tarjeta de crédito.",
                fontSize = 13.5.sp,
                color = colors.loginTextMuted,
                modifier = Modifier.padding(top = 7.dp),
            )
        }

        Spacer(modifier = Modifier.height(26.dp))

        // Scrollable middle: fields + terms + actions, so the footer stays
        // pinned near the bottom on tall screens without breaking small-screen
        // scrolling — same skeleton as LoginScreen.
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(26.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                NovaTextField(
                    value = name,
                    onValueChange = { name = it; error = null },
                    label = "NOMBRE",
                )
                NovaTextField(
                    value = email,
                    onValueChange = { email = it; error = null },
                    label = "CORREO",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                )
                Column {
                    NovaTextField(
                        value = password,
                        onValueChange = { password = it; error = null },
                        label = "CONTRASEÑA",
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        isPassword = true,
                        passwordVisible = showPassword,
                        onTogglePasswordVisible = { showPassword = !showPassword },
                    )
                    PasswordStrengthMeter(password = password)
                }

                if (error != null) {
                    Text(error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }

            TermsCheckbox(checked = agreedToTerms, onCheckedChange = { agreedToTerms = it })

            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                NovaPrimaryButton(
                    text = "Crear cuenta",
                    onClick = {
                        loading = true
                        scope.launch {
                            AppContainer.authRepository.register(name, email, password)
                                .onSuccess {
                                    AppContainer.refreshUserData()
                                    loading = false
                                    onRegisterSuccess()
                                }
                                .onFailure {
                                    loading = false
                                    error = it.toUserMessage(
                                        "Revisa tu nombre, correo y que la contraseña tenga al menos 8 caracteres.",
                                    )
                                }
                        }
                    },
                    enabled = !loading && agreedToTerms,
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
                                        onRegisterSuccess()
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
                        text = "Registrarse con Google",
                    )
                }
            }
        }

        // Footer — pinned near the bottom, no decorative home-indicator bar;
        // same reasoning as LoginScreen (the real device already draws its own
        // system navigation affordance).
        Row(
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 26.dp),
        ) {
            Text(
                text = "¿Ya tienes cuenta? ",
                fontSize = 13.sp,
                color = colors.loginTextMuted,
            )
            Text(
                text = "Iniciar sesión",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = colors.loginHighlight,
                modifier = Modifier.clickable(onClick = onGoToLogin),
            )
        }
    }
}
