package com.s2nova.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun NovaProgressBar(
    percentage: Int,
    color: Color,
    modifier: Modifier = Modifier,
    height: androidx.compose.ui.unit.Dp = 8.dp,
) {
    val fraction by animateFloatAsState(
        targetValue = (percentage / 100f).coerceIn(0f, 1f),
        animationSpec = tween(500),
        label = "progress",
    )
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .clip(RoundedCornerShape(50))
            .background(MaterialTheme.colorScheme.surfaceVariant),
        contentAlignment = Alignment.CenterStart,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(fraction)
                .fillMaxHeight()
                .clip(RoundedCornerShape(50))
                .background(color),
        )
    }
}
