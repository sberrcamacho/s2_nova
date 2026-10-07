package com.s2nova.app.ui

import com.s2nova.app.ui.theme.cardAurora
import com.s2nova.app.ui.theme.ctaBrush
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.draw.drawBehind
import androidx.compose.foundation.layout.heightIn
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
        Text(m.text, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.background, modifier = Modifier.weight(1f))
        if (m.onUndo != null) {
            Text(tr(StringKey.COMMON_UNDO), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = NovaColors.current.accentText, modifier = Modifier.noRippleClick { Snack.undo() })
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
                Text(r.title, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.25).sp, color = MaterialTheme.colorScheme.onBackground)
                Text(tr(StringKey.CONFIRM_WILL_DELETE), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.88.sp, color = colors.textDim)
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    r.lines.forEach { line ->
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Box(Modifier.padding(top = 6.dp).size(6.dp).clip(CircleShape).background(colors.negative))
                            Text(line, fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, style = com.s2nova.app.ui.theme.NovaDefaultTextStyle.copy(fontFeatureSettings = TNUM))
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
                ) { Text(tr(StringKey.CONFIRM_CONTINUE), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = colors.negative) }
                Text(
                    tr(StringKey.COMMON_CANCEL), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().noRippleClick { Confirm.close() }.padding(vertical = 4.dp),
                )
            } else {
                Text(tr(StringKey.CONFIRM_CANT_UNDO), fontSize = 18.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.25).sp, color = MaterialTheme.colorScheme.onBackground)
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
                    Text(r.ack, fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onBackground)
                }
                Box(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(if (checked) colors.negative else colors.negativeBorder)
                        .noRippleClick { if (checked) { Confirm.close(); r.onConfirm() } }.padding(14.dp),
                    contentAlignment = Alignment.Center,
                ) { Text(r.cta, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = if (checked) Color.White else colors.textDim) }
                Text(
                    tr(StringKey.COMMON_BACK_TO), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().noRippleClick { step = 1; checked = false }.padding(vertical = 4.dp),
                )
            }
        }
    }
}
