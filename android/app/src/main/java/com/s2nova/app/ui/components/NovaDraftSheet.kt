package com.s2nova.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetState
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.window.DialogWindowProvider
import androidx.core.view.WindowCompat
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.alpha
import androidx.compose.foundation.layout.height
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.ui.theme.NovaColors
import kotlin.math.pow

// Shared bottom-sheet shell for every create/edit/delete "draft" form
// (budgets, goals, loans, wallets, recurring series, goal contribution,
// notifications) — matches the mockup's `.sheet` class exactly: 28px top
// corners, a centered 32x4 grab handle, a 65%-black scrim, and
// `padding: 8px 20px 26px` content insets. Built once so every screen that
// used to show an AlertDialog for these flows converts to the same look.
// A sheet lives in its own window, which starts with light system-bar
// defaults: on 3-button navigation that painted a light bar under a dark
// sheet. This matches the window's navigation bar to the app theme the sheet
// is drawn in (transparent, so the sheet surface shows through, with icons
// that contrast with it).
@Composable
internal fun SheetSystemBars() {
    val view = LocalView.current
    val dark = NovaColors.current.sheetSurface.luminance() < 0.5f
    SideEffect {
        val window = (view.parent as? DialogWindowProvider)?.window ?: return@SideEffect
        window.navigationBarColor = android.graphics.Color.TRANSPARENT
        if (android.os.Build.VERSION.SDK_INT >= 29) window.isNavigationBarContrastEnforced = false
        WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = !dark
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NovaDraftSheet(
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    title: String? = null,
    // Mockup sheet note under the title (11 --dim, line-height 1.45).
    subtitle: androidx.compose.ui.text.AnnotatedString? = null,
    sheetState: SheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
    // .65 for every draft form; the Ajustes tutorial sheet uses .72.
    scrimAlpha: Float = 0.65f,
    // .sheet padding-bottom (26); the amount pad uses 18.
    bottomPadding: androidx.compose.ui.unit.Dp = 26.dp,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = NovaColors.current
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        containerColor = colors.sheetSurface,
        scrimColor = Color.Black.copy(alpha = scrimAlpha),
        dragHandle = {
            Box(
                modifier = Modifier.fillMaxWidth().padding(top = 10.dp, bottom = 4.dp),
                contentAlignment = Alignment.TopCenter,
            ) {
                Box(
                    modifier = Modifier
                        .size(width = 32.dp, height = 4.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(colors.sheetGrip),
                )
            }
        },
    ) {
        SheetSystemBars()
        Column(
            // Taps in a sheet's own window still count for "Cierre automático".
            // On the content, not the sheet: ModalBottomSheet applies its
            // modifier before the sheet's offset, so a pointer modifier there
            // hit-tests at the top of the screen and swallowed scrim taps.
            modifier = modifier
                .countsAsActivity()
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = bottomPadding),
        ) {
            if (title != null) {
                Text(
                    text = title,
                    style = com.s2nova.app.ui.theme.NovaType.title,
                    color = MaterialTheme.colorScheme.onBackground,
                    modifier = Modifier.padding(start = 4.dp, end = 4.dp, bottom = if (subtitle != null) 0.dp else 16.dp),
                )
            }
            if (subtitle != null) {
                Text(
                    text = subtitle,
                    style = com.s2nova.app.ui.theme.NovaType.bodySm,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 4.dp, end = 4.dp, top = 2.dp, bottom = 16.dp),
                )
            }
            content()
        }
    }
}

// The red "Eliminar X" text row every edit-mode draft sheet has at the
// bottom (budget/goal/loan/wallet/recurring-series delete).
@Composable
fun DraftSheetDeleteRow(label: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = NovaColors.current
    Text(
        text = label,
        fontSize = 15.sp,
        fontWeight = FontWeight.ExtraBold,
        color = colors.negative,
        textAlign = TextAlign.Center,
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 6.dp),
    )
}

// The sheet's primary "Guardar" button: filled accent when the form is
// valid, muted/disabled-looking surface otherwise — matches the mockup's
// draftSaveStyle formula used by every draft sheet.
@Composable
fun DraftSheetPrimaryButton(
    label: String,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // Primary button (§6.3): 52 dp; disabled is the same button at 38 %.
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp)
            .alpha(if (enabled) 1f else 0.38f)
            .clip(RoundedCornerShape(50))
            .background(com.s2nova.app.ui.theme.ctaBrush())
            .clickable(enabled = enabled, role = androidx.compose.ui.semantics.Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(text = label, color = Color.White, style = com.s2nova.app.ui.theme.NovaType.label, maxLines = 1, softWrap = false)
    }
}

// Relative-luminance ink pick so a filled color chip's label stays legible
// — ported from the mockup's inkOn(hex) (WCAG-style luminance, threshold
// 0.18) rather than always defaulting to white or black text.
private fun inkOn(color: Color): Color {
    fun lin(c: Float) = if (c <= 0.03928f) c / 12.92f else ((c + 0.055f) / 1.055f).toDouble().pow(2.4).toFloat()
    val luminance = 0.2126f * lin(color.red) + 0.7152f * lin(color.green) + 0.0722f * lin(color.blue)
    return if (luminance > 0.18f) Color(0xFF111118) else Color.White
}

// A category/type-colored selectable pill — background is the category
// color at low alpha (or filled solid when selected), matching the
// mockup's chip formula used by budget/goal/loan/recurring-series category
// and type pickers. `enabled = false` renders the current state without
// letting the user change it (e.g. a budget's category is fixed after
// creation server-side).
@Composable
fun ColorPill(
    label: String,
    color: Color,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    // Mockup chip: color + '1f' fill, color + '59' border, --chip-text label.
    val background = if (selected) color else color.copy(alpha = 0.12f)
    val borderColor = if (selected) Color.Transparent else color.copy(alpha = 0.35f)
    val textColor = if (selected) inkOn(color) else NovaColors.current.pillText
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(background)
            .border(1.dp, borderColor, RoundedCornerShape(50))
            .then(if (enabled) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 13.dp, vertical = 9.dp),
    ) {
        Text(
            text = label,
            fontSize = 13.sp,
            fontWeight = if (selected) FontWeight.ExtraBold else FontWeight.SemiBold,
            color = textColor,
        )
    }
}
