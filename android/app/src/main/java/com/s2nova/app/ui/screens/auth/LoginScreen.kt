package com.s2nova.app.ui.screens.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.mock.DEMO_EMAIL
import com.s2nova.app.data.mock.DEMO_PASSWORD

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

    AuthLayout(title = "Bienvenido de nuevo", subtitle = "Inicia sesión para continuar con tus finanzas") {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; error = null },
                label = { Text("Correo electrónico") },
                leadingIcon = { Icon(Icons.Filled.Email, contentDescription = null) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = password,
                onValueChange = { password = it; error = null },
                label = { Text("Contraseña") },
                leadingIcon = { Icon(Icons.Filled.Lock, contentDescription = null) },
                trailingIcon = {
                    IconButton(onClick = { showPassword = !showPassword }) {
                        Icon(if (showPassword) Icons.Filled.VisibilityOff else Icons.Filled.Visibility, contentDescription = null)
                    }
                },
                singleLine = true,
                visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            )

            if (error != null) {
                Text(error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                TextButton(onClick = onForgotPassword) { Text("¿Olvidaste tu contraseña?") }
            }

            Button(
                onClick = {
                    val ok = AppContainer.authRepository.login(email, password)
                    if (ok) onLoginSuccess() else error = "Correo o contraseña incorrectos."
                },
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
            ) {
                Text("Iniciar sesión", modifier = Modifier.padding(vertical = 6.dp))
            }

            Text(
                text = "Demo: $DEMO_EMAIL / $DEMO_PASSWORD",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )

            Row(
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
            ) {
                Text("¿No tienes cuenta? ", color = MaterialTheme.colorScheme.onSurfaceVariant)
                TextButton(onClick = onGoToRegister) { Text("Regístrate") }
            }
        }
    }
}
