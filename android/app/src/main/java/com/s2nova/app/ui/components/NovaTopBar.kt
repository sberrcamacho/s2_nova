package com.s2nova.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberStrings

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NovaTopBar(
    title: String,
    onBack: (() -> Unit)? = null,
    actions: @Composable () -> Unit = {},
    containerColor: Color = MaterialTheme.colorScheme.background,
    contentColor: Color = MaterialTheme.colorScheme.onBackground,
) {
    val t = rememberStrings()
    CenterAlignedTopAppBar(
        title = { Text(title, color = contentColor) },
        navigationIcon = {
            if (onBack != null) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = t(StringKey.COMMON_BACK), tint = contentColor)
                }
            }
        },
        actions = { actions() },
        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = containerColor),
    )
}

// The v2 mockup's stacked-screen header: a 38dp "←" target in --muted,
// then the title at 17/800 (Perfil, Billeteras, Ajustes, Programados).
@Composable
fun BackHeader(title: String, onBack: () -> Unit, modifier: Modifier = Modifier) {
    val t = rememberStrings()
    androidx.compose.foundation.layout.Row(
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        modifier = modifier
            .fillMaxWidth()
            .padding(start = 18.dp, end = 18.dp, top = 10.dp, bottom = 12.dp),
    ) {
        androidx.compose.foundation.layout.Box(
            modifier = Modifier
                .size(38.dp)
                .clip(androidx.compose.foundation.shape.CircleShape)
                .clickable(onClick = onBack)
                .semantics { contentDescription = t(StringKey.COMMON_BACK) },
            contentAlignment = androidx.compose.ui.Alignment.Center,
        ) {
            Text("←", fontSize = 19.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(
            title,
            fontSize = 17.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = (-0.255).sp,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(start = 12.dp),
        )
    }
}
