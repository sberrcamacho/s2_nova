package com.s2nova.app.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.R
import com.s2nova.app.data.ThemeController

private val GoogleButtonTextColor = Color(0xFF1F1F28)
private val GoogleButtonBorderLight = Color(0xFFEBEBF2)

@Composable
fun GoogleSignInButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    val darkOverride by ThemeController.darkOverride.collectAsStateWithLifecycle()
    val isDark = darkOverride ?: isSystemInDarkTheme()
    val clickable = enabled && !loading

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(56.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White)
            .then(
                if (!isDark) Modifier.border(1.dp, GoogleButtonBorderLight, RoundedCornerShape(16.dp)) else Modifier,
            )
            .alpha(if (!clickable) 0.6f else 1f)
            .clickable(enabled = clickable, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = GoogleButtonTextColor, strokeWidth = 2.dp)
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Image(
                    painter = painterResource(R.drawable.ic_google_logo),
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                )
                Text(
                    text = "Continuar con Google",
                    color = GoogleButtonTextColor,
                    fontSize = 14.5.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(start = 12.dp),
                )
            }
        }
    }
}
