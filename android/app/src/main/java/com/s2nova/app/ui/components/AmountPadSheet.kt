package com.s2nova.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.data.Currencies
import com.s2nova.app.data.formatMoney
import com.s2nova.app.ui.screens.addtransaction.AmountPad
import com.s2nova.app.ui.screens.addtransaction.GridOf
import com.s2nova.app.ui.screens.addtransaction.NmPrefs
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.tr
import com.s2nova.app.ui.StringKey

// "Nuevo movimiento"'s amount pad (NEW_MOVEMENT.md §3) as a sheet any money
// field can open: the Teclado/Calculadora switch (remembered per device),
// the display with the live "a + b =" line, and "Listo · $total". `expr` is
// the typed expression; read it with AmountPad.eval().
@Composable
fun AmountPadSheet(
    expr: String,
    onExpr: (String) -> Unit,
    currency: String,
    title: String,
    onDone: () -> Unit,
    calc: Boolean? = null,
    onCalc: ((Boolean) -> Unit)? = null,
) {
    val context = LocalContext.current
    val colors = NovaColors.current
    var ownCalc by remember { mutableStateOf(NmPrefs.padMode(context)) }
    val isCalc = calc ?: ownCalc
    val value = AmountPad.eval(expr)
    val hasOps = AmountPad.hasOps(expr)
    val done = {
        onExpr(if (hasOps) AmountPad.numStr(value) else expr.removeSuffix(","))
        onDone()
    }
    NovaDraftSheet(onDismiss = done, scrimAlpha = 0.45f, bottomPadding = 18.dp) {
        Row(Modifier.fillMaxWidth().padding(start = 2.dp, end = 2.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(title, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
            Row(
                Modifier.clip(RoundedCornerShape(999.dp)).background(colors.bgDeep).border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(999.dp)).padding(3.dp),
                horizontalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                listOf(false to tr(StringKey.NM_KEYPAD), true to tr(StringKey.NM_CALCULATOR)).forEach { (mode, label) ->
                    val on = isCalc == mode
                    Row(
                        Modifier.clip(RoundedCornerShape(999.dp)).background(if (on) MaterialTheme.colorScheme.primary else Color.Transparent)
                            .noRippleClick {
                                ownCalc = mode
                                onCalc?.invoke(mode)
                                NmPrefs.setPadMode(context, mode)
                            }.padding(horizontal = 11.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        V2Icon(if (mode) V2Icons.calc else V2Icons.keypad, if (on) Color.White else MaterialTheme.colorScheme.onSurfaceVariant, 14.dp)
                        Text(label, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = if (on) Color.White else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
        Column(
            Modifier.fillMaxWidth().padding(bottom = 12.dp).clip(RoundedCornerShape(18.dp)).background(colors.bgDeep)
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(18.dp)).padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 12.dp),
            horizontalAlignment = Alignment.End,
        ) {
            Text(
                if (hasOps) AmountPad.format(expr) + " =" else "", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = colors.textDim,
                maxLines = 1, modifier = Modifier.heightIn(min = 18.dp), style = TextStyle(fontFeatureSettings = TNUM),
            )
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(currency, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = colors.accentText, modifier = Modifier.padding(bottom = 7.dp))
                Text(
                    AmountPad.display(expr), fontSize = 34.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-1).sp,
                    color = if (value > 0) MaterialTheme.colorScheme.onBackground else colors.textDim, style = TextStyle(fontFeatureSettings = TNUM), maxLines = 1,
                )
            }
        }
        val press = { k: String -> onExpr(AmountPad.press(expr, k)) }
        if (!isCalc) {
            GridOf(AmountPad.KEYPAD, 3, 8.dp, 8.dp) { k -> PadKey(k, 56.dp, Modifier.fillMaxWidth()) { press(k) } }
        } else {
            val rows = listOf(listOf("C", "⌫", "÷", "×"), listOf("7", "8", "9", "−"), listOf("4", "5", "6", "+"))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                rows.forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { row.forEach { k -> PadKey(k, 50.dp, Modifier.weight(1f)) { press(k) } } }
                }
                // "=" spans the last two rows; widths match the 4-column rows above.
                BoxWithConstraints(Modifier.fillMaxWidth()) {
                    val k = (maxWidth - 24.dp) / 4
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Column(Modifier.width(k * 3 + 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { listOf("1", "2", "3").forEach { key -> PadKey(key, 50.dp, Modifier.weight(1f)) { press(key) } } }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { listOf("00", "0", ",").forEach { key -> PadKey(key, 50.dp, Modifier.weight(1f)) { press(key) } } }
                        }
                        PadKey("=", 108.dp, Modifier.width(k)) { press("=") }
                    }
                }
            }
        }
        V2Button(if (value > 0) tr(StringKey.NM_DONE) + " · " + formatMoney(value, currency) else tr(StringKey.COMMON_CLOSE), enabled = value > 0, onClick = { done() }, modifier = Modifier.padding(top = 12.dp), verticalPadding = 15.dp, fontSize = 14.sp)
    }
}

@Composable
private fun PadKey(k: String, height: Dp, modifier: Modifier, onClick: () -> Unit) {
    val primary = MaterialTheme.colorScheme.primary
    val isOp = k in AmountPad.OPS
    val bg = when {
        isOp -> primary.copy(alpha = 0.16f)
        k == "=" -> primary.copy(alpha = 0.32f)
        else -> MaterialTheme.colorScheme.surface
    }
    val border = if (isOp || k == "=") Color.Transparent else MaterialTheme.colorScheme.outline
    val color = when {
        isOp -> NovaColors.current.accentText
        k == "=" -> Color.White
        k == "C" || k == "⌫" -> MaterialTheme.colorScheme.onSurfaceVariant
        else -> MaterialTheme.colorScheme.onBackground
    }
    val size = when (k) { "C" -> 15.sp; "⌫" -> 18.sp; "=" -> 24.sp; else -> if (isOp) 22.sp else 20.sp }
    Box(
        modifier.height(height).clip(RoundedCornerShape(14.dp)).background(bg).border(1.dp, border, RoundedCornerShape(14.dp)).noRippleClick(onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(k, fontSize = size, fontWeight = if (k == "C" || k == "⌫") FontWeight.ExtraBold else FontWeight.Bold, color = color)
    }
}

enum class AmountBoxStyle { INPUT, SHEET }

// A money field that opens AmountPadSheet — the same entry as "Nuevo
// movimiento"'s amount — instead of the system keyboard. Looks like the
// field it replaces: InputBox ("$ 0", MoneyInput) or SheetBox (muted "$"
// then the amount). `expr` holds the typed expression.
@Composable
fun AmountField(
    expr: String,
    onExpr: (String) -> Unit,
    currency: String,
    title: String = tr(StringKey.NM_AMOUNT),
    fontSize: TextUnit = 18.sp,
    style: AmountBoxStyle = AmountBoxStyle.INPUT,
    enabled: Boolean = true,
) {
    var open by remember { mutableStateOf(false) }
    val symbol = Currencies.symbol(currency)
    val shown = if (expr.isEmpty()) "0" else AmountPad.display(expr)
    val textColor = if (expr.isEmpty()) NovaColors.current.textDim else MaterialTheme.colorScheme.onBackground
    val onClick = { if (enabled) open = true }
    val content: @Composable () -> Unit = {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(if (style == AmountBoxStyle.SHEET) 8.dp else 10.dp)) {
            Text(symbol, fontSize = fontSize, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurfaceVariant, style = TextStyle(fontFeatureSettings = TNUM))
            Text(shown, fontSize = fontSize, fontWeight = FontWeight.ExtraBold, color = textColor, maxLines = 1, style = TextStyle(fontFeatureSettings = TNUM))
        }
    }
    when (style) {
        AmountBoxStyle.INPUT -> InputBox(Modifier.noRippleClick(onClick), horizontal = 16.dp, vertical = 13.dp) { content() }
        AmountBoxStyle.SHEET -> SheetBox(padding = PaddingValues(horizontal = 16.dp, vertical = 15.dp), onClick = onClick) { content() }
    }
    if (open) AmountPadSheet(expr = expr, onExpr = onExpr, currency = currency, title = title, onDone = { open = false })
}
