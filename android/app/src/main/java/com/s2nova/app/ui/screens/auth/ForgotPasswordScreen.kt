package com.s2nova.app.ui.screens.auth

import com.s2nova.app.ui.theme.NovaColors
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Email
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.s2nova.app.ui.tr
import com.s2nova.app.ui.StringKey
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.KeyboardType
import com.s2nova.app.data.AppContainer
import kotlinx.coroutines.launch
import com.s2nova.app.ui.components.NovaPrimaryButton
import com.s2nova.app.ui.components.NovaTextField
import com.s2nova.app.ui.theme.NovaType

@Composable
fun ForgotPasswordScreen(onBackToLogin: () -> Unit, onHaveCode: () -> Unit = {}) {
    var email by remember { mutableStateOf("") }
    var submitted by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    val scope = androidx.compose.runtime.rememberCoroutineScope()

    AuthLayout(
        title = tr(if (submitted) StringKey.AUTH_CHECK_EMAIL else StringKey.AUTH_FORGOT),
        subtitle = if (submitted) {
            tr(StringKey.AUTH_FORGOT_SENT)
        } else {
            tr(StringKey.AUTH_FORGOT_HINT)
        },
    ) {
        if (submitted) {
            Column(horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = NovaColors.current.positive, modifier = Modifier.padding(bottom = 12.dp))
                NovaPrimaryButton(text = tr(StringKey.AUTH_HAVE_CODE), onClick = onHaveCode)
                BackToLogin(onBackToLogin)
            }
        } else {
            // The same labeled field and primary button as Login.
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                NovaTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = tr(StringKey.AUTH_EMAIL),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                )
                NovaPrimaryButton(
                    text = tr(StringKey.AUTH_SEND),
                    loading = busy,
                    enabled = email.isNotBlank() && !busy,
                    onClick = {
                        busy = true
                        scope.launch {
                            // The server answers the same for every email, so the
                            // confirmation shows whatever the outcome (except offline).
                            AppContainer.authRepository.forgotPassword(email)
                                .onSuccess { submitted = true }
                                .onFailure { com.s2nova.app.ui.Snack.show(tr(StringKey.API_OFFLINE)) }
                            busy = false
                        }
                    },
                )
                Box(modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(RoundedCornerShape(12.dp)).clickable(role = Role.Button, onClick = onHaveCode), contentAlignment = androidx.compose.ui.Alignment.Center) {
                    Text(tr(StringKey.AUTH_HAVE_CODE), style = NovaType.label, color = NovaColors.current.link, maxLines = 1, softWrap = false)
                }
                BackToLogin(onBackToLogin)
            }
        }
    }
}

// A text button in `link` on a 48 dp target.
@Composable
internal fun BackToLoginLink(onClick: () -> Unit) = BackToLogin(onClick)

@Composable
private fun BackToLogin(onClick: () -> Unit) {
    Box(
        contentAlignment = androidx.compose.ui.Alignment.Center,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(role = Role.Button, onClick = onClick),
    ) {
        Text(tr(StringKey.AUTH_BACK_TO_LOGIN), style = NovaType.label, color = NovaColors.current.link, maxLines = 1, softWrap = false)
    }
}
