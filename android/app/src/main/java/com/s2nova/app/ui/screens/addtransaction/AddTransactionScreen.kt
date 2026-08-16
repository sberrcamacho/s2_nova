package com.s2nova.app.ui.screens.addtransaction

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.data.mock.expenseCategories
import com.s2nova.app.data.mock.incomeCategories
import com.s2nova.app.data.mock.paymentMethods
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.NewTransactionInput
import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.todayISO
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.components.CategoryIcon
import com.s2nova.app.ui.components.CategoryIconSize
import com.s2nova.app.ui.components.NovaTopBar
import com.s2nova.app.ui.paymentMethodStringKey
import com.s2nova.app.ui.rememberStrings

@Composable
fun AddTransactionScreen(
    editTransactionId: String? = null,
    onSaved: () -> Unit,
    onBack: () -> Unit,
) {
    val editing = editTransactionId?.let { AppContainer.transactionRepository.getById(it) }
    val t = rememberStrings()

    var type by remember { mutableStateOf(editing?.type ?: TransactionType.EXPENSE) }
    var amountText by remember { mutableStateOf(editing?.amount?.toInt()?.toString() ?: "") }
    var description by remember { mutableStateOf(editing?.description ?: "") }
    var category by remember { mutableStateOf(editing?.category ?: expenseCategories.first().id) }
    var paymentMethod by remember { mutableStateOf(editing?.paymentMethod ?: PaymentMethod.DEBIT_CARD) }
    var note by remember { mutableStateOf(editing?.note ?: "") }
    var error by remember { mutableStateOf<String?>(null) }

    val categoriesForType = if (type == TransactionType.EXPENSE) expenseCategories else incomeCategories

    Scaffold(
        topBar = { NovaTopBar(title = if (editing != null) t(StringKey.ADD_TXN_TITLE_EDIT) else t(StringKey.ADD_TXN_TITLE_NEW), onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
        ) {
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                listOf(TransactionType.EXPENSE to t(StringKey.ADD_TXN_EXPENSE), TransactionType.INCOME to t(StringKey.ADD_TXN_INCOME)).forEachIndexed { index, (txnType, label) ->
                    SegmentedButton(
                        selected = type == txnType,
                        onClick = {
                            type = txnType
                            if (categoryMap[category]?.let { it.isExpense != (txnType == TransactionType.EXPENSE) } != false) {
                                category = (if (txnType == TransactionType.EXPENSE) expenseCategories else incomeCategories).first().id
                            }
                        },
                        shape = SegmentedButtonDefaults.itemShape(index, 2),
                    ) { Text(label) }
                }
            }

            Text(t(StringKey.ADD_TXN_AMOUNT), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 20.dp, bottom = 6.dp))
            OutlinedTextField(
                value = amountText,
                onValueChange = { amountText = it.filter { c -> c.isDigit() } },
                leadingIcon = { Text("$", fontWeight = FontWeight.Bold) },
                placeholder = { Text("0") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                shape = RoundedCornerShape(14.dp),
                textStyle = MaterialTheme.typography.headlineSmall,
                modifier = Modifier.fillMaxWidth(),
            )

            Text(t(StringKey.ADD_TXN_DESCRIPTION), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 20.dp, bottom = 6.dp))
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                placeholder = { Text(t(StringKey.ADD_TXN_DESCRIPTION_PLACEHOLDER)) },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            )

            Text(t(StringKey.ADD_TXN_CATEGORY), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 20.dp, bottom = 6.dp))
            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                categoriesForType.forEach { cat ->
                    CategoryChip(
                        label = t(categoryStringKey(cat.id)),
                        categoryId = cat.id,
                        selected = category == cat.id,
                        onClick = { category = cat.id },
                    )
                }
            }

            Text(t(StringKey.ADD_TXN_PAYMENT_METHOD), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 20.dp, bottom = 6.dp))
            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                paymentMethods.forEach { pm ->
                    PaymentMethodChip(
                        label = t(paymentMethodStringKey(pm.id)),
                        selected = paymentMethod == pm.id,
                        onClick = { paymentMethod = pm.id },
                    )
                }
            }

            Text(t(StringKey.ADD_TXN_NOTE), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 20.dp, bottom = 6.dp))
            OutlinedTextField(
                value = note,
                onValueChange = { note = it },
                placeholder = { Text(t(StringKey.ADD_TXN_NOTE_PLACEHOLDER)) },
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            )

            if (error != null) {
                Text(error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 12.dp))
            }

            Button(
                onClick = {
                    val amount = amountText.toDoubleOrNull()
                    if (amount == null || amount <= 0) {
                        error = t(StringKey.ADD_TXN_ERROR_AMOUNT)
                        return@Button
                    }
                    if (description.isBlank()) {
                        error = t(StringKey.ADD_TXN_ERROR_DESCRIPTION)
                        return@Button
                    }
                    val input = NewTransactionInput(
                        description = description.trim(),
                        amount = amount,
                        type = type,
                        category = category,
                        date = editing?.date ?: todayISO(),
                        paymentMethod = paymentMethod,
                        note = note.ifBlank { null },
                    )
                    if (editing != null) {
                        AppContainer.transactionRepository.update(editing.id, input)
                    } else {
                        AppContainer.transactionRepository.add(input)
                    }
                    onSaved()
                },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 28.dp, bottom = 12.dp),
            ) {
                Text(if (editing != null) t(StringKey.ADD_TXN_SAVE_EDIT) else t(StringKey.ADD_TXN_SAVE_NEW), modifier = Modifier.padding(vertical = 6.dp))
            }
        }
    }
}

// Selectable pill: tappable area, filled + no border when selected, subtle
// outline when not (so it still reads as "tap to choose" rather than a
// plain label even before the user has picked anything).
@Composable
private fun CategoryChip(label: String, categoryId: CategoryId, selected: Boolean, onClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
            .border(BorderStroke(1.dp, if (selected) androidx.compose.ui.graphics.Color.Transparent else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)), RoundedCornerShape(50))
            .selectable(selected = selected, onClick = onClick, role = androidx.compose.ui.semantics.Role.RadioButton)
            .padding(horizontal = 14.dp, vertical = 10.dp),
    ) {
        CategoryIcon(category = categoryId, size = CategoryIconSize.SM)
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(start = 8.dp),
        )
    }
}

@Composable
private fun PaymentMethodChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        label,
        style = MaterialTheme.typography.bodyMedium,
        color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onBackground,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
            .border(BorderStroke(1.dp, if (selected) androidx.compose.ui.graphics.Color.Transparent else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)), RoundedCornerShape(50))
            .selectable(selected = selected, onClick = onClick, role = androidx.compose.ui.semantics.Role.RadioButton)
            .padding(horizontal = 14.dp, vertical = 10.dp),
    )
}
