package com.s2nova.app.ui.screens.reports

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.s2nova.app.data.ReportRange
import com.s2nova.app.data.ReportSelection
import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.DraftSheetPrimaryButton
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.strokeIcon
import com.s2nova.app.ui.monthYearLabel
import com.s2nova.app.ui.rememberAppLanguage
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.NovaType
import com.s2nova.app.ui.theme.ctaBrush
import java.time.LocalDate

private val ChevronLeft = strokeIcon("ChevronLeft", "M15 18l-6-6 6-6")
private val ChevronRight = strokeIcon("ChevronRight", "M9 18l6-6-6-6")
private val Check = strokeIcon("Check", "M5 12.5l4.5 4.5L19 7", strokeWidth = 2.6f)

// "Agosto 2026" from "2026-08".
internal fun monthKeyLabel(key: String, language: AppLanguage): String = monthYearLabel(LocalDate.parse("$key-01"), language)

// Reportes' "Rango": a year with its twelve months; the first tap picks the
// first month, the second the last (an earlier one restarts the range).
// Months after the current one, or more than 24 from the first, can't be
// picked. Never scrolls (DESIGN-SYSTEM §6.11). Web's MonthRangeDialog is the
// same picker.
@Composable
fun MonthRangeSheet(initial: ReportSelection.Span, currentMonth: String, onApply: (String, String) -> Unit, onDismiss: () -> Unit) {
    val t = rememberStrings()
    val language = rememberAppLanguage()
    val colors = NovaColors.current
    var from by remember { mutableStateOf(initial.from) }
    var to by remember { mutableStateOf<String?>(initial.to) }
    var year by remember { mutableIntStateOf(initial.to.take(4).toInt()) }
    val currentYear = currentMonth.take(4).toInt()
    val maxFromStart = ReportRange.shift(from, ReportRange.MAX_MONTHS - 1)
    val lastAllowed = if (to == null && maxFromStart < currentMonth) maxFromStart else currentMonth
    val end = to ?: from
    val count = ReportRange.monthsBetween(from, end)
    val names = if (language == AppLanguage.EN) CHART_MONTHS_EN else CHART_MONTHS_ES

    NovaDraftSheet(onDismiss = onDismiss, title = t(StringKey.REPORTS_RANGE_TITLE)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            YearArrow(ChevronLeft, t(StringKey.REPORTS_RANGE_PREV_YEAR), enabled = true) { year -= 1 }
            Text(
                year.toString(),
                style = NovaType.titleSm.copy(fontFeatureSettings = "tnum"),
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.weight(1f).semantics { liveRegion = LiveRegionMode.Polite },
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            YearArrow(ChevronRight, t(StringKey.REPORTS_RANGE_NEXT_YEAR), enabled = year < currentYear) { year += 1 }
        }
        Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            (0 until 3).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    (0 until 4).forEach { col ->
                        val month = row * 4 + col + 1
                        val key = "%04d-%02d".format(year, month)
                        val enabled = key <= lastAllowed
                        val edge = key == from || key == to
                        val inside = !edge && to != null && key > from && key < to!!
                        val shape = RoundedCornerShape(10.dp)
                        Box(
                            Modifier.weight(1f).height(48.dp).clip(shape)
                                .then(
                                    when {
                                        edge -> Modifier.background(ctaBrush())
                                        inside -> Modifier.background(MaterialTheme.colorScheme.primaryContainer)
                                        else -> Modifier
                                    },
                                )
                                .alpha(if (enabled) 1f else 0.5f)
                                .clickable(enabled = enabled, role = Role.Button) {
                                    val current = to
                                    if (current != null || key < from) {
                                        from = key
                                        to = null
                                    } else {
                                        to = key
                                    }
                                }
                                .semantics {
                                    contentDescription = monthKeyLabel(key, language)
                                    selected = edge || inside
                                },
                            contentAlignment = Alignment.Center,
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                if (edge) Icon(Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                                Text(
                                    names[month - 1],
                                    style = NovaType.label.copy(fontWeight = if (edge || inside) FontWeight.SemiBold else FontWeight.Medium),
                                    color = when {
                                        edge -> Color.White
                                        inside -> MaterialTheme.colorScheme.onPrimaryContainer
                                        enabled -> MaterialTheme.colorScheme.onBackground
                                        else -> colors.textDim
                                    },
                                    maxLines = 1,
                                )
                            }
                        }
                    }
                }
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 16.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                spanLabel(from, end, t, language),
                style = NovaType.label,
                color = MaterialTheme.colorScheme.onBackground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            Text(
                if (count == 1) t(StringKey.REPORTS_RANGE_ONE_MONTH) else t(StringKey.REPORTS_RANGE_MONTHS).format(count.toString()),
                style = NovaType.label.copy(fontFeatureSettings = "tnum", fontWeight = FontWeight.Medium),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                modifier = Modifier.padding(start = 12.dp),
            )
        }
        Text(
            if (to == null) t(StringKey.REPORTS_RANGE_HINT_END).format(monthKeyLabel(from, language)) else t(StringKey.REPORTS_RANGE_HINT_START),
            style = NovaType.caption,
            color = colors.textDim,
            modifier = Modifier.padding(top = 4.dp, bottom = 16.dp),
        )
        DraftSheetPrimaryButton(t(StringKey.REPORTS_RANGE_APPLY), enabled = true, onClick = { onApply(from, end) })
    }
}

@Composable
private fun YearArrow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, enabled: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.size(48.dp).clip(CircleShape).alpha(if (enabled) 1f else 0.38f)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .semantics { contentDescription = label },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.onBackground, modifier = Modifier.size(22.dp))
    }
}
