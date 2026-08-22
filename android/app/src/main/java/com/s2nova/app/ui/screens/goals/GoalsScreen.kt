package com.s2nova.app.ui.screens.goals

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaProgressBar
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import kotlinx.coroutines.launch

// Goals ("Car Payment", etc.) live as a second tab alongside Budgets
// rather than a new bottom-nav destination — both are "plan ahead"
// concepts, and the brief prioritizes keeping Android's navigation
// unchanged over adding a new top-level surface for a single new screen.
@Composable
fun GoalsTab(onContribute: (String) -> Unit) {
    val goals by AppContainer.goalRepository.goals.collectAsStateWithLifecycle()
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val scope = rememberCoroutineScope()
    var creating by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { AppContainer.goalRepository.refresh() }

    LazyColumn(
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = { creating = true }) {
                    Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.padding(end = 4.dp))
                    Text(t(StringKey.GOALS_NEW))
                }
            }
        }

        if (goals.isEmpty()) {
            item {
                Text(
                    t(StringKey.GOALS_EMPTY),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 24.dp),
                )
            }
        }

        items(goals) { goal ->
            NovaCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                        Icon(Icons.Filled.Flag, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Text(
                            goal.name,
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onBackground,
                            modifier = Modifier.weight(1f).padding(start = 10.dp),
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    Row {
                        Text(format(goal.currentAmount), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.ExtraBold)
                        Text(" / ${format(goal.targetAmount)}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Spacer(Modifier.height(8.dp))
                    val percentage = if (goal.targetAmount > 0) ((goal.currentAmount / goal.targetAmount) * 100).toInt().coerceIn(0, 100) else 0
                    NovaProgressBar(percentage = percentage, color = MaterialTheme.colorScheme.primary)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        TextButton(onClick = { onContribute(goal.id) }) { Text(t(StringKey.GOALS_CONTRIBUTE)) }
                    }
                }
            }
        }

        item { Spacer(Modifier.height(72.dp)) }
    }

    if (creating) {
        CreateGoalDialog(
            onDismiss = { creating = false },
            onCreate = { name, target ->
                scope.launch { AppContainer.goalRepository.create(name, target) }
                creating = false
            },
        )
    }
}

@Composable
private fun CreateGoalDialog(onDismiss: () -> Unit, onCreate: (String, Double) -> Unit) {
    val t = rememberStrings()
    var name by remember { mutableStateOf("") }
    var targetText by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(t(StringKey.GOALS_NEW)) },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text(t(StringKey.GOALS_NAME)) },
                    placeholder = { Text(t(StringKey.GOALS_NAME_PLACEHOLDER)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = targetText,
                    onValueChange = { targetText = it.filter { c -> c.isDigit() } },
                    leadingIcon = { Text("$") },
                    label = { Text(t(StringKey.GOALS_TARGET_AMOUNT)) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val target = targetText.toDoubleOrNull()
                if (name.isNotBlank() && target != null && target > 0) onCreate(name.trim(), target)
            }) { Text(t(StringKey.GOALS_CREATE)) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(t(StringKey.COMMON_CANCEL)) } },
    )
}
