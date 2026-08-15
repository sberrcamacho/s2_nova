package com.s2nova.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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

@Composable
fun NovaBarPair(
    label: String,
    income: Float,
    expense: Float,
    maxValue: Float,
    positiveColor: Color,
    negativeColor: Color,
    modifier: Modifier = Modifier,
) {
    androidx.compose.foundation.layout.Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        androidx.compose.foundation.layout.Row(
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(3.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(width = 10.dp, height = (80 * (income / maxValue).coerceIn(0f, 1f)).dp)
                    .background(positiveColor, androidx.compose.foundation.shape.RoundedCornerShape(3.dp)),
            )
            Box(
                modifier = Modifier
                    .size(width = 10.dp, height = (80 * (expense / maxValue).coerceIn(0f, 1f)).dp)
                    .background(negativeColor, androidx.compose.foundation.shape.RoundedCornerShape(3.dp)),
            )
        }
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
