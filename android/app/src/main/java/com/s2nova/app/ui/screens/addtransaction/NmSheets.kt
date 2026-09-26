package com.s2nova.app.ui.screens.addtransaction

import android.graphics.Bitmap
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.Currencies
import com.s2nova.app.data.MONTHS_ES
import com.s2nova.app.data.fmtDate
import com.s2nova.app.data.fmtDateLong
import com.s2nova.app.data.formatMoney
import com.s2nova.app.data.model.BudgetProgress
import com.s2nova.app.data.model.CounterpartyKind
import com.s2nova.app.data.model.Goal
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.ui.Snack
import com.s2nova.app.ui.components.BareField
import com.s2nova.app.ui.components.FieldLabel
import com.s2nova.app.ui.components.GlyphMark
import com.s2nova.app.ui.components.InputBox
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.PillRow
import com.s2nova.app.ui.components.PlanMark
import com.s2nova.app.ui.components.RadioRow
import com.s2nova.app.ui.components.SheetHeader
import com.s2nova.app.ui.components.SheetTextAction
import com.s2nova.app.ui.components.SymbolBadge
import com.s2nova.app.ui.components.TNUM
import com.s2nova.app.ui.components.TextLink
import com.s2nova.app.ui.components.V2Button
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.components.V2Pill
import com.s2nova.app.ui.components.V2Switch
import com.s2nova.app.ui.components.noRippleClick
import com.s2nova.app.ui.theme.NovaColors
import java.io.ByteArrayOutputStream
import java.time.LocalDate

@Composable
fun NmSheets(
    s: NmState,
    cur: String,
    wcur: String,
    walletName: String,
    currencies: List<String>,
    rateTo: (String, String) -> Double,
    autoBudgetLabel: String?,
    customBudgets: List<BudgetProgress>,
    principal: String,
    goals: List<Goal>,
    onOpenCategories: () -> Unit,
    onOpenCurrencies: () -> Unit,
) {
    val close = { s.sheet = null }
    when (s.sheet) {
        NmSheet.CATEGORY -> CategorySheet(s, onOpenCategories)
        NmSheet.SUB -> SubSheet(s)
        NmSheet.PAD -> PadSheet(s, cur)
        NmSheet.WHEN -> WhenSheet(s)
        NmSheet.REPEAT -> RepeatSheet(s)
        NmSheet.CURRENCY -> NovaDraftSheet(onDismiss = close) {
            SheetHeader(
                "Moneda del movimiento",
                "$walletName está en $wcur. Si el movimiento fue en otra moneda, guardamos el monto original y lo convertimos a $wcur.",
            )
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                currencies.forEach { code ->
                    RadioRow(cur == code, { s.currency = if (code == wcur) null else code }, leading = { SymbolBadge(Currencies.symbol(code)) }) {
                        Column(Modifier.weight(1f)) {
                            Text(Currencies.name(code) + " · " + code, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                            Text(
                                if (code == wcur) "Moneda de $walletName" else "1 $code = " + formatMoney(rateTo(code, wcur), wcur) + " " + wcur,
                                fontSize = 11.sp, color = NovaColors.current.textDim, modifier = Modifier.padding(top = 2.dp), style = TextStyle(fontFeatureSettings = TNUM),
                            )
                        }
                    }
                }
            }
            TextLink("Gestionar monedas en Ajustes →", { s.sheet = null; onOpenCurrencies() }, Modifier.padding(start = 4.dp, top = 16.dp))
            V2Button("Listo", onClick = close, modifier = Modifier.padding(top = 16.dp))
        }
        NmSheet.ATTACH -> AttachSheet(s)
        NmSheet.FROM -> FromSheet(s)
        NmSheet.BPICK -> NovaDraftSheet(onDismiss = close) {
            SheetHeader(
                "Presupuesto personalizado",
                if (autoBudgetLabel != null) "Este gasto ya suma a $autoBudgetLabel por su categoría. Elige un presupuesto personalizado si también cuenta ahí."
                else "Ningún presupuesto por categoría cubre ${AppContainer.categoryRepository.name(s.leaf)}. Puedes asignarlo a uno personalizado.",
            )
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                RadioRow(s.customBudgetId == null, { s.customBudgetId = null }) {
                    BudgetPickText("Ninguno", "Solo cuenta por su categoría")
                }
                customBudgets.forEach { b ->
                    RadioRow(s.customBudgetId == b.budget.id, { s.customBudgetId = b.budget.id }, leading = { PlanMark(b.budget.icon, 36.dp) }) {
                        BudgetPickText(
                            b.budget.name.orEmpty(),
                            formatMoney(b.spent, principal) + " de " + formatMoney(b.budget.limit, principal) +
                                (if (b.budget.startDate != null && b.budget.endDate != null) " · " + fmtDate(b.budget.startDate) + " – " + fmtDate(b.budget.endDate) else ""),
                        )
                    }
                }
            }
            V2Button("Listo", onClick = close, modifier = Modifier.padding(top = 16.dp))
        }
        NmSheet.MORE -> NovaDraftSheet(onDismiss = close) {
            SheetHeader("Más opciones", bottom = 16.dp)
            Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    Column(Modifier.weight(1f)) {
                        Text(if (s.isIncome) "Es dinero que me prestaron" else "Es dinero que presté", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                        Text("Se registra en Planes › Préstamos con contraparte y vencimiento.", fontSize = 11.sp, color = NovaColors.current.textDim, modifier = Modifier.padding(top = 2.dp))
                    }
                    V2Switch(s.loan) { s.loan = !s.loan }
                }
                Column {
                    FieldLabel("Aporte a una meta")
                    PillRow {
                        V2Pill("Ninguno", s.goalId == null, { s.goalId = null })
                        goals.forEach { g -> V2Pill(g.name, s.goalId == g.id, { s.goalId = g.id }) }
                    }
                }
                V2Button("Listo", onClick = close)
            }
        }
        null -> Unit
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.BudgetPickText(label: String, detail: String) {
    Column(Modifier.weight(1f)) {
        Text(label, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
        Text(detail, fontSize = 11.sp, color = NovaColors.current.textDim, modifier = Modifier.padding(top = 2.dp), style = TextStyle(fontFeatureSettings = TNUM))
    }
}

// gridLabelStyle(on).
@Composable
fun GridLabel(label: String, on: Boolean) {
    Text(
        label,
        fontSize = 10.5.sp,
        lineHeight = 13.sp,
        fontWeight = if (on) FontWeight.ExtraBold else FontWeight.SemiBold,
        color = if (on) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
        style = TextStyle(hyphens = androidx.compose.ui.text.style.Hyphens.Auto, lineBreak = androidx.compose.ui.text.style.LineBreak.Paragraph),
        modifier = Modifier.widthIn(max = 74.dp),
    )
}

// The 52 dp category chip of the grid sheets ('29' fill, '3d' + 2 dp ring when on).
@Composable
fun GridChip(paths: List<String>, color: Color, on: Boolean, box: Dp = 52.dp, inner: Dp = 34.dp) {
    Box(
        Modifier.size(box).clip(CircleShape).background(color.copy(alpha = if (on) 0.24f else 0.16f))
            .border(if (on) 2.dp else 1.5.dp, if (on) color else Color.Transparent, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        V2Icon(paths, color, inner * 0.46f, 2.25f)
    }
}

// n-column grid with the mockup's gaps.
@Composable
fun <T> GridOf(items: List<T>, columns: Int, rowGap: Dp, colGap: Dp, cell: @Composable (T) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(rowGap)) {
        items.chunked(columns).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(colGap)) {
                row.forEach { Box(Modifier.weight(1f), contentAlignment = Alignment.TopCenter) { cell(it) } }
                repeat(columns - row.size) { Box(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun CategorySheet(s: NmState, onOpenCategories: () -> Unit) {
    val repo = AppContainer.categoryRepository
    NovaDraftSheet(onDismiss = { s.sheet = null }) {
        Column(Modifier.padding(start = 4.dp, end = 4.dp, bottom = 18.dp)) {
            Text(if (s.isIncome) "¿De dónde viene el ingreso?" else "¿En qué gastaste?", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
            Text("Paso 1 de 2 · después ingresas el monto", fontSize = 11.sp, color = NovaColors.current.textDim, modifier = Modifier.padding(top = 4.dp))
        }
        Column(Modifier.heightIn(max = 520.dp).verticalScroll(rememberScrollState())) {
            GridOf(repo.parents(s.isIncome, includeHidden = false), 4, 18.dp, 8.dp) { p ->
                val on = s.category == p.id
                Column(
                    Modifier.noRippleClick {
                        val subs = repo.children(p.id)
                        s.category = p.id
                        s.sub = null
                        s.catPicked = true
                        s.subSheetFor = if (subs.isNotEmpty()) p.id else null
                        s.sheet = if (subs.isNotEmpty()) NmSheet.SUB else NmSheet.PAD
                    },
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(7.dp),
                ) {
                    GridChip(repo.glyph(p.id), Color(p.color), on)
                    GridLabel(p.name, on)
                }
            }
        }
        TextLink("Gestionar categorías en Ajustes →", { s.sheet = null; onOpenCategories() }, Modifier.padding(start = 4.dp, end = 4.dp, top = 18.dp))
    }
}

@Composable
private fun SubSheet(s: NmState) {
    val repo = AppContainer.categoryRepository
    val parent = s.subSheetFor ?: s.category
    val color = Color(repo.color(parent))
    NovaDraftSheet(onDismiss = { s.sheet = null }) {
        Row(Modifier.padding(start = 4.dp, end = 4.dp, bottom = 18.dp), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Subcategoría", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
            Text(repo.name(parent), fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold, color = NovaColors.current.textDim, modifier = Modifier.padding(bottom = 1.dp))
        }
        val items = listOf<Pair<String?, String>>(null to "Ninguna") + repo.children(parent).map { it.id to it.name }
        GridOf(items, 4, 18.dp, 8.dp) { (id, name) ->
            val on = s.sub == id
            Column(
                Modifier.noRippleClick {
                    s.sub = id
                    s.catPicked = true
                    s.subSheetFor = null
                    s.sheet = NmSheet.PAD
                },
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(7.dp),
            ) {
                GridChip(repo.glyph(id ?: parent), color, on)
                GridLabel(name, on)
            }
        }
        TextLink("← Cambiar categoría", { s.sheet = NmSheet.CATEGORY }, Modifier.padding(start = 4.dp, end = 4.dp, top = 18.dp))
    }
}

@Composable
private fun PadSheet(s: NmState, cur: String) {
    val context = LocalContext.current
    val colors = NovaColors.current
    val value = s.value
    val hasOps = AmountPad.hasOps(s.expr)
    val done = {
        s.expr = if (hasOps) AmountPad.numStr(value) else s.expr.removeSuffix(",")
        s.sheet = null
    }
    NovaDraftSheet(onDismiss = done, scrimAlpha = 0.45f, bottomPadding = 18.dp) {
        Row(Modifier.fillMaxWidth().padding(start = 2.dp, end = 2.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            val context2 = "Monto" + if (s.isTransfer) " · Transferencia" else if (s.catPicked) " · " + AppContainer.categoryRepository.label(s.leaf) else ""
            Text(context2, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
            Row(
                Modifier.clip(RoundedCornerShape(999.dp)).background(colors.bgDeep).border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(999.dp)).padding(3.dp),
                horizontalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                listOf(false to "Teclado", true to "Calculadora").forEach { (calc, label) ->
                    val on = s.calc == calc
                    Row(
                        Modifier.clip(RoundedCornerShape(999.dp)).background(if (on) MaterialTheme.colorScheme.primary else Color.Transparent)
                            .noRippleClick { s.calc = calc; NmPrefs.setPadMode(context, calc) }.padding(horizontal = 11.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        V2Icon(if (calc) V2Icons.calc else V2Icons.keypad, if (on) Color.White else MaterialTheme.colorScheme.onSurfaceVariant, 14.dp)
                        Text(label, fontSize = 11.5.sp, fontWeight = FontWeight.ExtraBold, color = if (on) Color.White else MaterialTheme.colorScheme.onSurfaceVariant)
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
                if (hasOps) AmountPad.format(s.expr) + " =" else "", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = colors.textDim,
                maxLines = 1, modifier = Modifier.heightIn(min = 18.dp), style = TextStyle(fontFeatureSettings = TNUM),
            )
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(cur, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = colors.accentText, modifier = Modifier.padding(bottom = 7.dp))
                Text(
                    AmountPad.display(s.expr), fontSize = 34.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-1).sp,
                    color = if (value > 0) MaterialTheme.colorScheme.onBackground else colors.textDim, style = TextStyle(fontFeatureSettings = TNUM), maxLines = 1,
                )
            }
        }
        val press = { k: String -> s.expr = AmountPad.press(s.expr, k) }
        if (!s.calc) {
            GridOf(AmountPad.KEYPAD, 3, 8.dp, 8.dp) { k -> PadKey(k, 56.dp, Modifier.fillMaxWidth()) { press(k) } }
        } else {
            val rows = listOf(listOf("C", "⌫", "÷", "×"), listOf("7", "8", "9", "−"), listOf("4", "5", "6", "+"))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                rows.forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { row.forEach { k -> PadKey(k, 50.dp, Modifier.weight(1f)) { press(k) } } }
                }
                // "=" spans the last two rows; widths match the 4-column rows above.
                androidx.compose.foundation.layout.BoxWithConstraints(Modifier.fillMaxWidth()) {
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
        V2Button(if (value > 0) "Listo · " + formatMoney(value, cur) else "Cerrar", enabled = value > 0, onClick = { done() }, modifier = Modifier.padding(top = 12.dp), verticalPadding = 15.dp, fontSize = 14.sp)
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

@Composable
private fun WhenSheet(s: NmState) {
    val context = LocalContext.current
    val colors = NovaColors.current
    val today = s.today
    val done = { s.sheet = s.whenBack; s.whenBack = null }
    NovaDraftSheet(onDismiss = done) {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            SheetHeader("Fecha y hora", fmtDateLong(s.date.toString()) + " · " + s.time)
            val last = NmPrefs.lastWhen(context)
            PillRow {
                V2Pill("Ahora", s.date == today && s.time == s.nowTime, { s.date = today; s.time = s.nowTime; s.cal = today.withDayOfMonth(1) })
                V2Pill("Ayer", s.date == today.minusDays(1) && (last == null || s.time != last.second), { s.date = today.minusDays(1); s.cal = s.date.withDayOfMonth(1) })
                V2Pill("Anteayer", s.date == today.minusDays(2) && (last == null || s.time != last.second), { s.date = today.minusDays(2); s.cal = s.date.withDayOfMonth(1) })
                if (last != null) {
                    V2Pill("Como el anterior · ${fmtDate(last.first)}, ${last.second}", s.date.toString() == last.first && s.time == last.second, {
                        s.date = LocalDate.parse(last.first); s.time = last.second; s.cal = s.date.withDayOfMonth(1)
                    })
                }
            }
            Text("Programar a futuro", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 16.dp, bottom = 8.dp))
            val nextFirst = today.plusMonths(1).withDayOfMonth(1)
            PillRow {
                listOf("Mañana" to today.plusDays(1), "En una semana" to today.plusWeeks(1), "1 de ${MONTHS_ES[nextFirst.monthValue - 1]}" to nextFirst).forEach { (label, d) ->
                    V2Pill(label, s.date == d, { s.date = d; s.cal = d.withDayOfMonth(1) })
                }
            }
            Row(Modifier.fillMaxWidth().padding(start = 2.dp, end = 2.dp, top = 16.dp, bottom = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                NavCircle("←") { s.cal = s.cal.minusMonths(1) }
                Text(
                    MONTHS_ES[s.cal.monthValue - 1].replaceFirstChar { it.uppercase() } + " " + s.cal.year,
                    fontSize = 13.5.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground, textAlign = TextAlign.Center, modifier = Modifier.weight(1f),
                )
                NavCircle("→") { s.cal = s.cal.plusMonths(1) }
            }
            MonthGrid(s.cal, s.date, today) { s.date = it }
            Row(
                Modifier.padding(top = 14.dp).fillMaxWidth().height(48.dp).clip(RoundedCornerShape(14.dp))
                    .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(14.dp))
                    .noRippleClick {
                        val (h, m) = s.time.split(':').map { it.toInt() }
                        android.app.TimePickerDialog(context, { _, hh, mm -> s.time = "%02d:%02d".format(hh, mm) }, h, m, true).show()
                    }.padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                V2Icon(V2Icons.clock, MaterialTheme.colorScheme.onSurfaceVariant, 16.dp)
                Text("Hora", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
                Text(s.time, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground, style = TextStyle(fontFeatureSettings = TNUM))
            }
            val future = s.future
            val note = when {
                future -> "Fecha futura: se guarda como programado y no afecta el saldo hasta que llegue la fecha y lo confirmes."
                s.date < today -> "Fecha pasada: se registra con esa fecha y cuenta en el mes que corresponde."
                else -> "Se registra con la fecha y hora de hoy."
            }
            Text(
                note, fontSize = 11.5.sp, lineHeight = 17.sp, color = if (future) colors.warning else colors.textDim,
                modifier = Modifier.padding(top = 12.dp).fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(if (future) Color(0x1FF0B429) else Color.Transparent)
                    .then(if (future) Modifier.padding(horizontal = 12.dp, vertical = 10.dp) else Modifier),
            )
            V2Button("Listo", onClick = { done() }, modifier = Modifier.padding(top = 14.dp))
        }
    }
}

@Composable
fun NavCircle(label: String, onClick: () -> Unit) {
    Box(
        Modifier.size(34.dp).clip(CircleShape).border(1.dp, MaterialTheme.colorScheme.outlineVariant, CircleShape).noRippleClick(onClick),
        contentAlignment = Alignment.Center,
    ) { Text(label, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
}

// buildCells: Monday-first month grid, 38 dp cells.
@Composable
fun MonthGrid(month: LocalDate, selected: LocalDate?, today: LocalDate, onPick: (LocalDate) -> Unit) {
    val colors = NovaColors.current
    val primary = MaterialTheme.colorScheme.primary
    Row(Modifier.fillMaxWidth().padding(bottom = 6.dp), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
        listOf("L", "M", "M", "J", "V", "S", "D").forEach {
            Text(it, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = colors.textDim, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
        }
    }
    val lead = month.dayOfWeek.value - 1
    val days = month.lengthOfMonth()
    val cells = List(lead) { null } + (1..days).map { month.withDayOfMonth(it) }
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        cells.chunked(7).forEach { week ->
            Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                week.forEach { d ->
                    if (d == null) Box(Modifier.weight(1f).height(38.dp))
                    else {
                        val on = d == selected
                        val isToday = d == today
                        Box(
                            Modifier.weight(1f).height(38.dp).clip(RoundedCornerShape(11.dp)).background(if (on) primary else Color.Transparent)
                                .border(1.dp, if (!on && isToday) colors.accentText else Color.Transparent, RoundedCornerShape(11.dp)).noRippleClick { onPick(d) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                d.dayOfMonth.toString(), fontSize = 13.sp, fontWeight = if (on || isToday) FontWeight.ExtraBold else FontWeight.SemiBold,
                                color = if (on) Color.White else if (isToday) colors.accentText else MaterialTheme.colorScheme.onBackground,
                            )
                        }
                    }
                }
                repeat(7 - week.size) { Box(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun RepeatSheet(s: NmState) {
    val rp = s.rpDraft ?: RepeatDraft()
    val set = { r: RepeatDraft -> s.rpDraft = r }
    NovaDraftSheet(onDismiss = { s.sheet = null }) {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            SheetHeader("Repetir", repeatSummary(rp.takeIf { it.freq != null }, s.date))
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                PillRow {
                    V2Pill("No se repite", rp.freq == null, { set(rp.copy(freq = null)) })
                    Freq.entries.forEach { f -> V2Pill(f.label, rp.freq == f, { set(rp.copy(freq = f)) }) }
                }
                if (rp.freq != null) {
                    Column {
                        FieldLabel("Termina")
                        PillRow {
                            listOf(RepeatEnd.COUNT to "Después de", RepeatEnd.UNTIL to "En una fecha", RepeatEnd.NEVER to "Sin fin").forEach { (k, label) ->
                                V2Pill(label, rp.end == k, { set(rp.copy(end = k)) })
                            }
                        }
                        if (rp.end == RepeatEnd.COUNT) {
                            Stepper(rp.count.toString() + if (rp.count == 1) " vez" else " veces", { set(rp.copy(count = (rp.count - 1).coerceAtLeast(2))) }, { set(rp.copy(count = (rp.count + 1).coerceAtMost(99))) })
                        }
                        if (rp.end == RepeatEnd.UNTIL) {
                            DateBox(rp.until, Modifier.padding(top = 10.dp)) { set(rp.copy(until = it)) }
                        }
                    }
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(14.dp))
                            .noRippleClick { s.whenBack = NmSheet.REPEAT; s.cal = s.date.withDayOfMonth(1); s.sheet = NmSheet.WHEN }.padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        V2Icon(V2Icons.cal, MaterialTheme.colorScheme.onSurfaceVariant, 16.dp)
                        Text(
                            "Empieza " + (if (s.date == s.today) "hoy" else "el " + fmtDateLong(s.date.toString())) + " · " + s.time,
                            fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f), style = TextStyle(fontFeatureSettings = TNUM),
                        )
                        Text("Cambiar", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = NovaColors.current.accentText)
                    }
                    Column {
                        FieldLabel("En cada fecha")
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            ConfirmModeRow("Pedirme confirmación", "Te avisamos en cada fecha. No mueve saldo hasta que confirmes.", !rp.auto) { set(rp.copy(auto = false)) }
                            ConfirmModeRow("Registrar automáticamente", "Se registra solo en cada fecha y te avisamos.", rp.auto) { set(rp.copy(auto = true)) }
                        }
                    }
                }
                V2Button("Aplicar", onClick = { s.repeat = rp.takeIf { it.freq != null }; s.sheet = null; s.rpDraft = null })
            }
        }
    }
}

@Composable
fun ConfirmModeRow(label: String, detail: String, selected: Boolean, onClick: () -> Unit) {
    RadioRow(selected, onClick) {
        Column(Modifier.weight(1f)) {
            Text(label, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
            Text(detail, fontSize = 11.sp, lineHeight = 15.sp, color = NovaColors.current.textDim, modifier = Modifier.padding(top = 2.dp))
        }
    }
}

@Composable
fun Stepper(label: String, onMinus: () -> Unit, onPlus: () -> Unit) {
    Row(Modifier.padding(top = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        StepBtn("−", onMinus)
        Text(label, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground, textAlign = TextAlign.Center, modifier = Modifier.weight(1f), style = TextStyle(fontFeatureSettings = TNUM))
        StepBtn("+", onPlus)
    }
}

@Composable
private fun StepBtn(label: String, onClick: () -> Unit) {
    Box(
        Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(12.dp)).noRippleClick(onClick),
        contentAlignment = Alignment.Center,
    ) { Text(label, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground) }
}

// <input type="date"> box: 12×14 padding, 13 sp / 700; opens the system picker.
@Composable
fun DateBox(value: String, modifier: Modifier = Modifier, placeholder: String = "dd/mm/aaaa", onPick: (String) -> Unit) {
    val context = LocalContext.current
    Box(
        modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(14.dp))
            .noRippleClick {
                val d = runCatching { LocalDate.parse(value) }.getOrDefault(LocalDate.now())
                android.app.DatePickerDialog(context, { _, y, m, day -> onPick(LocalDate.of(y, m + 1, day).toString()) }, d.year, d.monthValue - 1, d.dayOfMonth).show()
            }.padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        val shown = runCatching { LocalDate.parse(value) }.getOrNull()?.let { "%02d/%02d/%04d".format(it.dayOfMonth, it.monthValue, it.year) }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(shown ?: placeholder, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = if (shown != null) MaterialTheme.colorScheme.onBackground else NovaColors.current.textDim, style = TextStyle(fontFeatureSettings = TNUM), modifier = Modifier.weight(1f))
            V2Icon(V2Icons.cal, MaterialTheme.colorScheme.onBackground, 15.dp)
        }
    }
}

@Composable
private fun AttachSheet(s: NmState) {
    val context = LocalContext.current
    fun fromUri(uri: Uri?) {
        uri ?: return
        val resolver = context.contentResolver
        val mime = resolver.getType(uri) ?: "image/jpeg"
        var name = "comprobante"
        resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c -> if (c.moveToFirst()) name = c.getString(0) ?: name }
        val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: return
        if (bytes.size > 10 * 1024 * 1024) { Snack.show("El archivo supera 10 MB."); return }
        s.attach = AttachDraft(name, mime, bytes)
        s.sheet = null
    }
    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicturePreview()) { bmp: Bitmap? ->
        if (bmp != null) {
            val out = ByteArrayOutputStream()
            bmp.compress(Bitmap.CompressFormat.JPEG, 90, out)
            s.attach = AttachDraft("foto-recibo.jpg", "image/jpeg", out.toByteArray())
            s.sheet = null
        }
    }
    val gallery = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { fromUri(it) }
    val document = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { fromUri(it) }
    NovaDraftSheet(onDismiss = { s.sheet = null }) {
        SheetHeader("Adjuntar comprobante", "Queda guardado con el movimiento y lo ves luego en su detalle.", bottom = 10.dp)
        AttachOptions(
            onCamera = { camera.launch(null) },
            onGallery = { gallery.launch("image/*") },
            onDocument = { document.launch(arrayOf("application/pdf", "image/jpeg", "image/png")) },
        )
    }
}

@Composable
fun AttachOptions(onCamera: () -> Unit, onGallery: () -> Unit, onDocument: () -> Unit) {
    listOf(
        Triple(V2Icons.camera, "Tomar foto" to "Usa la cámara para fotografiar el recibo", onCamera),
        Triple(V2Icons.image, "Elegir de la galería" to "Una foto o captura que ya tengas", onGallery),
        Triple(V2Icons.file, "Subir PDF o documento" to "PDF, JPG o PNG · hasta 10 MB", onDocument),
    ).forEach { (icon, copy, action) ->
        Row(Modifier.fillMaxWidth().noRippleClick(action).padding(horizontal = 4.dp, vertical = 13.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Box(Modifier.size(44.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.22f)), contentAlignment = Alignment.Center) {
                V2Icon(icon, NovaColors.current.accentText, 20.dp)
            }
            Column(Modifier.weight(1f)) {
                Text(copy.first, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                Text(copy.second, fontSize = 11.5.sp, color = NovaColors.current.textDim, modifier = Modifier.padding(top = 2.dp))
            }
        }
    }
}

@Composable
private fun FromSheet(s: NmState) {
    val txs = AppContainer.transactionRepository.transactions.value
    val recents = txs.filter { it.type == TransactionType.INCOME && !it.counterpartyName.isNullOrBlank() }
        .distinctBy { it.counterpartyName }.take(3).map { it.counterpartyName!! to it.counterpartyKind }
    NovaDraftSheet(onDismiss = { s.sheet = null }) {
        SheetHeader("¿De quién recibiste el dinero?", "Opcional. Sirve para buscar y agrupar tus ingresos.")
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            InputBox(height = 50.dp) {
                V2Icon(V2Icons.person, NovaColors.current.textDim, 16.dp)
                BareField(s.from, { s.from = it.take(40) }, "Empresa, cliente o persona", fontWeight = FontWeight.SemiBold)
            }
            Column {
                FieldLabel("Tipo de origen")
                PillRow { CounterpartyKind.entries.forEach { k -> V2Pill(k.label, s.fromKind == k, { s.fromKind = if (s.fromKind == k) null else k }) } }
            }
            if (recents.isNotEmpty()) {
                Column {
                    FieldLabel("Recientes")
                    PillRow { recents.forEach { (n, k) -> V2Pill(n, s.from == n, { s.from = n; s.fromKind = k }) } }
                }
            }
            V2Button("Listo", onClick = { s.sheet = null })
            if (s.from.isNotBlank()) SheetTextAction("Quitar origen", MaterialTheme.colorScheme.onSurfaceVariant, { s.from = ""; s.fromKind = null })
        }
    }
}
