package com.s2nova.app.ui.components

import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.runtime.remember
import com.s2nova.app.ui.theme.cardAurora
import com.s2nova.app.ui.theme.pressScale
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun NovaCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    borderColor: Color = MaterialTheme.colorScheme.outline,
    content: @Composable () -> Unit,
) {
    val shape = RoundedCornerShape(16.dp)
    val interaction = remember { MutableInteractionSource() }
    val base = modifier
        .then(if (onClick != null) Modifier.pressScale(interaction, pressedScale = 0.98f) else Modifier)
        .clip(shape)
        .background(MaterialTheme.colorScheme.surface)
        // Brand corner auroras, as web's .nova-card.
        .cardAurora()
        .border(1.dp, borderColor, shape)
    val clickable = if (onClick != null) base.clickable(interactionSource = interaction, indication = androidx.compose.material3.ripple(), onClick = onClick) else base
    Box(modifier = clickable) { content() }
}
