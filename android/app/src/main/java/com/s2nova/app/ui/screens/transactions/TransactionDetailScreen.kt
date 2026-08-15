package com.s2nova.app.ui.screens.transactions

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.formatLongDate
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.data.mock.paymentMethodMap
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.ui.components.AmountText
import com.s2nova.app.ui.components.BadgeTone
import com.s2nova.app.ui.components.CategoryIcon
import com.s2nova.app.ui.components.CategoryIconSize
import com.s2nova.app.ui.components.NovaTopBar
import com.s2nova.app.ui.components.StatusBadge

@Composable
fun TransactionDetailScreen(
    transactionId: String,
    onBack: () -> Unit,
    onEdit: (String) -> Unit,
    onDeleted: () -> Unit,
) {
    val transactions by AppContainer.transactionRepository.transactions.collectAsStateWithLifecycle()
    val transaction = transactions.find { it.id == transactionId }
    var confirmDelete by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            NovaTopBar(
                title = "Detalle del movimiento",
                onBack = onBack,
                actions = {
                    if (transaction != null) {
                        IconButton(onClick = { onEdit(transaction.id) }) {
                            Icon(Icons.Filled.Edit, contentDescription = "Editar", tint = MaterialTheme.colorScheme.onBackground)
                        }
                    }
                },
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        if (transaction == null) {
            Column(modifier = Modifier.fillMaxSize().padding(padding), horizontalAlignment = Alignment.CenterHorizontally) {
                Spacer(Modifier.height(48.dp))
                Text("Este movimiento ya no existe.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            return@Scaffold
        }

        val category = categoryMap[transaction.category]

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp),
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
                CategoryIcon(category = transaction.category, size = CategoryIconSize.LG)
                Text(
                    transaction.description,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onBackground,
                    modifier = Modifier.padding(top = 12.dp),
                )
                AmountText(amount = transaction.amount, type = transaction.type, modifier = Modifier.padding(top = 6.dp))
                StatusBadge(
                    text = if (transaction.type == TransactionType.INCOME) "Ingreso" else "Gasto",
                    tone = if (transaction.type == TransactionType.INCOME) BadgeTone.POSITIVE else BadgeTone.NEGATIVE,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp), color = MaterialTheme.colorScheme.outline)

            DetailRow("Fecha", formatLongDate(transaction.date))
            DetailRow("Categoría", category?.label ?: "—")
            DetailRow("Método de pago", paymentMethodMap[transaction.paymentMethod]?.label ?: "—")
            if (!transaction.merchant.isNullOrBlank()) DetailRow("Comercio", transaction.merchant)
            if (!transaction.note.isNullOrBlank()) DetailRow("Nota", transaction.note)

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = { confirmDelete = true },
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer,
                    contentColor = MaterialTheme.colorScheme.error,
                ),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Filled.Delete, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                Text("Eliminar movimiento")
            }
        }

        if (confirmDelete) {
            AlertDialog(
                onDismissRequest = { confirmDelete = false },
                title = { Text("Eliminar transacción") },
                text = { Text("¿Seguro que deseas eliminar \"${transaction.description}\"? Esta acción no se puede deshacer.") },
                confirmButton = {
                    TextButton(onClick = {
                        AppContainer.transactionRepository.delete(transaction.id)
                        confirmDelete = false
                        onDeleted()
                    }) { Text("Eliminar", color = MaterialTheme.colorScheme.error) }
                },
                dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancelar") } },
            )
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onBackground)
    }
}
