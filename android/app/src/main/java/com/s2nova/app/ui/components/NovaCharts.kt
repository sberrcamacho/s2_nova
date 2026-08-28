package com.s2nova.app.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

data class DonutSlice(val value: Double, val color: Color)

@Composable
fun NovaDonutChart(
    slices: List<DonutSlice>,
    modifier: Modifier = Modifier,
    diameter: Dp = 180.dp,
    strokeWidth: Dp = 22.dp,
    centerLabel: String? = null,
    centerValue: String? = null,
) {
    val total = slices.sumOf { it.value }
    Box(modifier = modifier.size(diameter), contentAlignment = Alignment.Center) {
        Canvas(modifier = Modifier.size(diameter)) {
            val stroke = Stroke(width = strokeWidth.toPx())
            val gapDegrees = 3f
            var startAngle = -90f
            val inset = strokeWidth.toPx() / 2
            val arcSize = Size(size.width - strokeWidth.toPx(), size.height - strokeWidth.toPx())
            slices.forEach { slice ->
                if (total <= 0.0) return@forEach
                val sweep = (slice.value / total * 360.0).toFloat() - gapDegrees
                drawArc(
                    color = slice.color,
                    startAngle = startAngle,
                    sweepAngle = sweep.coerceAtLeast(0f),
                    useCenter = false,
                    topLeft = Offset(inset, inset),
                    size = arcSize,
                    style = stroke,
                )
                startAngle += (slice.value / total * 360.0).toFloat()
            }
        }
        if (centerValue != null || centerLabel != null) {
            Box(contentAlignment = Alignment.Center) {
                androidx.compose.foundation.layout.Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    if (centerValue != null) {
                        Text(centerValue, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
                    }
                    if (centerLabel != null) {
                        Text(centerLabel, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

// Single-value ring (Goals tab) — same hand-rolled Canvas approach as
// NovaDonutChart, but one arc + a centered percentage label.
@Composable
fun NovaProgressRing(
    percentage: Int,
    color: Color,
    modifier: Modifier = Modifier,
    diameter: Dp = 62.dp,
    strokeWidth: Dp = 6.dp,
    trackColor: Color = color.copy(alpha = 0.18f),
    centerLabel: String? = null,
) {
    Box(modifier = modifier.size(diameter), contentAlignment = Alignment.Center) {
        Canvas(modifier = Modifier.size(diameter)) {
            val stroke = Stroke(width = strokeWidth.toPx(), cap = androidx.compose.ui.graphics.StrokeCap.Round)
            val inset = strokeWidth.toPx() / 2
            val arcSize = Size(size.width - strokeWidth.toPx(), size.height - strokeWidth.toPx())
            drawArc(color = trackColor, startAngle = -90f, sweepAngle = 360f, useCenter = false, topLeft = Offset(inset, inset), size = arcSize, style = stroke)
            val sweep = (percentage.coerceIn(0, 100) / 100f) * 360f
            drawArc(color = color, startAngle = -90f, sweepAngle = sweep, useCenter = false, topLeft = Offset(inset, inset), size = arcSize, style = stroke)
        }
        if (centerLabel != null) {
            Text(
                centerLabel,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
            )
        }
    }
}

@Composable
fun NovaSparkline(
    points: List<Float>,
    color: Color,
    modifier: Modifier = Modifier,
    fillColor: Color = color.copy(alpha = 0.15f),
) {
    Canvas(modifier = modifier) {
        if (points.size < 2) return@Canvas
        val max = points.max()
        val min = points.min()
        val range = (max - min).takeIf { it > 0f } ?: 1f
        val stepX = size.width / (points.size - 1)

        fun yFor(v: Float) = size.height - ((v - min) / range) * size.height

        val linePath = androidx.compose.ui.graphics.Path()
        points.forEachIndexed { i, v ->
            val x = i * stepX
            val y = yFor(v)
            if (i == 0) linePath.moveTo(x, y) else linePath.lineTo(x, y)
        }

        val fillPath = androidx.compose.ui.graphics.Path().apply {
            addPath(linePath)
            lineTo((points.size - 1) * stepX, size.height)
            lineTo(0f, size.height)
            close()
        }
        drawPath(fillPath, color = fillColor)
        drawPath(linePath, color = color, style = Stroke(width = 6f, cap = androidx.compose.ui.graphics.StrokeCap.Round))
    }
}

// One income/expense bar pair for a single period slot in the reports
// "Ingresos vs gastos" chart. Bars only — the caller renders period labels
// in a separate row below so they stay in one straight line regardless of
// bar height (see ReportsScreen's income-vs-expenses card).
private val BarTopCornerShape = RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp, bottomStart = 0.dp, bottomEnd = 0.dp)

@Composable
fun NovaBarPair(
    income: Float,
    expense: Float,
    maxValue: Float,
    positiveColor: Color,
    negativeColor: Color,
    modifier: Modifier = Modifier,
    maxBarHeight: Dp = 112.dp,
) {
    val incomeHeight by animateDpAsState(
        targetValue = maxBarHeight * (income / maxValue).coerceIn(0f, 1f),
        animationSpec = tween(durationMillis = 300),
        label = "incomeBarHeight",
    )
    val expenseHeight by animateDpAsState(
        targetValue = maxBarHeight * (expense / maxValue).coerceIn(0f, 1f),
        animationSpec = tween(durationMillis = 300),
        label = "expenseBarHeight",
    )
    Box(
        modifier = modifier.fillMaxHeight(),
        contentAlignment = Alignment.BottomCenter,
    ) {
        Row(
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.42f)
                    .widthIn(max = 16.dp)
                    .height(incomeHeight)
                    .background(positiveColor, BarTopCornerShape),
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.42f)
                    .widthIn(max = 16.dp)
                    .height(expenseHeight)
                    .background(negativeColor, BarTopCornerShape),
            )
        }
    }
}
