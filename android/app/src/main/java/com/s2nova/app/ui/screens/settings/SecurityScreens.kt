package com.s2nova.app.ui.screens.settings

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.selection.toggleable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.Row
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.remote.toUserMessage
import com.s2nova.app.ui.Snack
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.BackHeader
import com.s2nova.app.ui.components.NovaPrimaryButton
import com.s2nova.app.ui.components.NovaTextField
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.NovaType
import com.s2nova.app.ui.tr
import kotlinx.coroutines.launch
import retrofit2.HttpException

private fun Throwable.isUnauthorized() = this is HttpException && code() == 401

private fun passwordRulesOk(next: String, confirm: String) = next.length >= 8 && next.any { it.isDigit() } && next == confirm

// Shared frame of the three account-security screens: back header and a
// scrolling column of labeled fields.
@Composable
private fun SecurityFrame(title: String, onBack: () -> Unit, content: @Composable () -> Unit) {
    Scaffold(containerColor = MaterialTheme.colorScheme.background, contentWindowInsets = WindowInsets(0, 0, 0, 0)) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            BackHeader(title = title, onBack = onBack)
            Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) { content() }
        }
    }
}

// Ajustes › Cambiar contraseña (same rules as Web: 8+ characters, a number).
@Composable
fun ChangePasswordScreen(onBack: () -> Unit) {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val needsCurrent = user?.hasPassword ?: true
    val scope = rememberCoroutineScope()
    var current by remember { mutableStateOf("") }
    var next by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var show by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    SecurityFrame(tr(StringKey.SET_PW_TITLE), onBack) {
        Text(tr(StringKey.SET_PW_DETAIL), style = NovaType.bodySm, color = NovaColors.current.textDim)
        if (needsCurrent) {
            NovaTextField(current, { current = it; error = null }, tr(StringKey.SET_PW_CURRENT), isPassword = true, passwordVisible = show, onTogglePasswordVisible = { show = !show })
        }
        NovaTextField(next, { next = it; error = null }, tr(StringKey.AUTH_RESET_NEW), isPassword = true, passwordVisible = show, onTogglePasswordVisible = { show = !show })
        NovaTextField(
            confirm, { confirm = it; error = null }, tr(StringKey.AUTH_RESET_CONFIRM),
            isPassword = true, passwordVisible = show, onTogglePasswordVisible = { show = !show },
            isError = error != null, errorMessage = error,
        )
        Text(tr(StringKey.AUTH_PW_RULES), style = NovaType.bodySm, color = NovaColors.current.textDim)
        NovaPrimaryButton(
            text = tr(StringKey.AUTH_RESET_SUBMIT),
            loading = busy,
            enabled = passwordRulesOk(next, confirm) && (!needsCurrent || current.isNotEmpty()) && !busy,
            onClick = {
                if (needsCurrent && current == next) { error = tr(StringKey.SET_PW_SAME); return@NovaPrimaryButton }
                busy = true
                scope.launch {
                    AppContainer.authRepository.changePassword(current, next)
                        .onSuccess {
                            AppContainer.authRepository.updateUser { it.copy(hasPassword = true) }
                            Snack.show(tr(StringKey.SET_PW_DONE))
                            onBack()
                        }
                        .onFailure { error = if (it.isUnauthorized()) tr(StringKey.SET_PW_WRONG) else it.toUserMessage(tr(StringKey.SET_PW_WRONG)) }
                    busy = false
                }
            },
        )
    }
}

enum class RiskAction { RESET, DELETE }

// Ajustes › Zona de riesgo: restablecer datos / eliminar cuenta. Both ask
// for the confirmation word, the current password and an acknowledgement.
@Composable
fun RiskActionScreen(action: RiskAction, onBack: () -> Unit, onDeleted: () -> Unit) {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val reset = action == RiskAction.RESET
    val word = tr(if (reset) StringKey.SET_RESET_WORD else StringKey.SET_DELETE_WORD)
    var typed by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var show by remember { mutableStateOf(false) }
    var ack by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val colors = NovaColors.current
    val canSubmit = typed.trim().equals(word, ignoreCase = true) && password.isNotEmpty() && ack && !busy && user?.hasPassword != false

    SecurityFrame(tr(if (reset) StringKey.SET_RESET_TITLE else StringKey.SET_DELETE_TITLE), onBack) {
        Text(tr(if (reset) StringKey.SET_RESET_DETAIL else StringKey.SET_DELETE_DETAIL), style = NovaType.body, color = MaterialTheme.colorScheme.onSurface)
        if (user?.hasPassword == false) Text(tr(StringKey.SET_RISK_NO_PASSWORD), style = NovaType.bodySm, color = colors.negative)
        NovaTextField(typed, { typed = it }, tr(StringKey.SET_RISK_TYPE, word))
        NovaTextField(
            password, { password = it; error = null }, tr(StringKey.SET_PW_CURRENT),
            isPassword = true, passwordVisible = show, onTogglePasswordVisible = { show = !show },
            isError = error != null, errorMessage = error,
        )
        Row(
            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).toggleable(value = ack, role = Role.Checkbox, onValueChange = { ack = it }),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            androidx.compose.material3.Checkbox(checked = ack, onCheckedChange = null)
            Text(tr(StringKey.SET_RISK_ACK), style = NovaType.body, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
        }
        // Danger button: outlined in `negative` (text and border ≥ 4.5:1 on
        // both surfaces), 52 dp, dimmed until the form is complete.
        val shape = RoundedCornerShape(12.dp)
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 52.dp)
                .clip(shape)
                .border(1.5.dp, if (canSubmit) colors.negative else colors.borderInput, shape)
                .clickable(enabled = canSubmit, role = Role.Button) {
                    busy = true
                    scope.launch {
                        val result = if (reset) AppContainer.authRepository.resetData(password) else AppContainer.authRepository.deleteAccount(password)
                        result
                            .onSuccess {
                                if (reset) {
                                    AppContainer.refreshUserData()
                                    Snack.show(tr(StringKey.SET_RESET_DONE))
                                    onBack()
                                } else onDeleted()
                            }
                            .onFailure { error = if (it.isUnauthorized()) tr(StringKey.SET_PW_WRONG) else it.toUserMessage(tr(StringKey.SET_PW_WRONG)) }
                        busy = false
                    }
                },
        ) {
            Text(
                tr(if (reset) StringKey.SET_RESET_SUBMIT else StringKey.SET_DELETE_SUBMIT),
                style = NovaType.label,
                color = if (canSubmit) colors.negative else colors.textDim,
                maxLines = 1,
                softWrap = false,
            )
        }
    }
}

