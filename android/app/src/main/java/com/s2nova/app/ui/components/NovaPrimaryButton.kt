package com.s2nova.app.ui.components

import com.s2nova.app.ui.theme.pressScale
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.clickable
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.ctaBrush

@Composable
fun NovaPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val clickable = enabled && !loading

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(56.dp)
            .then(if (clickable) Modifier.pressScale(interactionSource, pressedScale = 0.98f) else Modifier)
            .clip(RoundedCornerShape(50))
            // Disabled dims the whole button (38 %), not only its label.
            .alpha(if (!clickable) 0.38f else if (pressed) 0.9f else 1f)
            // The brand gradient of web's .btn-cta.
            .background(ctaBrush())
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = clickable,
                role = androidx.compose.ui.semantics.Role.Button,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            Text(
                text = text,
                color = Color.White,
                style = com.s2nova.app.ui.theme.NovaType.label.copy(fontSize = 16.sp),
                maxLines = 1,
                softWrap = false,
            )
        }
    }
}
