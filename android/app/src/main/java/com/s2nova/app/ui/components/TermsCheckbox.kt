package com.s2nova.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.ui.theme.NovaColors

@Composable
fun TermsCheckbox(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = NovaColors.current

    Row(
        verticalAlignment = Alignment.Top,
        modifier = modifier.clickable { onCheckedChange(!checked) },
    ) {
        Box(
            modifier = Modifier
                .padding(top = 1.dp)
                .size(20.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(if (checked) colors.loginPrimary else Color.Transparent)
                .then(
                    if (!checked) {
                        Modifier.border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(6.dp))
                    } else {
                        Modifier
                    },
                ),
            contentAlignment = Alignment.Center,
        ) {
            if (checked) {
                Icon(
                    imageVector = Icons.Filled.Check,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(12.dp),
                )
            }
        }

        Text(
            text = buildAnnotatedString {
                append("Acepto los ")
                withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = colors.loginHighlight)) {
                    append("Términos")
                }
                append(" y la ")
                withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = colors.loginHighlight)) {
                    append("Política de privacidad")
                }
            },
            fontSize = 13.sp,
            lineHeight = 18.8.sp,
            color = colors.loginTextMuted,
            modifier = Modifier.padding(start = 11.dp),
        )
    }
}
