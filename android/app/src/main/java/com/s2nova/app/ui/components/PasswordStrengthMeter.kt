package com.s2nova.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.ui.theme.NovaColors

private fun passwordStrengthScore(password: String): Int {
    var score = 0
    if (password.length >= 8) score += 1
    if (password.any { it.isUpperCase() }) score += 1
    if (password.any { it.isDigit() }) score += 1
    if (password.length >= 12 || password.any { !it.isLetterOrDigit() }) score += 1
    return score
}

@Composable
fun PasswordStrengthMeter(password: String, modifier: Modifier = Modifier) {
    if (password.isEmpty()) return
    val colors = NovaColors.current
    val score = passwordStrengthScore(password)

    Column(modifier = modifier.fillMaxWidth().padding(top = 3.dp)) {
        Row(
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(modifier = Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                repeat(4) { index ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(if (index < score) colors.loginPositive else colors.loginPositiveBg),
                    )
                }
            }
            if (score >= 3) {
                Text(
                    text = "Segura",
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.loginPositive,
                )
            }
        }
        Text(
            text = "Mínimo 8 caracteres, una mayúscula y un número.",
            fontSize = 12.sp,
            color = colors.loginTextMuted,
            lineHeight = 16.8.sp,
            modifier = Modifier.padding(top = 3.dp),
        )
    }
}
