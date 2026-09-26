package com.s2nova.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.Taxonomy
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.NovaFontFamily

// The v2 mockup's shared building blocks (design_handoff_s2_nova_v2): its
// pill(), radioStyles(), switchStyles(), btnStyle(), glyphMark()/mark(),
// option tiles and outlined inputs, drawn with the app's theme tokens.
// Every v2 screen composes these instead of re-deriving the styles.

const val TNUM = "tnum"

private val glyphCache = HashMap<String, ImageVector>()

// A glyph (list of SVG path strings, 24-unit viewBox) as a stroke icon.
fun glyphIcon(paths: List<String>, strokeWidth: Float = 2.25f): ImageVector {
    val key = strokeWidth.toString() + "|" + paths.joinToString("|")
    return glyphCache.getOrPut(key) { strokeIcon(key.take(40), *paths.toTypedArray(), strokeWidth = strokeWidth) }
}

// Mockup icon set (IC) used by the v2 screens, 1.9 stroke.
object V2Icons {
    val clock = listOf("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3 2")
    val cal = listOf("M4 5h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z", "M3 10h18", "M8 3v4", "M16 3v4")
    val repeat = listOf("M3 12a9 9 0 0 1 15-6.7L21 8", "M21 3v5h-5", "M21 12a9 9 0 0 1-15 6.7L3 16", "M3 21v-5h5")
    val clip = listOf("M21 11.5 12.5 20a5 5 0 0 1-7-7L14 4.5a3.5 3.5 0 0 1 5 5L10.5 18a2 2 0 0 1-3-3L15 7.5")
    val target = listOf("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z", "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z")
    val person = listOf("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21v-1a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1")
    val more = listOf("M5 12h.01", "M12 12h.01", "M19 12h.01")
    val camera = listOf("M3 8a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z")
    val image = listOf("M3 5h18v14H3z", "M3 16l5-5 4 4 3-3 6 6", "M15.5 9.5h.01")
    val file = listOf("M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z", "M14 3v5h5", "M9 13h6", "M9 17h4")
    val keypad = listOf("M5 5h.01", "M12 5h.01", "M19 5h.01", "M5 12h.01", "M12 12h.01", "M19 12h.01", "M5 19h.01", "M12 19h.01", "M19 19h.01")
    val calc = listOf("M5 3h14v18H5z", "M8 7h8", "M8 12h.01", "M12 12h.01", "M16 12h.01", "M8 16h.01", "M12 16h.01", "M16 16h.01")
    val trash = listOf("M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 13h10l1-13", "M9 7V4h6v3")
    val warn = listOf("M12 3 2 21h20z", "M12 10v5", "M12 18h.01")
    val check = listOf("M5 12.5l4.5 4.5L19 7")
    val note = listOf("M4 6h16", "M4 12h16", "M4 18h10")
    val title = listOf("M4 7V5h16v2", "M12 5v14", "M9 19h6")
    val enter = listOf("M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4", "M10 17l5-5-5-5", "M15 12H3")
    val wallet = listOf("M3 7h18a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12", "M17 13h.01")
}

@Composable
fun V2Icon(paths: List<String>, tint: Color, size: Dp = 20.dp, strokeWidth: Float = 1.9f, modifier: Modifier = Modifier) {
    Icon(glyphIcon(paths, strokeWidth), contentDescription = null, tint = tint, modifier = modifier.size(size))
}

fun hexColor(hex: String): Color = Color(("FF" + hex.removePrefix("#")).toLong(16))

// glyphMark(paths, color, box, alpha): a tinted circle with the glyph at 46 %.
@Composable
fun GlyphMark(paths: List<String>, color: Color, box: Dp, alpha: Float = 0.16f, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.size(box).clip(CircleShape).background(color.copy(alpha = alpha)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(glyphIcon(paths), contentDescription = null, tint = color, modifier = Modifier.size(box * 0.46f))
    }
}

// A category's mark (mark(id, catColor(id), box, '29')).
@Composable
fun CatMark(id: CategoryId?, box: Dp, alpha: Float = 0.16f, modifier: Modifier = Modifier) {
    val repo = AppContainer.categoryRepository
    GlyphMark(repo.glyph(id), Color(repo.color(id)), box, alpha, modifier)
}

// A plan icon's mark (goals and custom budgets).
@Composable
fun PlanMark(key: String?, box: Dp, alpha: Float = 0.16f, modifier: Modifier = Modifier) {
    val p = Taxonomy.planIcon(key)
    GlyphMark(p.glyph, hexColor(p.color), box, alpha, modifier)
}

fun Modifier.noRippleClick(onClick: () -> Unit): Modifier = this.clickable(
    interactionSource = MutableInteractionSource(),
    indication = null,
    onClick = onClick,
)

// pill(label, selected): 9×14 padding, 12 sp, accent when selected.
@Composable
fun V2Pill(label: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = NovaColors.current
    Text(
        text = label,
        fontSize = 12.sp,
        fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold,
        color = if (selected) Color.White else colors.pillText,
        maxLines = 1,
        modifier = modifier
            .clip(RoundedCornerShape(999.dp))
            .background(if (selected) MaterialTheme.colorScheme.primary else colors.pillSurface)
            .border(1.dp, if (selected) Color.Transparent else colors.pillBorder, RoundedCornerShape(999.dp))
            .clickable(role = Role.RadioButton, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 9.dp),
    )
}

// "display:flex;flex-wrap:wrap;gap:8px" pill rows.
@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun PillRow(content: @Composable () -> Unit) {
    androidx.compose.foundation.layout.FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) { content() }
}

// Section label: 11.5 sp / 700 muted, 8 dp below.
@Composable
fun FieldLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        fontSize = 11.5.sp,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = modifier.padding(bottom = 8.dp),
    )
}

@Composable
fun FieldNote(text: String, modifier: Modifier = Modifier) {
    Text(text = text, fontSize = 11.sp, lineHeight = 16.sp, color = NovaColors.current.textDim, modifier = modifier)
}

// radioStyles(on): bordered row with a trailing dot.
@Composable
fun RadioRow(
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    leading: (@Composable () -> Unit)? = null,
    dotFirst: Boolean = false,
    content: @Composable RowScope.() -> Unit,
) {
    val primary = MaterialTheme.colorScheme.primary
    val line2 = MaterialTheme.colorScheme.outlineVariant
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(if (selected) primary.copy(alpha = 0.12f) else Color.Transparent)
            .border(1.dp, if (selected) primary else line2, RoundedCornerShape(14.dp))
            .clickable(role = Role.RadioButton, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (dotFirst) RadioDot(selected)
        leading?.invoke()
        content()
        if (!dotFirst) RadioDot(selected)
    }
}

@Composable
fun RadioDot(selected: Boolean) {
    val primary = MaterialTheme.colorScheme.primary
    val line2 = MaterialTheme.colorScheme.outlineVariant
    Box(
        modifier = Modifier
            .size(16.dp)
            .clip(CircleShape)
            .border(2.dp, if (selected) primary else line2, CircleShape)
            .padding(4.5.dp)
            .clip(CircleShape)
            .background(if (selected) primary else Color.Transparent),
    )
}

// switchStyles(on): 42×24 track, 18 dp knob.
@Composable
fun V2Switch(on: Boolean, onToggle: () -> Unit) {
    Box(
        modifier = Modifier
            .size(width = 42.dp, height = 24.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(if (on) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant)
            .clickable(role = Role.Switch, onClick = onToggle)
            .padding(3.dp),
        contentAlignment = if (on) Alignment.CenterEnd else Alignment.CenterStart,
    ) {
        Box(Modifier.size(18.dp).clip(CircleShape).background(Color.White))
    }
}

// btnStyle(ok): accent when enabled, surface2/dim when not; 14 dp radius.
@Composable
fun V2Button(
    label: String,
    enabled: Boolean = true,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    verticalPadding: Dp = 14.dp,
    fontSize: TextUnit = 13.sp,
    glow: Boolean = false,
) {
    val primary = MaterialTheme.colorScheme.primary
    val colors = NovaColors.current
    Box(
        modifier = modifier
            .fillMaxWidth()
            .then(if (glow && enabled) Modifier.androidShadow(primary) else Modifier)
            .clip(RoundedCornerShape(14.dp))
            .background(if (enabled) primary else colors.sheetSurface)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(vertical = verticalPadding),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, fontSize = fontSize, fontWeight = FontWeight.ExtraBold, color = if (enabled) Color.White else colors.textDim)
    }
}

// box-shadow 0 8px 24px rgba(108,92,231,.35) under the primary CTA.
fun Modifier.androidShadow(color: Color): Modifier = this.drawBehind {
    drawIntoCanvas { canvas ->
        val paint = androidx.compose.ui.graphics.Paint()
        paint.asFrameworkPaint().apply {
            this.color = android.graphics.Color.TRANSPARENT
            setShadowLayer(24.dp.toPx(), 0f, 8.dp.toPx(), color.copy(alpha = 0.35f).toArgb())
        }
        canvas.drawRoundRect(0f, 0f, size.width, size.height, 14.dp.toPx(), 14.dp.toPx(), paint)
    }
}

// Option tile (optBox/optLabel): 48 dp rounded square + label.
@Composable
fun OptionTile(paths: List<String>, label: String, on: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier, iconTint: Color? = null) {
    val primary = MaterialTheme.colorScheme.primary
    val colors = NovaColors.current
    Column(
        modifier = modifier.noRippleClick(onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(if (on) primary.copy(alpha = 0.16f) else MaterialTheme.colorScheme.surface)
                .border(1.dp, if (on) primary else MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center,
        ) {
            V2Icon(paths, iconTint ?: if (on) colors.accentText else MaterialTheme.colorScheme.onSurfaceVariant, 20.dp, if (paths == V2Icons.more) 1.9f else 1.9f)
        }
        Text(
            text = label,
            fontSize = 10.5.sp,
            fontWeight = if (on) FontWeight.ExtraBold else FontWeight.SemiBold,
            color = if (on) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            lineHeight = 13.sp,
        )
    }
}

// Outlined input box: 1 dp line2 border, 14 dp radius.
@Composable
fun InputBox(
    modifier: Modifier = Modifier,
    horizontal: Dp = 14.dp,
    vertical: Dp = 12.dp,
    height: Dp? = null,
    content: @Composable RowScope.() -> Unit,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .then(if (height != null) Modifier.height(height) else Modifier)
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(14.dp))
            .padding(horizontal = horizontal, vertical = if (height != null) 0.dp else vertical),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) { content() }
}

// Bare text field used inside InputBox (the mockup's borderless <input>).
@Composable
fun RowScope.BareField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    fontSize: TextUnit = 13.5.sp,
    fontWeight: FontWeight = FontWeight.Bold,
    numeric: Boolean = false,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    tabular: Boolean = false,
) {
    val onBg = MaterialTheme.colorScheme.onBackground
    val style = TextStyle(
        fontFamily = NovaFontFamily, fontSize = fontSize, fontWeight = fontWeight, color = onBg,
        fontFeatureSettings = if (tabular) TNUM else null,
    )
    Box(Modifier.weight(1f)) {
        if (value.isEmpty()) {
            Text(placeholder, style = style.copy(color = NovaColors.current.textDim, fontWeight = if (numeric) fontWeight else FontWeight.SemiBold))
        }
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            textStyle = style,
            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
            keyboardOptions = if (numeric) KeyboardOptions(keyboardType = KeyboardType.Number) else KeyboardOptions.Default,
            visualTransformation = visualTransformation,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

// "$ 0" money input (13×16 padding, 18 sp / 800, tabular).
@Composable
fun MoneyInput(
    digits: String,
    onDigits: (String) -> Unit,
    symbol: String = "$",
    fontSize: TextUnit = 18.sp,
) {
    InputBox(horizontal = 16.dp, vertical = 13.dp) {
        Text(symbol, fontSize = fontSize, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurfaceVariant, style = TextStyle(fontFeatureSettings = TNUM))
        BareField(
            value = digits,
            onValueChange = { v -> onDigits(v.filter(Char::isDigit).take(12)) },
            placeholder = "0",
            fontSize = fontSize,
            fontWeight = FontWeight.ExtraBold,
            numeric = true,
            tabular = true,
            visualTransformation = com.s2nova.app.ui.ThousandsGroupingVisualTransformation(),
        )
    }
}

// Sheet header: 15 sp / 800 title, optional 11 sp dim subtitle.
@Composable
fun SheetHeader(title: String, subtitle: String? = null, bottom: Dp = 14.dp, subtitleTop: Dp = 4.dp) {
    Column(Modifier.padding(start = 4.dp, end = 4.dp, bottom = bottom)) {
        Text(title, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
        if (subtitle != null) {
            Text(
                subtitle,
                fontSize = 11.sp,
                lineHeight = 16.sp,
                color = NovaColors.current.textDim,
                modifier = Modifier.padding(top = subtitleTop),
                style = TextStyle(fontFeatureSettings = TNUM),
            )
        }
    }
}

// accent2 text link ("Gestionar categorías en Ajustes →").
@Composable
fun TextLink(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Text(
        text,
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        color = NovaColors.current.accentText,
        modifier = modifier.noRippleClick(onClick),
    )
}

// Centered muted/negative text action under a sheet's CTA.
@Composable
fun SheetTextAction(text: String, color: Color, onClick: () -> Unit, weight: FontWeight = FontWeight.Bold, modifier: Modifier = Modifier) {
    Text(
        text,
        fontSize = 12.5.sp,
        fontWeight = weight,
        color = color,
        textAlign = TextAlign.Center,
        modifier = modifier.fillMaxWidth().noRippleClick(onClick).padding(vertical = 4.dp),
    )
}

// Currency symbol badge (40 dp accent-tinted circle).
@Composable
fun SymbolBadge(symbol: String, box: Dp = 40.dp, fontSize: TextUnit = 12.sp) {
    Box(
        Modifier.size(box).clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.16f)),
        contentAlignment = Alignment.Center,
    ) {
        Text(symbol, fontSize = fontSize, fontWeight = FontWeight.ExtraBold, color = NovaColors.current.accentText)
    }
}

@Composable
fun SheetColumn(gap: Dp = 16.dp, content: @Composable ColumnScope.() -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(gap), content = content)
}

@Composable
fun HSpace(w: Dp) = Box(Modifier.width(w))

// toneOf(n): pos < 65, warn 65–89, neg ≥ 90 — color + tinted background.
@Composable
fun toneOf(percentage: Int): Pair<Color, Color> {
    val c = NovaColors.current
    return when {
        percentage >= 90 -> c.negative to Color(0x24FF6262)
        percentage >= 65 -> c.warning to Color(0x29F0B429)
        else -> c.positive to Color(0x2432C98A)
    }
}

@Composable
fun rememberGlyph(paths: List<String>): ImageVector = remember(paths) { glyphIcon(paths) }
