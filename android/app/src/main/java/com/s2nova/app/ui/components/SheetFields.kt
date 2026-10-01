package com.s2nova.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.ui.ThousandsGroupingVisualTransformation
import com.s2nova.app.ui.theme.NovaColors

// Field pieces shared by the v2 draft sheets (Programados, Presupuestos,
// Metas, Préstamos): the mockup's 11.5 bold label, the 1px --line2 box,
// a borderless input and the pill() chip.

@Composable
fun SheetLabel(text: String) {
    Text(
        text,
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(bottom = 8.dp),
    )
}

// Mockup field box: 1px --line2 border, 14dp corners.
@Composable
fun SheetBox(padding: PaddingValues, onClick: (() -> Unit)? = null, content: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(14.dp))
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(padding),
    ) { content() }
}

@Composable
fun SheetInput(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    style: TextStyle,
    keyboardType: KeyboardType = KeyboardType.Text,
    grouped: Boolean = false,
) {
    val textColor = MaterialTheme.colorScheme.onBackground
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = true,
        // The caller's style carries size and weight; the family is the app's.
        textStyle = com.s2nova.app.ui.theme.NovaDefaultTextStyle.merge(style).copy(color = textColor),
        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        visualTransformation = if (grouped) ThousandsGroupingVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
        modifier = Modifier.fillMaxWidth(),
        decorationBox = { inner ->
            Box {
                if (value.isEmpty()) Text(placeholder, style = com.s2nova.app.ui.theme.NovaDefaultTextStyle.merge(style).copy(color = NovaColors.current.textDim, fontWeight = FontWeight.Medium))
                inner()
            }
        },
    )
}

// The shared chip (V2Pill, DESIGN-SYSTEM.md §6.5).
@Composable
fun SheetPill(label: String, selected: Boolean, onClick: () -> Unit) = com.s2nova.app.ui.components.V2Pill(label, selected, onClick)

// Mockup shortWallet: "Bancolombia — Ahorros" reads as "Bancolombia".
fun shortWalletName(name: String): String = name.substringBefore('—').trim()

// Mockup date box (loanDueStyle / "Próximo cobro"): calendar glyph plus the
// long date, or a --dim placeholder; opens the Material date picker, whose
// dismiss button clears the date when `allowClear` (optional dates).
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun SheetDateBox(value: String?, placeholder: String, allowClear: Boolean, onValueChange: (String?) -> Unit) {
    val t = com.s2nova.app.ui.rememberStrings()
    val language = com.s2nova.app.ui.rememberAppLanguage()
    var picking by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }
    SheetBox(padding = PaddingValues(horizontal = 14.dp, vertical = 13.dp), onClick = { picking = true }) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            androidx.compose.material3.Icon(
                MockupIcons.Calendar,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(16.dp),
            )
            Text(
                value?.let { com.s2nova.app.ui.longDateLabel(it, language) } ?: placeholder,
                fontSize = 13.5.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (value != null) MaterialTheme.colorScheme.onBackground else NovaColors.current.textDim,
                modifier = Modifier.padding(start = 10.dp),
            )
        }
    }
    if (picking) {
        val initial = (value ?: java.time.LocalDate.now().toString())
        val state = androidx.compose.material3.rememberDatePickerState(
            initialSelectedDateMillis = java.time.LocalDate.parse(initial).atStartOfDay(java.time.ZoneOffset.UTC).toInstant().toEpochMilli(),
        )
        androidx.compose.material3.DatePickerDialog(
            onDismissRequest = { picking = false },
            confirmButton = {
                androidx.compose.material3.TextButton(onClick = {
                    state.selectedDateMillis?.let {
                        onValueChange(java.time.Instant.ofEpochMilli(it).atZone(java.time.ZoneOffset.UTC).toLocalDate().toString())
                    }
                    picking = false
                }) { Text(t(com.s2nova.app.ui.StringKey.DATE_PICKER_USE_DATE)) }
            },
            dismissButton = {
                androidx.compose.material3.TextButton(onClick = {
                    onValueChange(if (allowClear) null else java.time.LocalDate.now().toString())
                    picking = false
                }) { Text(t(if (allowClear) com.s2nova.app.ui.StringKey.DATE_PICKER_NO_DATE else com.s2nova.app.ui.StringKey.DATE_PICKER_TODAY)) }
            },
        ) { androidx.compose.material3.DatePicker(state = state) }
    }
}
