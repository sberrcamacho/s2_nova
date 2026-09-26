package com.s2nova.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.TNUM
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.components.noRippleClick
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

// App-wide overlays from the v2 mockup, hosted once in NovaApp():
//  - Snack: the inverted snackbar, optionally with "Deshacer" (4.5 s).
//  - Confirm: the two-step destructive confirmation (NEW_MOVEMENT.md §9).

data class SnackMessage(val text: String, val onUndo: (() -> Unit)? = null, val onTimeout: (() -> Unit)? = null, val id: Long = System.nanoTime())

object Snack {
    private val _current = MutableStateFlow<SnackMessage?>(null)
    val current = _current.asStateFlow()

    // onTimeout runs when the snackbar closes without "Deshacer" — minor
    // deletions are only sent to the backend then, so undo is instant.
    fun show(text: String, onUndo: (() -> Unit)? = null, onTimeout: (() -> Unit)? = null) {
        _current.value?.onTimeout?.invoke()
        _current.value = SnackMessage(text, onUndo, onTimeout)
    }

    fun undo() {
        val m = _current.value ?: return
        _current.value = null
        m.onUndo?.invoke()
    }

    fun expire(id: Long) {
        val m = _current.value ?: return
        if (m.id != id) return
        _current.value = null
        m.onTimeout?.invoke()
    }
}

@Composable
fun BoxScope.SnackHost(bottom: Dp) {
    val message by Snack.current.collectAsState()
    val m = message ?: return
    LaunchedEffect(m.id) {
        delay(4500)
        Snack.expire(m.id)
    }
    val onBg = MaterialTheme.colorScheme.onBackground
    Row(
        modifier = Modifier
            .align(Alignment.BottomCenter)
            .padding(start = 14.dp, end = 14.dp, bottom = bottom)
            .fillMaxWidth()
            .shadow(18.dp, RoundedCornerShape(14.dp))
            .clip(RoundedCornerShape(14.dp))
            .background(onBg)
            .padding(horizontal = 16.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(m.text, fontSize = 12.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.background, modifier = Modifier.weight(1f))
        if (m.onUndo != null) {
            Text("Deshacer", fontSize = 12.5.sp, fontWeight = FontWeight.ExtraBold, color = NovaColors.current.accentText, modifier = Modifier.noRippleClick { Snack.undo() })
        }
    }
}

// Step 1 lists the concrete consequences; step 2 needs the checkbox. With
// onNext set, "Continuar" hands over to a custom step 2 (goals choose where
// the money returns).
data class ConfirmRequest(
    val title: String,
    val lines: List<String>,
    val ack: String = "",
    val cta: String = "",
    val onConfirm: () -> Unit = {},
    val onNext: (() -> Unit)? = null,
)

object Confirm {
    private val _current = MutableStateFlow<ConfirmRequest?>(null)
    val current = _current.asStateFlow()

    fun ask(request: ConfirmRequest) {
        _current.value = request
    }

    fun close() {
        _current.value = null
    }
}

@Composable
fun ConfirmHost() {
    val request by Confirm.current.collectAsState()
    val r = request ?: return
    var step by remember(r) { mutableStateOf(1) }
    var checked by remember(r) { mutableStateOf(false) }
    val colors = NovaColors.current
    NovaDraftSheet(onDismiss = { Confirm.close() }, scrimAlpha = 0.72f) {
        Column(Modifier.padding(horizontal = 4.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Box(Modifier.size(48.dp).clip(CircleShape).background(colors.negativeBorder), contentAlignment = Alignment.Center) {
                V2Icon(if (step == 1) V2Icons.trash else V2Icons.warn, colors.negative, 22.dp)
            }
            if (step == 1) {
                Text(r.title, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.25).sp, color = MaterialTheme.colorScheme.onBackground)
                Text("SE VA A ELIMINAR", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.88.sp, color = colors.textDim)
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    r.lines.forEach { line ->
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Box(Modifier.padding(top = 6.dp).size(6.dp).clip(CircleShape).background(colors.negative))
                            Text(line, fontSize = 12.5.sp, lineHeight = 18.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, style = TextStyle(fontFeatureSettings = TNUM))
                        }
                    }
                }
                Box(
                    Modifier.padding(top = 6.dp).fillMaxWidth().clip(RoundedCornerShape(14.dp)).border(1.dp, colors.negative, RoundedCornerShape(14.dp))
                        .noRippleClick {
                            val next = r.onNext
                            if (next != null) { Confirm.close(); next() } else step = 2
                        }.padding(14.dp),
                    contentAlignment = Alignment.Center,
                ) { Text("Continuar", fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = colors.negative) }
                Text(
                    "Cancelar", fontSize = 12.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().noRippleClick { Confirm.close() }.padding(vertical = 4.dp),
                )
            } else {
                Text("No se puede deshacer", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.25).sp, color = MaterialTheme.colorScheme.onBackground)
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(14.dp))
                        .noRippleClick { checked = !checked }.padding(horizontal = 14.dp, vertical = 13.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Box(
                        Modifier.size(22.dp).clip(RoundedCornerShape(7.dp))
                            .background(if (checked) colors.negative else Color.Transparent)
                            .border(2.dp, if (checked) colors.negative else MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(7.dp)),
                        contentAlignment = Alignment.Center,
                    ) { if (checked) V2Icon(V2Icons.check, Color.White, 13.dp) }
                    Text(r.ack, fontSize = 12.5.sp, lineHeight = 18.sp, color = MaterialTheme.colorScheme.onBackground)
                }
                Box(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(if (checked) colors.negative else colors.negativeBorder)
                        .noRippleClick { if (checked) { Confirm.close(); r.onConfirm() } }.padding(14.dp),
                    contentAlignment = Alignment.Center,
                ) { Text(r.cta, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = if (checked) Color.White else colors.textDim) }
                Text(
                    "Volver", fontSize = 12.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().noRippleClick { step = 1; checked = false }.padding(vertical = 4.dp),
                )
            }
        }
    }
}

// Contextual mini-guides (ONBOARDING.md §3), one per main screen.
val GUIDES = mapOf(
    "inicio" to ("Inicio" to ("Tu dinero de un vistazo" to "El saldo suma todas tus billeteras en tu moneda principal. Debajo ves el mes, las alertas y lo que viene.")),
    "movimientos" to ("Movimientos" to ("Todo lo que entra y sale" to "Los programados aparecen arriba. Toca un movimiento para ver su detalle y su comprobante.")),
    "planes" to ("Planes" to ("Presupuestos, metas y préstamos" to "Pon límites a tus gastos, ahorra para lo que quieres y lleva la cuenta de lo que prestas.")),
    "reportes" to ("Reportes" to ("Hacia dónde va tu dinero" to "Compara meses y revisa tus gastos por categoría o subcategoría.")),
    "billeteras" to ("Billeteras" to ("Dónde está tu dinero" to "Cada billetera tiene su moneda. El saldo total las convierte a tu moneda principal.")),
)

@Composable
fun BoxScope.GuideCard(key: String, bottom: Dp, onOk: () -> Unit, onSkipAll: () -> Unit) {
    val (screen, copy) = GUIDES[key] ?: return
    val colors = NovaColors.current
    Column(
        Modifier
            .align(Alignment.BottomCenter)
            .padding(start = 14.dp, end = 14.dp, bottom = bottom)
            .fillMaxWidth()
            .shadow(22.dp, RoundedCornerShape(20.dp))
            .clip(RoundedCornerShape(20.dp))
            .background(colors.sheetSurface)
            .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.45f), RoundedCornerShape(20.dp))
            .padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 14.dp),
    ) {
        Text("GUÍA RÁPIDA · " + screen.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.2.sp, color = colors.accentText)
        Text(copy.first, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.15).sp, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(top = 8.dp))
        Text(copy.second, fontSize = 12.5.sp, lineHeight = 19.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
        Row(Modifier.padding(top = 14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Omitir guías", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.noRippleClick(onSkipAll))
            Spacer(Modifier.weight(1f))
            Box(
                Modifier.clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.primary).noRippleClick(onOk).padding(horizontal = 18.dp, vertical = 10.dp),
            ) { Text("Entendido", fontSize = 12.5.sp, fontWeight = FontWeight.ExtraBold, color = Color.White) }
        }
    }
}
