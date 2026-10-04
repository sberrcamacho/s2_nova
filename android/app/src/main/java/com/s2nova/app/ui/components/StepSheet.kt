package com.s2nova.app.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.data.Taxonomy
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.screens.addtransaction.AmountPad
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.NovaMotion
import com.s2nova.app.ui.theme.NovaType
import com.s2nova.app.ui.theme.heroSurface
import com.s2nova.app.ui.theme.rememberReducedMotion
import com.s2nova.app.ui.tr

// Guided steps for the create/edit forms that were too crowded for one
// sheet (budgets, goals). One question per step: a header with back and
// close, "Paso n de N" plus a segmented progress bar (the text carries the
// step, so it isn't color alone), the step content in its own scroll, and
// the primary action fixed at the bottom. The sheet takes
// each step's height (up to 90 %) and animates between them.
@Composable
fun StepSheet(
    title: String,
    step: Int,
    stepCount: Int,
    onBack: () -> Unit,
    onDismiss: () -> Unit,
    primaryLabel: String,
    primaryEnabled: Boolean,
    onPrimary: () -> Unit,
    // Shown under the primary button (e.g. the edit form's delete action).
    footer: (@Composable ColumnScope.() -> Unit)? = null,
    // Steps whose content is just a choice advance on tap and hide the button.
    showPrimary: Boolean = true,
    showBack: Boolean = step > 0,
    // What is being edited ("Streaming"), before "Paso n de N".
    context: String? = null,
    content: @Composable ColumnScope.(step: Int) -> Unit,
) {
    val colors = NovaColors.current
    val reduced = rememberReducedMotion()
    NovaDraftSheet(onDismiss = onDismiss, bottomPadding = 16.dp) {
        val maxHeight = (androidx.compose.ui.platform.LocalConfiguration.current.screenHeightDp * 0.9f).dp
        Column(Modifier.heightIn(max = maxHeight).animateContentSize(tween(if (reduced) 0 else NovaMotion.BASE, easing = NovaMotion.EmphasizedDecelerate))) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                if (showBack) {
                    StepIconButton(V2Icons.back, tr(StringKey.STEP_BACK), onBack)
                }
                Column(Modifier.weight(1f).padding(start = 4.dp)) {
                    Text(title, style = NovaType.title, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(listOfNotNull(context?.takeIf { it.isNotBlank() }, tr(StringKey.STEP_OF, step + 1, stepCount)).joinToString(" · "), style = NovaType.caption, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                StepIconButton(V2Icons.close, tr(StringKey.STEP_CLOSE), onDismiss)
            }
            Row(
                Modifier.fillMaxWidth().padding(start = 4.dp, end = 4.dp, top = 8.dp, bottom = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                repeat(stepCount) { i ->
                    Box(
                        Modifier.weight(1f).height(4.dp).clip(RoundedCornerShape(999.dp))
                            .then(if (i <= step) Modifier.background(com.s2nova.app.ui.theme.ctaBrush()) else Modifier.background(colors.surfaceSunken)),
                    )
                }
            }
            var last by remember { mutableStateOf(step) }
            val forward = step >= last
            last = step
            AnimatedContent(
                targetState = step,
                transitionSpec = {
                    if (reduced) {
                        fadeIn(tween(NovaMotion.FAST)) togetherWith fadeOut(tween(NovaMotion.FAST))
                    } else {
                        val dir = if (forward) 1 else -1
                        (slideInHorizontally(tween(NovaMotion.BASE, easing = NovaMotion.EmphasizedDecelerate)) { it / 10 * dir } + fadeIn(tween(NovaMotion.BASE))) togetherWith
                            fadeOut(tween(90))
                    }
                },
                modifier = Modifier.weight(1f, fill = false),
                label = "step",
            ) { s ->
                Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(bottom = 16.dp)) {
                    content(s)
                }
            }
            if (showPrimary) {
                V2Button(primaryLabel, enabled = primaryEnabled, onClick = onPrimary, modifier = Modifier.padding(top = 8.dp))
            }
            footer?.invoke(this)
        }
    }
}

@Composable
private fun StepIconButton(icon: List<String>, label: String, onClick: () -> Unit) {
    Box(
        Modifier.size(48.dp).clip(CircleShape).clickable(role = Role.Button, onClick = onClick).semantics { contentDescription = label },
        contentAlignment = Alignment.Center,
    ) { V2Icon(icon, MaterialTheme.colorScheme.onSurfaceVariant, 24.dp) }
}

// The step's question ("¿Qué quieres controlar?") and an optional hint.
@Composable
fun StepQuestion(text: String, hint: String? = null) {
    Column(Modifier.padding(start = 4.dp, end = 4.dp, bottom = 20.dp)) {
        Text(text, style = NovaType.headline, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.semantics { heading() })
        if (hint != null) Text(hint, style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
    }
}

// A large single-choice card: 48 dp mark, title and detail, and a radio
// indicator, so the selected card isn't marked by color alone.
@Composable
fun ChoiceCard(icon: List<String>, tint: Color, title: String, detail: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    val colors = NovaColors.current
    val shape = RoundedCornerShape(16.dp)
    Row(
        modifier
            .fillMaxWidth()
            .heightIn(min = 76.dp)
            .clip(shape)
            .background(if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.10f) else MaterialTheme.colorScheme.surface)
            .border(if (selected) 2.dp else 1.dp, if (selected) colors.primaryBorder else MaterialTheme.colorScheme.outlineVariant, shape)
            .selectable(selected = selected, enabled = enabled, role = Role.RadioButton, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        GlyphMark(icon, tint, 48.dp)
        Column(Modifier.weight(1f)) {
            Text(title, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(detail, style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp))
        }
        RadioDot(selected)
    }
}

// The amount on the hero surface, as in "Nuevo movimiento": overline label,
// the figure in `display-sm`, a hint; tapping it opens the amount pad.
@Composable
fun AmountHeroField(label: String, expr: String, onExpr: (String) -> Unit, currency: String, padTitle: String = label, hint: String? = null) {
    val colors = NovaColors.current
    var open by remember { mutableStateOf(false) }
    val value = AmountPad.eval(expr)
    Column(
        Modifier.fillMaxWidth()
            .heroSurface(RoundedCornerShape(20.dp))
            .clickable(role = Role.Button, onClickLabel = padTitle) { open = true }
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(label.uppercase(), style = NovaType.overline, color = colors.heroOverline, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(currency, style = NovaType.label, color = Color.White, maxLines = 1, softWrap = false,
                modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(colors.heroTile).padding(horizontal = 12.dp, vertical = 6.dp))
        }
        Text(
            com.s2nova.app.data.formatMoney(value, currency), style = NovaType.displaySm, color = Color.White, maxLines = 1, softWrap = false,
            autoSize = androidx.compose.foundation.text.TextAutoSize.StepBased(minFontSize = 20.sp, maxFontSize = 28.sp),
        )
        // The hint only while there's nothing to show yet.
        val note = hint ?: if (value <= 0) tr(StringKey.STEP_TAP_AMOUNT) else null
        if (note != null) Text(note, style = NovaType.caption, color = colors.heroLabel)
    }
    if (open) AmountPadSheet(expr = expr, onExpr = onExpr, currency = currency, title = padTitle, onDone = { open = false })
}

// A labelled text field (label above, 56 dp box) with an optional leading
// slot (a tappable mark).
@Composable
fun NameField(label: String, value: String, onValueChange: (String) -> Unit, placeholder: String, leading: (@Composable () -> Unit)? = null) {
    Column {
        FieldLabel(label)
        InputBox(height = 60.dp, horizontal = if (leading != null) 8.dp else 16.dp) {
            leading?.invoke()
            BareField(value, onValueChange, placeholder, fontSize = 16.sp)
        }
    }
}

// The plan icon picker (goals and custom budgets): 6 columns of 48 dp
// targets; the selected icon gets a ring and a check badge.
@Composable
fun PlanIconPicker(selected: String, onPick: (String) -> Unit) {
    val colors = NovaColors.current
    val english = com.s2nova.app.ui.rememberAppLanguage() == com.s2nova.app.data.model.AppLanguage.EN
    com.s2nova.app.ui.screens.addtransaction.GridOf(Taxonomy.planIcons, 6, 8.dp, 8.dp) { p ->
        val on = selected == p.key
        Box(
            Modifier.fillMaxWidth().heightIn(min = 52.dp).clip(RoundedCornerShape(14.dp))
                .border(2.dp, if (on) colors.primaryBorder else Color.Transparent, RoundedCornerShape(14.dp))
                .selectable(selected = on, role = Role.RadioButton) { onPick(p.key) }
                .semantics { contentDescription = if (english) p.nameEn else p.name },
            contentAlignment = Alignment.Center,
        ) {
            PlanMark(p.key, 40.dp)
            if (on) {
                Box(
                    Modifier.align(Alignment.TopEnd).padding(3.dp).size(18.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary),
                    contentAlignment = Alignment.Center,
                ) { V2Icon(V2Icons.check, MaterialTheme.colorScheme.onPrimary, 12.dp, strokeWidth = 3f) }
            }
        }
    }
}

// A one-line note with an info icon (scope summaries under a step).
@Composable
fun StepNote(text: String, modifier: Modifier = Modifier) {
    val colors = NovaColors.current
    Row(
        modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(colors.surfaceSunken).padding(horizontal = 14.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        V2Icon(V2Icons.info, MaterialTheme.colorScheme.onSurfaceVariant, 18.dp, modifier = Modifier.padding(top = 1.dp))
        Text(text, style = NovaType.bodySm.copy(fontFeatureSettings = TNUM), color = MaterialTheme.colorScheme.onBackground)
    }
}

// The edit form's delete action: a full-width 48 dp destructive text
// button, kept 16 dp away from the primary action.
@Composable
fun StepDeleteButton(label: String, onClick: () -> Unit) {
    Box(
        Modifier.padding(top = 16.dp).fillMaxWidth().height(48.dp).clip(RoundedCornerShape(50))
            .border(1.dp, NovaColors.current.negative, RoundedCornerShape(50))
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { Text(label, style = NovaType.label, color = NovaColors.current.negative, maxLines = 1, softWrap = false) }
}

@Composable
fun StepSpacer() = Spacer(Modifier.height(20.dp))

// Two or three options side by side (a loan's direction): 52 dp segments
// with an icon and label; the selected one gets a 2 dp ring, the brand tint
// and a check, so it isn't marked by color alone.
data class SegmentOption<T>(val value: T, val label: String, val icon: List<String>)

@Composable
fun <T> SegmentedChoice(options: List<SegmentOption<T>>, selected: T, onSelect: (T) -> Unit) {
    val colors = NovaColors.current
    val shape = RoundedCornerShape(14.dp)
    Row(Modifier.fillMaxWidth().selectableGroup(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        options.forEach { option ->
            val on = option.value == selected
            Row(
                Modifier
                    .weight(1f)
                    .height(52.dp)
                    .clip(shape)
                    .background(if (on) MaterialTheme.colorScheme.primary.copy(alpha = 0.10f) else MaterialTheme.colorScheme.surface)
                    .border(if (on) 2.dp else 1.dp, if (on) colors.primaryBorder else MaterialTheme.colorScheme.outlineVariant, shape)
                    .selectable(selected = on, role = Role.RadioButton) { onSelect(option.value) }
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
            ) {
                V2Icon(if (on) V2Icons.check else option.icon, if (on) colors.accentText else MaterialTheme.colorScheme.onSurfaceVariant, 18.dp)
                Text(option.label, style = NovaType.label, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}
