package com.s2nova.app.ui.screens.settings

import com.s2nova.app.ui.components.revealOnFocus
import com.s2nova.app.ui.theme.appCanvas
import androidx.compose.foundation.border
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.background
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import com.s2nova.app.BuildConfig
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.remote.IdentityConfirmRequest
import com.s2nova.app.ui.components.GoogleSignInButton
import com.s2nova.app.ui.screens.auth.GoogleAuthHelper
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

// Ajustes › Cambiar contraseña rules, the same as Web's: 8+ characters, a
// number, and the confirmation matches.
internal fun passwordRules(next: String, confirm: String): List<Pair<StringKey, Boolean>> = listOf(
    StringKey.SET_PW_RULE_LENGTH to (next.length >= 8),
    StringKey.SET_PW_RULE_NUMBER to next.any { it.isDigit() },
    StringKey.SET_PW_RULE_MATCH to (next.isNotEmpty() && next == confirm),
)

internal data class PasswordErrors(val current: StringKey? = null, val next: StringKey? = null, val confirm: StringKey? = null) {
    val none get() = current == null && next == null && confirm == null
}

// What's wrong with the form, field by field, before calling the backend.
internal fun passwordErrors(needsCurrent: Boolean, current: String, next: String, confirm: String): PasswordErrors {
    val rules = passwordRules(next, confirm)
    return PasswordErrors(
        current = if (needsCurrent && current.isEmpty()) StringKey.SET_PW_ERR_CURRENT else null,
        next = when {
            !rules[0].second || !rules[1].second -> StringKey.SET_PW_ERR_RULES
            needsCurrent && next == current -> StringKey.SET_PW_SAME
            else -> null
        },
        confirm = if (!rules[2].second) StringKey.SET_PW_ERR_MATCH else null,
    )
}

// Shared frame of the three account-security screens: back header and a
// scrolling column of labeled fields.
@Composable
internal fun SecurityFrame(title: String, onBack: () -> Unit, content: @Composable () -> Unit) {
    Scaffold(containerColor = androidx.compose.ui.graphics.Color.Transparent, modifier = Modifier.appCanvas(MaterialTheme.colorScheme.background), contentWindowInsets = WindowInsets(0, 0, 0, 0)) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            BackHeader(title = title, onBack = onBack)
            Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) { content() }
        }
    }
}

// Ajustes › Cambiar contraseña: current, new, confirm (same rules as Web).
// An account that signs in with Google and has no password yet gets
// "Crear contraseña" instead (new + confirm): there's no current one.
@Composable
fun ChangePasswordScreen(onBack: () -> Unit) {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val needsCurrent = user?.hasPassword ?: true
    val scope = rememberCoroutineScope()
    var current by remember { mutableStateOf("") }
    var next by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var show by remember { mutableStateOf(false) }
    // Errors sit under the field they are about; others go to `error`.
    var errors by remember { mutableStateOf(PasswordErrors()) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val colors = NovaColors.current

    SecurityFrame(tr(if (needsCurrent) StringKey.SET_PW_TITLE else StringKey.SET_PW_CREATE_TITLE), onBack) {
        Text(tr(if (needsCurrent) StringKey.SET_PW_DETAIL else StringKey.SET_PW_CREATE_DETAIL), style = NovaType.bodySm, color = colors.textDim)
        if (needsCurrent) {
            NovaTextField(
                current, { current = it; errors = errors.copy(current = null); error = null }, tr(StringKey.SET_PW_CURRENT),
                isPassword = true, passwordVisible = show, onTogglePasswordVisible = { show = !show },
                isError = errors.current != null, errorMessage = errors.current?.let { tr(it) },
            )
        }
        // With the keyboard up, the new password, its checklist and Guardar
        // stay in view together.
        Column(Modifier.revealOnFocus(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            NovaTextField(
                next, { next = it; errors = errors.copy(next = null); error = null }, tr(StringKey.AUTH_RESET_NEW),
                isPassword = true, passwordVisible = show, onTogglePasswordVisible = { show = !show },
                isError = errors.next != null, errorMessage = errors.next?.let { tr(it) },
            )
            NovaTextField(
                confirm, { confirm = it; errors = errors.copy(confirm = null); error = null }, tr(StringKey.AUTH_RESET_CONFIRM),
                isPassword = true, passwordVisible = show, onTogglePasswordVisible = { show = !show },
                isError = errors.confirm != null, errorMessage = errors.confirm?.let { tr(it) },
            )
            // Live checklist: a met rule shows a check, not only a colour.
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                passwordRules(next, confirm).forEach { (key, ok) ->
                    val label = tr(key)
                    val state = tr(if (ok) StringKey.SET_PW_RULE_MET else StringKey.SET_PW_RULE_MISSING)
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.semantics(mergeDescendants = true) { contentDescription = "$label, $state" },
                    ) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier.size(18.dp).clip(CircleShape)
                                .then(if (ok) Modifier.background(colors.positive) else Modifier.border(1.dp, colors.borderInput, CircleShape)),
                        ) {
                            if (ok) com.s2nova.app.ui.components.V2Icon(com.s2nova.app.ui.components.V2Icons.check, Color.White, 12.dp, strokeWidth = 3f)
                        }
                        Text(label, style = NovaType.bodySm, color = if (ok) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            if (error != null) Text(error!!, style = NovaType.bodySm, color = colors.negative)
            NovaPrimaryButton(
                text = tr(if (needsCurrent) StringKey.AUTH_RESET_SUBMIT else StringKey.SET_PW_CREATE_SUBMIT),
                loading = busy,
                enabled = !busy,
                onClick = {
                    errors = passwordErrors(needsCurrent, current, next, confirm)
                    if (!errors.none) return@NovaPrimaryButton
                    busy = true
                    scope.launch {
                        AppContainer.authRepository.changePassword(current, next)
                            .onSuccess {
                                AppContainer.authRepository.updateUser { it.copy(hasPassword = true) }
                                Snack.show(tr(if (needsCurrent) StringKey.SET_PW_DONE else StringKey.SET_PW_CREATED))
                                onBack()
                            }
                            .onFailure {
                                if (it.isUnauthorized()) errors = PasswordErrors(current = StringKey.SET_PW_WRONG)
                                else error = it.toUserMessage(tr(StringKey.SET_PW_WRONG))
                            }
                        busy = false
                    }
                },
            )
        }
    }
}

enum class RiskAction { RESET, DELETE }

// Ajustes › Zona de riesgo: restablecer datos / eliminar cuenta. Both ask
// for the confirmation word (in the app language: RESTABLECER / RESET,
// ELIMINAR / DELETE), the current password — or, for an account created
// with Google, signing in with Google again — and an acknowledgement.
@Composable
fun RiskActionScreen(action: RiskAction, onBack: () -> Unit, onDeleted: () -> Unit) {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val reset = action == RiskAction.RESET
    val word = tr(if (reset) StringKey.SET_RESET_WORD else StringKey.SET_DELETE_WORD)
    val hasPassword = user?.hasPassword != false
    var typed by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var googleToken by remember { mutableStateOf<String?>(null) }
    var googleBusy by remember { mutableStateOf(false) }
    var show by remember { mutableStateOf(false) }
    var ack by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val colors = NovaColors.current
    val confirmation = when {
        hasPassword -> IdentityConfirmRequest(password = password).takeIf { password.isNotEmpty() }
        else -> googleToken?.let { IdentityConfirmRequest(googleIdToken = it) }
    }
    val canSubmit = typed.trim().equals(word, ignoreCase = true) && confirmation != null && ack && !busy

    SecurityFrame(tr(if (reset) StringKey.SET_RESET_TITLE else StringKey.SET_DELETE_TITLE), onBack) {
        Text(tr(if (reset) StringKey.SET_RESET_DETAIL else StringKey.SET_DELETE_DETAIL), style = NovaType.body, color = MaterialTheme.colorScheme.onSurface)
        NovaTextField(typed, { typed = it }, tr(StringKey.SET_RISK_TYPE, word))
        if (hasPassword) {
            NovaTextField(
                password, { password = it; error = null }, tr(StringKey.SET_PW_CURRENT),
                isPassword = true, passwordVisible = show, onTogglePasswordVisible = { show = !show },
                isError = error != null, errorMessage = error,
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(tr(StringKey.SET_RISK_GOOGLE_LABEL), style = NovaType.label, color = MaterialTheme.colorScheme.onSurfaceVariant)
                val token = googleToken
                if (token == null) {
                    GoogleSignInButton(
                        text = tr(StringKey.SET_RISK_GOOGLE_CONFIRM),
                        enabled = BuildConfig.GOOGLE_WEB_CLIENT_ID.isNotBlank(),
                        loading = googleBusy,
                        onClick = {
                            googleBusy = true
                            error = null
                            scope.launch {
                                GoogleAuthHelper.getIdToken(context, BuildConfig.GOOGLE_WEB_CLIENT_ID)
                                    .onSuccess { googleToken = it }
                                    .onFailure { error = GoogleAuthHelper.failureMessage(it) { it.toUserMessage(tr(StringKey.AUTH_GOOGLE_ERR)) } }
                                googleBusy = false
                            }
                        },
                    )
                } else {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 52.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .border(1.dp, colors.borderInput, RoundedCornerShape(12.dp))
                            .padding(start = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        com.s2nova.app.ui.components.V2Icon(com.s2nova.app.ui.components.V2Icons.check, colors.positive, 18.dp)
                        Text(
                            tr(StringKey.SET_RISK_GOOGLE_DONE, user?.email.orEmpty()),
                            style = NovaType.bodySm,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f),
                        )
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .heightIn(min = 48.dp)
                                .clickable(role = Role.Button) { googleToken = null }
                                .padding(horizontal = 14.dp),
                        ) {
                            Text(tr(StringKey.SET_RISK_GOOGLE_AGAIN), style = NovaType.label, color = colors.accentText, maxLines = 1, softWrap = false)
                        }
                    }
                }
                if (error != null) Text(error!!, style = NovaType.bodySm, color = colors.negative)
            }
        }
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
                        val confirm = confirmation ?: return@launch
                        val result = if (reset) AppContainer.authRepository.resetData(confirm) else AppContainer.authRepository.deleteAccount(confirm)
                        result
                            .onSuccess {
                                if (reset) {
                                    AppContainer.refreshUserData()
                                    Snack.show(tr(StringKey.SET_RESET_DONE))
                                    onBack()
                                } else onDeleted()
                            }
                            .onFailure {
                                val wrong = tr(if (hasPassword) StringKey.SET_PW_WRONG else StringKey.SET_RISK_GOOGLE_MISMATCH)
                                error = if (it.isUnauthorized()) wrong else it.toUserMessage(wrong)
                                if (!hasPassword) googleToken = null
                            }
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

