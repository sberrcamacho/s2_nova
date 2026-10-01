package com.s2nova.app.ui.screens.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.s2nova.app.data.AppContainer
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.NovaPrimaryButton
import com.s2nova.app.ui.components.NovaTextField
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.NovaType
import com.s2nova.app.ui.tr
import kotlinx.coroutines.launch
import retrofit2.HttpException

// The second step of "Olvidaste tu contraseña": the code that came in the
// email plus a new password (8+ characters with a number).
@Composable
fun ResetPasswordScreen(onBackToLogin: () -> Unit) {
    val scope = rememberCoroutineScope()
    var code by remember { mutableStateOf("") }
    var next by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var show by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var done by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    val rulesOk = next.length >= 8 && next.any { it.isDigit() } && next == confirm

    AuthLayout(
        title = tr(StringKey.AUTH_RESET_TITLE),
        subtitle = tr(if (done) StringKey.AUTH_RESET_DONE else StringKey.AUTH_RESET_HINT),
    ) {
        if (done) {
            NovaPrimaryButton(text = tr(StringKey.AUTH_BACK_TO_LOGIN), onClick = onBackToLogin)
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                NovaTextField(code, { code = it; error = null }, tr(StringKey.AUTH_RESET_CODE))
                NovaTextField(next, { next = it; error = null }, tr(StringKey.AUTH_RESET_NEW), isPassword = true, passwordVisible = show, onTogglePasswordVisible = { show = !show })
                NovaTextField(
                    confirm, { confirm = it; error = null }, tr(StringKey.AUTH_RESET_CONFIRM),
                    isPassword = true, passwordVisible = show, onTogglePasswordVisible = { show = !show },
                    isError = error != null, errorMessage = error,
                )
                Text(tr(StringKey.AUTH_PW_RULES), style = NovaType.bodySm, color = NovaColors.current.textDim, modifier = Modifier.fillMaxWidth().padding(top = 0.dp))
                NovaPrimaryButton(
                    text = tr(StringKey.AUTH_RESET_SUBMIT),
                    loading = busy,
                    enabled = code.isNotBlank() && rulesOk && !busy,
                    onClick = {
                        busy = true
                        scope.launch {
                            AppContainer.authRepository.resetPassword(code, next)
                                .onSuccess { done = true }
                                .onFailure { error = if (it is HttpException && it.code() == 400) tr(StringKey.AUTH_RESET_INVALID) else tr(StringKey.API_OFFLINE) }
                            busy = false
                        }
                    },
                )
                com.s2nova.app.ui.screens.auth.BackToLoginLink(onBackToLogin)
            }
        }
    }
}
