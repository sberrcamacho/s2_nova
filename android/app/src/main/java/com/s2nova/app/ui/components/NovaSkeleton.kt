package com.s2nova.app.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.tr

// Placeholder rows shown while a list's first load is in flight (the same
// `surface-sunken` blocks as Home's balance skeleton, pulsing). It announces
// "Cargando" once instead of exposing the blocks to a screen reader.
@Composable
fun NovaSkeletonRows(count: Int = 4, modifier: Modifier = Modifier) {
    val colors = NovaColors.current
    val pulse = rememberInfiniteTransition(label = "skeleton").animateFloat(
        initialValue = 0.55f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(900), RepeatMode.Reverse),
        label = "skeleton-alpha",
    )
    val loading = tr(StringKey.COMMON_LOADING)
    Column(
        modifier = modifier.fillMaxWidth().semantics { contentDescription = loading },
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        repeat(count) {
            Row(
                modifier = Modifier.fillMaxWidth().alpha(pulse.value),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Box(Modifier.size(40.dp).clip(CircleShape).background(colors.surfaceSunken))
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.fillMaxWidth(0.6f).height(12.dp).clip(RoundedCornerShape(6.dp)).background(colors.surfaceSunken))
                    Box(Modifier.fillMaxWidth(0.35f).height(10.dp).clip(RoundedCornerShape(5.dp)).background(colors.surfaceSunken))
                }
                Box(Modifier.size(width = 64.dp, height = 14.dp).clip(RoundedCornerShape(6.dp)).background(colors.surfaceSunken))
            }
        }
    }
}
