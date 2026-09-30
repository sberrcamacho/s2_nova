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

@Composable
fun ForgotPasswordScreen(onBackToLogin: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var submitted by remember { mutableStateOf(false) }

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
                Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = NovaColors.current.link, modifier = Modifier.padding(bottom = 12.dp))
                TextButton(onClick = onBackToLogin) { Text(tr(StringKey.AUTH_BACK_TO_LOGIN)) }
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text(tr(StringKey.AUTH_EMAIL_FULL)) },
                    leadingIcon = { Icon(Icons.Filled.Email, contentDescription = null) },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth(),
                )
                Button(
                    onClick = { submitted = true },
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(tr(StringKey.AUTH_SEND), modifier = Modifier.padding(vertical = 6.dp))
                }
                TextButton(onClick = onBackToLogin, modifier = Modifier.fillMaxWidth()) {
                    Text(tr(StringKey.AUTH_BACK_TO_LOGIN))
                }
            }
        }
    }
}
