package com.s2nova.app.ui.screens.auth

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

@Composable
fun ForgotPasswordScreen(onBackToLogin: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var submitted by remember { mutableStateOf(false) }

    AuthLayout(
        title = if (submitted) "Revisa tu correo" else "¿Olvidaste tu contraseña?",
        subtitle = if (submitted) {
            "Si existe una cuenta con ese correo, enviamos instrucciones para restablecer tu contraseña."
        } else {
            "Ingresa tu correo y te enviaremos instrucciones para recuperarla."
        },
    ) {
        if (submitted) {
            Column(horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 12.dp))
                TextButton(onClick = onBackToLogin) { Text("Volver a inicio de sesión") }
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Correo electrónico") },
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
                    Text("Enviar instrucciones", modifier = Modifier.padding(vertical = 6.dp))
                }
                TextButton(onClick = onBackToLogin, modifier = Modifier.fillMaxWidth()) {
                    Text("Volver a inicio de sesión")
                }
            }
        }
    }
}
