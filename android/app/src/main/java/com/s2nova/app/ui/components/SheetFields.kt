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
        fontSize = 11.5.sp,
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
        textStyle = style.copy(color = textColor),
        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        visualTransformation = if (grouped) ThousandsGroupingVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
        modifier = Modifier.fillMaxWidth(),
        decorationBox = { inner ->
            Box {
                if (value.isEmpty()) Text(placeholder, style = style.copy(color = NovaColors.current.textDim, fontWeight = FontWeight.SemiBold))
                inner()
            }
        },
    )
}

// Mockup pill(): the same unselected/selected treatment as Movimientos' filters.
@Composable
fun SheetPill(label: String, selected: Boolean, onClick: () -> Unit) {
    val colors = NovaColors.current
    Text(
        label,
        fontSize = 12.sp,
        fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold,
        color = if (selected) MaterialTheme.colorScheme.onPrimary else colors.pillText,
        maxLines = 1,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) MaterialTheme.colorScheme.primary else colors.pillSurface)
            .border(1.dp, if (selected) Color.Transparent else colors.pillBorder, RoundedCornerShape(50))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 9.dp),
    )
}

// Mockup amount box: muted "$" at 18 ExtraBold, then the grouped digits.
@Composable
fun SheetAmountBox(value: String, onValueChange: (String) -> Unit) {
    SheetBox(padding = PaddingValues(horizontal = 16.dp, vertical = 15.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("$", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Box(modifier = Modifier.weight(1f).padding(start = 8.dp)) {
                SheetInput(
                    value = value,
                    onValueChange = { onValueChange(it.filter { c -> c.isDigit() }.take(12)) },
                    placeholder = "0",
                    style = TextStyle(fontSize = 18.sp, fontWeight = FontWeight.ExtraBold),
                    keyboardType = KeyboardType.Number,
                    grouped = true,
                )
            }
        }
    }
}

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
