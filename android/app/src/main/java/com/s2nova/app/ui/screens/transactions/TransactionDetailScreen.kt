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
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.components.AmountText
import com.s2nova.app.ui.components.BadgeTone
import com.s2nova.app.ui.components.CategoryIcon
import com.s2nova.app.ui.components.CategoryIconSize
import com.s2nova.app.ui.components.NovaTopBar
import com.s2nova.app.ui.components.StatusBadge
import com.s2nova.app.ui.paymentMethodStringKey
import com.s2nova.app.ui.rememberStrings
import kotlinx.coroutines.launch

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
    val t = rememberStrings()
    val scope = androidx.compose.runtime.rememberCoroutineScope()

    Scaffold(
        topBar = {
            NovaTopBar(
                title = t(StringKey.TXN_DETAIL_TITLE),
                onBack = onBack,
                actions = {
                    if (transaction != null) {
                        IconButton(onClick = { onEdit(transaction.id) }) {
                            Icon(Icons.Filled.Edit, contentDescription = t(StringKey.TXN_DETAIL_EDIT_CD), tint = MaterialTheme.colorScheme.onBackground)
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
                Text(t(StringKey.TXN_DETAIL_NOT_FOUND), color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                    text = if (transaction.type == TransactionType.INCOME) t(StringKey.ADD_TXN_INCOME) else t(StringKey.ADD_TXN_EXPENSE),
                    tone = if (transaction.type == TransactionType.INCOME) BadgeTone.POSITIVE else BadgeTone.NEGATIVE,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp), color = MaterialTheme.colorScheme.outline)

            DetailRow(t(StringKey.TXN_DETAIL_DATE), formatLongDate(transaction.date))
            DetailRow(t(StringKey.ADD_TXN_CATEGORY), category?.let { t(categoryStringKey(it.id)) } ?: "—")
            DetailRow(t(StringKey.ADD_TXN_PAYMENT_METHOD), paymentMethodMap[transaction.paymentMethod]?.let { t(paymentMethodStringKey(it.id)) } ?: "—")
            if (!transaction.merchant.isNullOrBlank()) DetailRow(t(StringKey.TXN_DETAIL_MERCHANT), transaction.merchant)
            if (!transaction.note.isNullOrBlank()) DetailRow(t(StringKey.TXN_DETAIL_NOTE), transaction.note)

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
                Text(t(StringKey.TXN_DETAIL_DELETE))
            }
        }

        if (confirmDelete) {
            AlertDialog(
                onDismissRequest = { confirmDelete = false },
                title = { Text(t(StringKey.TXN_DETAIL_DELETE_DIALOG_TITLE)) },
                text = { Text("${t(StringKey.TXN_DETAIL_DELETE_CONFIRM_PREFIX)} \"${transaction.description}\"${t(StringKey.TXN_DETAIL_DELETE_CONFIRM_SUFFIX)}") },
                confirmButton = {
                    TextButton(onClick = {
                        scope.launch {
                            AppContainer.transactionRepository.delete(transaction.id)
                            AppContainer.walletRepository.refresh()
                            confirmDelete = false
                            onDeleted()
                        }
                    }) { Text(t(StringKey.TXN_DETAIL_DELETE_CONFIRM), color = MaterialTheme.colorScheme.error) }
                },
                dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text(t(StringKey.COMMON_CANCEL)) } },
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
