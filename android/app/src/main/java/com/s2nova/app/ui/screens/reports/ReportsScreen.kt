package com.s2nova.app.ui.screens.reports

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.border
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.data.model.Report
import com.s2nova.app.data.model.ReportTotals
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.components.SheetPill
import com.s2nova.app.ui.rememberAppLanguage
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.screens.home.SyncErrorBanner
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.roundToInt

private val RANGES = listOf(
    Triple(3, StringKey.REPORTS_RANGE_3M, StringKey.REPORTS_SUBTITLE_3M),
    Triple(6, StringKey.REPORTS_RANGE_6M, StringKey.REPORTS_SUBTITLE_6M),
    Triple(12, StringKey.REPORTS_RANGE_12M, StringKey.REPORTS_SUBTITLE_12M),
)

// The tallest bar fills ~74% of the plot, as in the mockup (its 4,42M top
// month on a fixed 6M scale) — the same headroom Web's Reportes uses.
private const val BAR_HEADROOM = 1.36f

// The mockup's bar labels: "Mar", "Abr", … "Sep" (capitalized, no period —
// the JDK's es-CO short months read "sept.").
private val CHART_MONTHS_ES = listOf("Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic")
private val CHART_MONTHS_EN = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")

private fun chartMonth(monthKey: String, language: AppLanguage): String =
    (if (language == AppLanguage.EN) CHART_MONTHS_EN else CHART_MONTHS_ES)[monthKey.substring(5, 7).toInt() - 1]

private val DeltaPos = Color(0x2432C98A)
private val DeltaNeg = Color(0x24FF6262)

// Reportes (Android v2 mockup `isReports`): 3M/6M/12M pills, "Totales del
// periodo" against the range before it, "Ingresos vs gastos" and this
// month's "Gasto por categoría". Every figure comes from GET
// /summary/report — the same one Web's Reportes uses.
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
            Column(modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 10.dp, bottom = 12.dp)) {
                Text(
                    t(StringKey.TITLE_REPORTS),
                    fontSize = 21.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = (-0.42).sp,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Row(modifier = Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    RANGES.forEach { (months, label, _) -> SheetPill(t(label), range == months) { range = months } }
                }
            }

            LazyColumn(
                modifier = Modifier.fillMaxWidth().weight(1f),
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                if (failed) {
                    item {
                        SyncErrorBanner(message = t(StringKey.HOME_SYNC_ERROR), action = t(StringKey.COMMON_RETRY), onRetry = { scope.launch { load() } })
                    }
                }
                item { TotalsCard(report) }
                item { BarsCard(report, t(RANGES.first { it.first == range }.third)) }
                item { CategoryCard(report) }
                item { Spacer(Modifier.height(58.dp)) }
            }
        }
    }
}

@Composable
private fun ReportCard(content: @Composable () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(20.dp))
            .padding(18.dp),
    ) { content() }
}

@Composable
private fun CardTitle(text: String) {
    Text(text, fontSize = 13.5.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
}

@Composable
private fun Placeholder(widthFraction: Float, height: Int) {
    Box(
        Modifier
            .fillMaxWidth(widthFraction)
            .height(height.dp)
            .clip(RoundedCornerShape(6.dp))
            .background(NovaColors.current.dividerSubtle),
    )
}

// A change against the previous range: "−3%" / "+1 pt", green when it
// moved the right way (income, savings and rate up; expenses down).
private data class Delta(val text: String, val good: Boolean)

private fun pctDelta(current: Double, previous: Double, upIsGood: Boolean): Delta? {
    if (previous == 0.0) return null
    val pct = ((current - previous) / abs(previous) * 100).roundToInt()
    return Delta("${if (pct < 0) "−" else "+"}${abs(pct)}%", if (upIsGood) pct >= 0 else pct <= 0)
}

private fun pointDelta(current: ReportTotals, previous: ReportTotals): Delta? {
    if (previous.income == 0.0) return null
    val points = current.savingsRate - previous.savingsRate
    return Delta("${if (points < 0) "−" else "+"}${abs(points)} pt", points >= 0)
}

@Composable
private fun TotalsCard(report: Report?) {
    val t = rememberStrings()
    val format = rememberCurrencyFormatter()
    ReportCard {
        CardTitle(t(StringKey.REPORTS_PERIOD_TOTALS))
        Column(modifier = Modifier.padding(top = 10.dp)) {
            val now = report?.totals
            val before = report?.previousTotals
            listOf(
                Triple(t(StringKey.HOME_INCOME), now?.let { format(it.income) }, if (now != null && before != null) pctDelta(now.income, before.income, true) else null),
                Triple(t(StringKey.HOME_EXPENSES), now?.let { format(it.expenses) }, if (now != null && before != null) pctDelta(now.expenses, before.expenses, false) else null),
                Triple(t(StringKey.HOME_SAVINGS), now?.let { format(it.savings) }, if (now != null && before != null) pctDelta(now.savings, before.savings, true) else null),
                Triple(t(StringKey.REPORTS_SAVINGS_RATE), now?.let { "${it.savingsRate}%" }, if (now != null && before != null) pointDelta(now, before) else null),
            ).forEach { (label, value, delta) -> TotalRow(label, value, delta) }
        }
    }
}

@Composable
private fun TotalRow(label: String, value: String?, delta: Delta?) {
    val colors = NovaColors.current
    val divider = colors.dividerSubtle
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .drawBehind { drawLine(divider, Offset(0f, size.height), Offset(size.width, size.height), 1.dp.toPx()) }
            .padding(vertical = 11.dp),
    ) {
        Text(label, fontSize = 12.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
        if (value == null) {
            Box(Modifier.width(96.dp)) { Placeholder(1f, 13) }
        } else {
            Text(value, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
        }
        if (delta != null) {
            Text(
                delta.text,
                fontSize = 11.sp,
                fontWeight = FontWeight.ExtraBold,
                color = if (delta.good) colors.positive else colors.negative,
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(if (delta.good) DeltaPos else DeltaNeg)
                    .padding(horizontal = 8.dp, vertical = 3.dp),
            )
        }
    }
}

@Composable
private fun BarsCard(report: Report?, subtitle: String) {
    val t = rememberStrings()
    val colors = NovaColors.current
    val line = MaterialTheme.colorScheme.outline
    val months = report?.months.orEmpty()
    val language = rememberAppLanguage()
    val ceiling = (months.maxOfOrNull { maxOf(it.income, it.expenses) }?.toFloat() ?: 0f).coerceAtLeast(1f) * BAR_HEADROOM
    ReportCard {
        CardTitle(t(StringKey.REPORTS_INCOME_VS_EXPENSES))
        Text(subtitle, fontSize = 11.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp))
        Row(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.Bottom,
            modifier = Modifier
                .padding(top = 16.dp)
                .fillMaxWidth()
                .height(132.dp)
                .drawBehind { drawLine(line, Offset(0f, size.height), Offset(size.width, size.height), 1.dp.toPx()) },
        ) {
            months.forEach { m ->
                BoxWithConstraints(modifier = Modifier.weight(1f).fillMaxHeight(), contentAlignment = Alignment.BottomCenter) {
                    // Each bar is 42% of its month's column, at most 16dp.
                    val barWidth = minOf(maxWidth * 0.42f, 16.dp)
                    Row(horizontalArrangement = Arrangement.spacedBy(3.dp), verticalAlignment = Alignment.Bottom, modifier = Modifier.fillMaxHeight()) {
                        Bar(m.income.toFloat() / ceiling, colors.positive, barWidth)
                        Bar(m.expenses.toFloat() / ceiling, colors.negative, barWidth)
                    }
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 7.dp).fillMaxWidth()) {
            months.forEach { m ->
                Text(
                    chartMonth(m.month, language),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.textDim,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun Bar(fraction: Float, color: Color, width: Dp) {
    val height by animateFloatAsState(fraction.coerceIn(0f, 1f), tween(300), label = "bar")
    Box(
        Modifier
            .width(width)
            .fillMaxHeight(height)
            .background(color, RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp)),
    )
}

@Composable
private fun CategoryCard(report: Report?) {
    val t = rememberStrings()
    val colors = NovaColors.current
    val format = rememberCurrencyFormatter()
    val top = report?.categories?.take(5)
    ReportCard {
        CardTitle(t(StringKey.REPORTS_SPEND_BY_CATEGORY))
        Column(modifier = Modifier.padding(top = 14.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
            if (top == null) {
                repeat(4) { Placeholder(1f, 22) }
            }
            top?.forEach { c ->
                val color = categoryMap[c.category]?.let { Color(it.color) } ?: colors.textDim
                Column {
                    Row(modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)) {
                        Text(t(categoryStringKey(c.category)), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
                        Text(format(c.amount), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    // Width relative to the month's largest category, as on Web.
                    Box(Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)).background(MaterialTheme.colorScheme.outline)) {
                        Box(Modifier.fillMaxWidth((c.amount / top.first().amount).toFloat().coerceIn(0f, 1f)).fillMaxHeight().background(color))
                    }
                }
            }
        }
    }
}
