package com.s2nova.app.ui.screens.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.BuildConfig
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.ThemeController
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaTopBar

@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val darkOverride by ThemeController.darkOverride.collectAsStateWithLifecycle()
    val isDark = darkOverride ?: androidx.compose.foundation.isSystemInDarkTheme()

    var name by remember { mutableStateOf(user?.name ?: "") }
    var phone by remember { mutableStateOf(user?.phone ?: "") }
    var city by remember { mutableStateOf(user?.city ?: "") }
    var notifications by remember { mutableStateOf(user?.preferences?.notifications ?: true) }
    var biometric by remember { mutableStateOf(user?.preferences?.biometricLogin ?: false) }

    Scaffold(
        topBar = { NovaTopBar(title = "Configuración", onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
        ) {
            Text("Información personal", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Nombre completo") }, singleLine = true, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(value = user?.email ?: "", onValueChange = {}, label = { Text("Correo electrónico") }, enabled = false, singleLine = true, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Teléfono") }, singleLine = true, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(value = city, onValueChange = { city = it }, label = { Text("Ciudad") }, singleLine = true, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = {
                    AppContainer.authRepository.updateUser { it.copy(name = name, phone = phone, city = city) }
                },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(14.dp),
            ) { Text("Guardar cambios", modifier = Modifier.padding(vertical = 4.dp)) }

            Text("Preferencias", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(top = 28.dp, bottom = 12.dp))
            NovaCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    PreferenceRow("Modo oscuro", isDark) { ThemeController.setDark(it) }
                    Spacer(Modifier.height(14.dp))
                    PreferenceRow("Notificaciones", notifications) {
                        notifications = it
                        AppContainer.authRepository.updateUser { u -> u.copy(preferences = u.preferences.copy(notifications = it)) }
                    }
                    Spacer(Modifier.height(14.dp))
                    PreferenceRow("Inicio biométrico", biometric) {
                        biometric = it
                        AppContainer.authRepository.updateUser { u -> u.copy(preferences = u.preferences.copy(biometricLogin = it)) }
                    }
                }
            }

            NovaCard(modifier = Modifier.fillMaxWidth().padding(top = 20.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Acerca de", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onBackground)
                    Text(
                        "S2 Nova · Versión ${BuildConfig.VERSION_NAME} · Datos de demostración, sin conexión a un backend real.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }

            Spacer(Modifier.height(32.dp))
        }
    }
}

@Composable
private fun PreferenceRow(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onBackground)
        Switch(checked = checked, onCheckedChange = onChange)
    }
}
