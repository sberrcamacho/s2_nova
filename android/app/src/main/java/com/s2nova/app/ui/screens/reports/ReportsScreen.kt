package com.s2nova.app.ui.screens.reports

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.TextAutoSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.data.model.Report
import com.s2nova.app.data.model.ReportTotals
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.CatMark
import com.s2nova.app.ui.components.categoryName
import com.s2nova.app.ui.rememberAppLanguage
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.screens.home.SyncErrorBanner
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.NovaType
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.log10
import kotlin.math.pow
import kotlin.math.roundToInt

private val RANGES = listOf(
    Triple(3, StringKey.REPORTS_RANGE_3M, StringKey.REPORTS_SUBTITLE_3M),
    Triple(6, StringKey.REPORTS_RANGE_6M, StringKey.REPORTS_SUBTITLE_6M),
    Triple(12, StringKey.REPORTS_RANGE_12M, StringKey.REPORTS_SUBTITLE_12M),
)

// Chart month labels: "Mar", "Abr", … "Sep" (capitalized, no period — the
// JDK's es-CO short months read "sept."), the same as Web's.
private val CHART_MONTHS_ES = listOf("Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic")
private val CHART_MONTHS_EN = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")

private fun chartMonth(monthKey: String, language: AppLanguage): String =
    (if (language == AppLanguage.EN) CHART_MONTHS_EN else CHART_MONTHS_ES)[monthKey.substring(5, 7).toInt() - 1]

// "$4,3 M" / "$850 mil" (es) or "$4.3M" / "$850K" (en): the value axis, as
// Web's compactMoney.
private fun compactMoney(value: Double, language: AppLanguage): String {
    val en = language == AppLanguage.EN
    val v = abs(value)
    fun one(n: Double): String = (if (n % 1.0 == 0.0) n.toInt().toString() else String.format(java.util.Locale.US, "%.1f", n)).let { if (en) it else it.replace('.', ',') }
    return when {
        v >= 1_000_000 -> "$" + one((v / 100_000).roundToInt() / 10.0) + if (en) "M" else " M"
        v >= 1_000 -> "$" + (v / 1_000).roundToInt() + if (en) "K" else " mil"
        else -> "$" + v.roundToInt()
    }
}

// A "nice" axis top (1, 1.5, 2, 2.5, 3, 4, 5, 6 or 8 × 10ⁿ), as on Web.
private fun niceCeiling(max: Double): Double {
    if (max <= 0) return 1.0
    val pow = 10.0.pow(floor(log10(max)))
    val step = listOf(1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0).first { it * pow >= max }
    return step * pow
}

// "94 %" in Spanish, "94%" in English.
private fun percentText(value: Int, language: AppLanguage): String =
    if (language == AppLanguage.EN) "$value%" else "$value %"

// Reportes: a 3M/6M/12M segmented control, the period totals as a 2×2
// bento against the range before it, "Ingresos vs gastos" as a grouped bar
// chart with a value axis and a tap readout, and this month's "Gasto por
// categoría". Every figure comes from GET /summary/report — the same one
// Web's Reportes uses.
@Composable
fun ReportsScreen() {
    val t = rememberStrings()
    val scope = rememberCoroutineScope()
    var range by remember { mutableIntStateOf(6) }
    var report by remember { mutableStateOf<Report?>(null) }
    var failed by remember { mutableStateOf(false) }

    suspend fun load() {
        runCatching {
            AppContainer.summaryRepository.report(range, demoTransactions = { AppContainer.transactionRepository.transactions.value })
        }
            .onSuccess { report = it; failed = false }
            .onFailure { failed = true }
    }
    LaunchedEffect(range) { load() }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        // The app shell already pads for the status bar.
        contentWindowInsets = WindowInsets(0),
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            Column(modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 12.dp)) {
                Text(t(StringKey.TITLE_REPORTS), style = NovaType.headline, color = MaterialTheme.colorScheme.onBackground)
                RangeSegmented(range, onPick = { range = it }, modifier = Modifier.padding(top = 12.dp))
            }

            LazyColumn(
                modifier = Modifier.fillMaxWidth().weight(1f),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (failed) {
                    item {
                        SyncErrorBanner(message = t(StringKey.HOME_SYNC_ERROR), action = t(StringKey.COMMON_RETRY), onRetry = { scope.launch { load() } })
                    }
                }
                item { TotalsBento(report) }
                item { BarsCard(report, t(RANGES.first { it.first == range }.third)) }
                item { CategoryCard(report) }
                item { Spacer(Modifier.height(58.dp)) }
            }
        }
    }
}

// Segmented control (DESIGN-SYSTEM.md §6.5), the same as Nuevo movimiento's.
@Composable
private fun RangeSegmented(range: Int, onPick: (Int) -> Unit, modifier: Modifier = Modifier) {
    val t = rememberStrings()
    val colors = NovaColors.current
    Row(
        modifier.fillMaxWidth().height(48.dp).clip(RoundedCornerShape(14.dp)).background(colors.surfaceSunken).padding(4.dp)
            .selectableGroup().semantics { contentDescription = t(StringKey.REPORTS_RANGE) },
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        RANGES.forEach { (months, label, _) ->
            val on = range == months
            Box(
                Modifier.weight(1f).fillMaxHeight()
                    .then(if (on) Modifier.shadow(2.dp, RoundedCornerShape(10.dp)) else Modifier)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (on) MaterialTheme.colorScheme.surface else Color.Transparent)
                    .then(if (on) Modifier.border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(10.dp)) else Modifier)
                    .selectable(selected = on, role = Role.Tab) { onPick(months) },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    t(label),
                    style = NovaType.label.copy(fontWeight = if (on) FontWeight.SemiBold else FontWeight.Medium),
                    color = if (on) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                )
            }
        }
    }
}

@Composable
private fun ReportCard(modifier: Modifier = Modifier, padding: Dp = 16.dp, content: @Composable () -> Unit) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(20.dp))
            .padding(padding),
    ) { content() }
}

@Composable
private fun CardTitle(text: String, subtitle: String? = null) {
    Column {
        Text(text, style = NovaType.title, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
        if (subtitle != null) Text(subtitle, style = NovaType.bodySm, color = NovaColors.current.textDim)
    }
}

@Composable
private fun Placeholder(widthFraction: Float, height: Int) {
    Box(
        Modifier
            .fillMaxWidth(widthFraction)
            .height(height.dp)
            .clip(RoundedCornerShape(6.dp))
            .background(NovaColors.current.surfaceSunken),
    )
}

// A change against the previous range: "↑ 3 %" / "↓ 1 pt", colored by
// whether it moved the right way (income, savings and rate up; expenses
// down) — the arrow carries the direction, so color isn't the only cue.
private data class Delta(val text: String, val good: Boolean, val flat: Boolean)

private fun pctDelta(current: Double, previous: Double, upIsGood: Boolean, language: AppLanguage): Delta? {
    if (previous == 0.0) return null
    val pct = ((current - previous) / abs(previous) * 100).roundToInt()
    val arrow = if (pct > 0) "↑ " else if (pct < 0) "↓ " else ""
    return Delta(arrow + percentText(abs(pct), language), if (upIsGood) pct >= 0 else pct <= 0, pct == 0)
}

private fun pointDelta(current: ReportTotals, previous: ReportTotals): Delta? {
    if (previous.income == 0.0) return null
    val points = current.savingsRate - previous.savingsRate
    val arrow = if (points > 0) "↑ " else if (points < 0) "↓ " else ""
    return Delta("$arrow${abs(points)} pt", points >= 0, points == 0)
}

// "Totales del periodo" as a 2×2 bento of StatTiles.
@Composable
private fun TotalsBento(report: Report?) {
    val t = rememberStrings()
    val format = rememberCurrencyFormatter()
    val language = rememberAppLanguage()
    val now = report?.totals
    val before = report?.previousTotals
    val tiles = listOf(
        Triple(t(StringKey.HOME_INCOME), now?.let { format(it.income) }, if (now != null && before != null) pctDelta(now.income, before.income, true, language) else null),
        Triple(t(StringKey.HOME_EXPENSES), now?.let { format(it.expenses) }, if (now != null && before != null) pctDelta(now.expenses, before.expenses, false, language) else null),
        Triple(t(StringKey.HOME_SAVINGS), now?.let { format(it.savings) }, if (now != null && before != null) pctDelta(now.savings, before.savings, true, language) else null),
        Triple(t(StringKey.REPORTS_SAVINGS_RATE), now?.let { percentText(it.savingsRate, language) }, if (now != null && before != null) pointDelta(now, before) else null),
    )
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        tiles.chunked(2).forEach { pair ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min)) {
                pair.forEach { (label, value, delta) ->
                    StatTile(label, value, delta, Modifier.weight(1f).fillMaxHeight())
                }
            }
        }
    }
}

@Composable
private fun StatTile(label: String, value: String?, delta: Delta?, modifier: Modifier = Modifier) {
    val t = rememberStrings()
    val colors = NovaColors.current
    val description = listOfNotNull(label, value, delta?.let { it.text + " " + t(StringKey.REPORTS_VS_PREVIOUS) }).joinToString(", ")
    ReportCard(modifier.clearAndSetSemantics { contentDescription = description }) {
        Text(label.uppercase(), style = NovaType.overline, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
        if (value == null) {
            Box(Modifier.padding(top = 6.dp, bottom = 2.dp)) { Placeholder(0.7f, 20) }
        } else {
            Text(
                value,
                style = NovaType.title.copy(fontFeatureSettings = "tnum"),
                color = MaterialTheme.colorScheme.onBackground,
                maxLines = 1,
                softWrap = false,
                autoSize = TextAutoSize.StepBased(minFontSize = 14.sp, maxFontSize = 20.sp),
                modifier = Modifier.padding(top = 4.dp),
            )
        }
        if (delta != null) {
            Text(
                delta.text + " " + t(StringKey.REPORTS_VS_PREVIOUS),
                style = NovaType.caption.copy(fontFeatureSettings = "tnum"),
                color = if (delta.flat) colors.textDim else if (delta.good) colors.positive else colors.negative,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}

// "Ingresos vs gastos" (DESIGN-SYSTEM.md §2.3): grouped bars in a fixed
// order with a signed legend, a value axis with units over `divider`
// gridlines, and a tap on a month shows its figures in the readout above
// the plot (the last month by default). TalkBack gets a summary sentence
// and each month's figures.
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun BarsCard(report: Report?, subtitle: String) {
    val t = rememberStrings()
    val colors = NovaColors.current
    val format = rememberCurrencyFormatter()
    val language = rememberAppLanguage()
    val months = report?.months.orEmpty()
    var selected by remember(report) { mutableIntStateOf(months.lastIndex) }
    val top = niceCeiling(months.maxOfOrNull { maxOf(it.income, it.expenses) } ?: 0.0)
    val income = t(StringKey.HOME_INCOME)
    val expenses = t(StringKey.HOME_EXPENSES)
    val peak = months.maxByOrNull { it.expenses }
    val summary = if (report != null) t(StringKey.REPORTS_SUMMARY_FLOW).format(subtitle, format(report.totals.income), format(report.totals.expenses), peak?.let { chartMonth(it.month, language) } ?: "—") else ""
    val grid = colors.dividerSubtle
    val baseline = MaterialTheme.colorScheme.outline
    val axisWidth = 52.dp
    val plotHeight = 160.dp

    ReportCard {
        // The legend moves under the title when both don't fit on one line.
        FlowRow(
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Box(Modifier.padding(end = 12.dp)) { CardTitle(t(StringKey.REPORTS_INCOME_VS_EXPENSES), subtitle) }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(top = 4.dp)) {
                LegendItem("+ $income", colors.positive)
                LegendItem("− $expenses", colors.negative)
            }
        }
        if (report == null) {
            Box(Modifier.padding(top = 16.dp)) { Placeholder(1f, 180) }
            return@ReportCard
        }
        // Readout of the selected month.
        months.getOrNull(selected)?.let { m ->
            Row(
                Modifier.padding(top = 12.dp).fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(colors.surfaceSunken).padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(chartMonth(m.month, language), style = NovaType.label, color = MaterialTheme.colorScheme.onBackground)
                Text("+" + format(m.income), style = NovaType.label.copy(fontFeatureSettings = "tnum"), color = colors.positive, maxLines = 1, softWrap = false)
                Text("−" + format(m.expenses), style = NovaType.label.copy(fontFeatureSettings = "tnum"), color = colors.negative, maxLines = 1, softWrap = false)
            }
        }
        Row(Modifier.padding(top = 16.dp).semantics { contentDescription = summary }) {
            // Value axis: top, middle and zero.
            Box(Modifier.width(axisWidth).height(plotHeight)) {
                listOf(top to Alignment.TopEnd, top / 2 to Alignment.CenterEnd, 0.0 to Alignment.BottomEnd).forEach { (v, align) ->
                    Text(
                        compactMoney(v, language),
                        style = NovaType.caption.copy(fontFeatureSettings = "tnum"),
                        color = colors.textDim,
                        maxLines = 1,
                        softWrap = false,
                        modifier = Modifier.align(align).padding(end = 8.dp)
                            .then(if (align == Alignment.TopEnd) Modifier.padding(bottom = 0.dp) else Modifier),
                    )
                }
            }
            Column(Modifier.weight(1f)) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.Bottom,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(plotHeight)
                        .selectableGroup()
                        .drawBehind {
                            listOf(0f, 0.5f).forEach { f -> drawLine(grid, Offset(0f, size.height * f), Offset(size.width, size.height * f), 1.dp.toPx()) }
                            drawLine(baseline, Offset(0f, size.height), Offset(size.width, size.height), 1.dp.toPx())
                        },
                ) {
                    months.forEachIndexed { i, m ->
                        val on = i == selected
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(3.dp, Alignment.CenterHorizontally),
                            verticalAlignment = Alignment.Bottom,
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight()
                                .clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
                                .background(if (on) colors.surfaceSunken else Color.Transparent)
                                .selectable(selected = on, role = Role.Tab) { selected = i }
                                .semantics { contentDescription = "${chartMonth(m.month, language)}: $income ${format(m.income)}, $expenses ${format(m.expenses)}" },
                        ) {
                            Bar((m.income / top).toFloat(), colors.positive)
                            Bar((m.expenses / top).toFloat(), colors.negative)
                        }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(top = 6.dp).fillMaxWidth()) {
                    months.forEachIndexed { i, m ->
                        Text(
                            chartMonth(m.month, language),
                            style = NovaType.caption,
                            fontWeight = if (i == selected) FontWeight.SemiBold else FontWeight.Medium,
                            color = if (i == selected) MaterialTheme.colorScheme.onBackground else colors.textDim,
                            textAlign = TextAlign.Center,
                            maxLines = 1,
                            softWrap = false,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
        }
        Text(t(StringKey.REPORTS_TAP_MONTH), style = NovaType.caption, color = colors.textDim, modifier = Modifier.padding(top = 8.dp))
    }
}

@Composable
private fun LegendItem(label: String, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(Modifier.size(10.dp).clip(RoundedCornerShape(3.dp)).background(color))
        Text(label, style = NovaType.label.copy(fontWeight = FontWeight.Medium), color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, softWrap = false)
    }
}

@Composable
private fun Bar(fraction: Float, color: Color) {
    val height by animateFloatAsState(fraction.coerceIn(0f, 1f), tween(300), label = "bar")
    Box(
        Modifier
            .widthIn(max = 14.dp)
            .fillMaxWidth(0.42f)
            .fillMaxHeight(height)
            .background(color, RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp)),
    )
}

// "Gasto por categoría": this month's top five as horizontal bars (widths
// relative to the largest, as on Web), each with its mark and amount.
@Composable
private fun CategoryCard(report: Report?) {
    val t = rememberStrings()
    val colors = NovaColors.current
    val format = rememberCurrencyFormatter()
    val top = report?.categories?.take(5)
    ReportCard {
        CardTitle(t(StringKey.REPORTS_SPEND_BY_CATEGORY))
        Column(modifier = Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (top == null) {
                repeat(4) { Placeholder(1f, 28) }
            }
            top?.forEach { c ->
                val color = com.s2nova.app.ui.components.categoryColor(c.category)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    CatMark(c.category, 32.dp)
                    Column(Modifier.weight(1f)) {
                        Row(modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)) {
                            Text(categoryName(c.category), style = NovaType.label, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                            Text(format(c.amount), style = NovaType.label.copy(fontFeatureSettings = "tnum"), color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, softWrap = false, modifier = Modifier.padding(start = 12.dp))
                        }
                        Box(Modifier.fillMaxWidth().height(8.dp).clip(CircleShape).background(colors.surfaceSunken)) {
                            Box(Modifier.fillMaxWidth((c.amount / top.first().amount).toFloat().coerceIn(0f, 1f)).fillMaxHeight().clip(CircleShape).background(color))
                        }
                    }
                }
            }
        }
    }
}
