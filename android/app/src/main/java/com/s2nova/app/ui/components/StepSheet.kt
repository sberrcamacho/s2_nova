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
import com.s2nova.app.ui.theme.amountSurface
import com.s2nova.app.ui.theme.rememberReducedMotion
import com.s2nova.app.ui.tr

// Guided steps for the create/edit forms (budgets, goals, categories). One
// question per step: a header with back and close, "Paso n de N" plus a
// segmented progress bar (the text carries the step, so it isn't color
// alone), the step content, and the primary action fixed at the bottom.
//
// Sheets never need scrolling (DESIGN-SYSTEM.md §6.9): a choice never adds
// content under itself. Options that depend on a choice open as a sub-page
// (`subPage`) inside the same sheet, with the same header and a "Listo"
// button; each step is designed to fit a 360×740 dp phone. The step content
// still sits in a scroll container, but only as the fallback for a large
// font scale or the open keyboard.
class StepSubPage(val key: String, val title: String, val content: @Composable ColumnScope.() -> Unit)

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
    // A drill-in page over the current step (Periodo, Billeteras…); its back
    // arrow and "Listo" call `onSubDone`.
    subPage: StepSubPage? = null,
    onSubDone: () -> Unit = {},
    content: @Composable ColumnScope.(step: Int) -> Unit,
) {
    val colors = NovaColors.current
    val reduced = rememberReducedMotion()
    val sub = subPage
    NovaDraftSheet(onDismiss = onDismiss, bottomPadding = 16.dp) {
        val maxHeight = (androidx.compose.ui.platform.LocalConfiguration.current.screenHeightDp * 0.92f).dp
        Column(Modifier.heightIn(max = maxHeight).animateContentSize(tween(if (reduced) 0 else NovaMotion.BASE, easing = NovaMotion.EmphasizedDecelerate))) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                if (sub != null) {
                    StepIconButton(V2Icons.back, tr(StringKey.STEP_BACK), onSubDone)
                } else if (showBack) {
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
                        Modifier.weight(1f).height(3.dp).clip(RoundedCornerShape(999.dp))
                            .background(if (i <= step) MaterialTheme.colorScheme.primary else colors.surfaceSunken),
                    )
                }
            }
            // Steps are numbered 0…; a sub-page sits "after" its step.
            val target = step * 2 + if (sub != null) 1 else 0
            var last by remember { mutableStateOf(target) }
            val forward = target >= last
            last = target
            AnimatedContent(
                targetState = target,
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
            ) { t ->
                Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(bottom = 16.dp)) {
                    if (t % 2 == 1 && sub != null) {
                        StepQuestion(sub.title)
                        sub.content(this)
                    } else {
                        content(t / 2)
                    }
                }
            }
            if (sub != null) {
                V2Button(tr(StringKey.STEP_DONE), onClick = onSubDone, modifier = Modifier.padding(top = 8.dp))
            } else {
                if (showPrimary) {
                    V2Button(primaryLabel, enabled = primaryEnabled, onClick = onPrimary, modifier = Modifier.padding(top = 8.dp))
                }
                footer?.invoke(this)
            }
        }
    }
}

// A row that shows an option's current value and opens its sub-page:
// 56 dp, leading icon, label, value and a chevron. Group rows with
// StepOptionGroup.
@Composable
fun StepOptionRow(icon: List<String>, label: String, value: String, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 56.dp)
            .clickable(role = Role.Button, onClickLabel = label, onClick = onClick)
            .padding(start = 14.dp, end = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        V2Icon(icon, MaterialTheme.colorScheme.onSurfaceVariant, 20.dp)
        Text(label, style = NovaType.body.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Medium), color = MaterialTheme.colorScheme.onBackground, maxLines = 1, softWrap = false)
        Text(value, style = NovaType.bodySm.copy(fontFeatureSettings = TNUM), color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = androidx.compose.ui.text.style.TextAlign.End, modifier = Modifier.weight(1f))
        V2Icon(V2Icons.chevronRight, MaterialTheme.colorScheme.onSurfaceVariant, 18.dp)
    }
}

// Option rows in one bordered group with hairline dividers.
@Composable
fun StepOptionGroup(content: @Composable ColumnScope.() -> Unit) {
    val shape = RoundedCornerShape(12.dp)
    Column(
        Modifier.fillMaxWidth().clip(shape).border(1.dp, MaterialTheme.colorScheme.outline, shape),
        content = content,
    )
}

@Composable
fun StepDivider() = Box(Modifier.fillMaxWidth().height(1.dp).background(MaterialTheme.colorScheme.outline))

// A single- or multi-choice row (subcategories, wallets): 52 dp, optional
// leading mark, label, and a radio or check indicator, so the selected row
// isn't marked by color alone.
@Composable
fun StepChoiceRow(label: String, selected: Boolean, onClick: () -> Unit, multi: Boolean = false, leading: (@Composable () -> Unit)? = null) {
    val colors = NovaColors.current
    val shape = RoundedCornerShape(12.dp)
    Row(
        Modifier.fillMaxWidth().heightIn(min = 52.dp).clip(shape)
            .background(if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface)
            .border(if (selected) 2.dp else 1.dp, if (selected) colors.primaryBorder else MaterialTheme.colorScheme.outline, shape)
            .selectable(selected = selected, role = if (multi) Role.Checkbox else Role.RadioButton, onClick = onClick)
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        leading?.invoke()
        Text(label, style = NovaType.body, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
        if (multi) {
            Box(
                Modifier.size(22.dp).clip(RoundedCornerShape(6.dp))
                    .background(if (selected) MaterialTheme.colorScheme.primary else Color.Transparent)
                    .border(if (selected) 0.dp else 1.5.dp, colors.borderInput, RoundedCornerShape(6.dp)),
                contentAlignment = Alignment.Center,
            ) { if (selected) V2Icon(V2Icons.check, MaterialTheme.colorScheme.onPrimary, 14.dp, strokeWidth = 3f) }
        } else {
            RadioDot(selected)
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

// The amount field, as in "Nuevo movimiento": overline label, the figure
// in `display-sm`, a hint; tapping it opens the amount pad.
@Composable
fun AmountHeroField(label: String, expr: String, onExpr: (String) -> Unit, currency: String, padTitle: String = label, hint: String? = null) {
    val colors = NovaColors.current
    var open by remember { mutableStateOf(false) }
    val value = AmountPad.eval(expr)
    Column(
        Modifier.fillMaxWidth()
            .amountSurface(RoundedCornerShape(16.dp), active = open)
            .clickable(role = Role.Button, onClickLabel = padTitle) { open = true }
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(label.uppercase(), style = NovaType.overline, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(currency, style = NovaType.label, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, softWrap = false,
                modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(colors.surfaceSunken).padding(horizontal = 12.dp, vertical = 6.dp))
        }
        Text(
            com.s2nova.app.data.formatMoney(value, currency), style = NovaType.displaySm, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, softWrap = false,
            autoSize = androidx.compose.foundation.text.TextAutoSize.StepBased(minFontSize = 20.sp, maxFontSize = 28.sp),
        )
        // The hint only while there's nothing to show yet.
        val note = hint ?: if (value <= 0) tr(StringKey.STEP_TAP_AMOUNT) else null
        if (note != null) Text(note, style = NovaType.caption, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
        Modifier.padding(top = 16.dp).fillMaxWidth().height(48.dp).clip(RoundedCornerShape(12.dp))
            .border(1.dp, NovaColors.current.negative, RoundedCornerShape(12.dp))
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

// The header of a sub-page inside a single (non-step) sheet: a 48 dp back
// button and the page title. The page replaces the sheet's content instead
// of growing it, so the sheet still fits without scrolling.
@Composable
fun SheetPageHeader(title: String, onBack: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
        StepIconButton(V2Icons.back, tr(StringKey.STEP_BACK), onBack)
        Text(title, style = NovaType.title, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(start = 4.dp).semantics { heading() })
    }
}
