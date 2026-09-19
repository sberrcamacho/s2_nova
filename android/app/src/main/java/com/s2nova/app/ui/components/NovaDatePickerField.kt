package com.s2nova.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.s2nova.app.data.formatLongDate
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberStrings
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

// A tappable field backed by Material 3's DatePicker instead of free text —
// the app has no ISO-date text input anywhere, so a user can never type an
// invalid date (see design_handoff_s2_nova_overview/INTERACCIONES.md's
// "Fechas" section). `value`/`onValueChange` are ISO "yyyy-MM-dd" strings.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NovaDatePickerField(
    label: String,
    value: String?,
    onValueChange: (String?) -> Unit,
    modifier: Modifier = Modifier,
    allowClear: Boolean = false,
) {
    val t = rememberStrings()
    var showPicker by remember { mutableStateOf(false) }
    val displayText = value?.let { runCatching { formatLongDate(it) }.getOrNull() } ?: ""

    OutlinedTextField(
        value = displayText,
        onValueChange = {},
        readOnly = true,
        label = { Text(label) },
        placeholder = { Text(t(StringKey.DATE_PICKER_CHOOSE)) },
        leadingIcon = { Icon(Icons.Filled.CalendarMonth, contentDescription = null, modifier = Modifier.size(18.dp)) },
        singleLine = true,
        enabled = false,
        colors = OutlinedTextFieldDefaults.colors(
            disabledTextColor = MaterialTheme.colorScheme.onSurface,
            disabledBorderColor = MaterialTheme.colorScheme.outline,
            disabledLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
            disabledLeadingIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
            disabledPlaceholderColor = MaterialTheme.colorScheme.onSurfaceVariant,
        ),
        modifier = modifier.fillMaxWidth().clickable { showPicker = true },
    )

    if (showPicker) {
        val initialMillis = value?.let {
            runCatching { LocalDate.parse(it).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli() }.getOrNull()
        } ?: Instant.now().toEpochMilli()
        val state = rememberDatePickerState(initialSelectedDateMillis = initialMillis)

        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(onClick = {
                    val millis = state.selectedDateMillis
                    if (millis != null) {
                        onValueChange(Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate().toString())
                    }
                    showPicker = false
                }) { Text(t(StringKey.DATE_PICKER_USE_DATE)) }
            },
            dismissButton = {
                if (allowClear) {
                    TextButton(onClick = { onValueChange(null); showPicker = false }) { Text(t(StringKey.DATE_PICKER_NO_DATE)) }
                } else {
                    TextButton(onClick = { onValueChange(LocalDate.now().toString()); showPicker = false }) { Text(t(StringKey.DATE_PICKER_TODAY)) }
                }
            },
        ) {
            DatePicker(state = state)
        }
    }
}
