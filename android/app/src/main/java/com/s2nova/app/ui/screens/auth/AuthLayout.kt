package com.s2nova.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun AuthLayout(
    title: String,
    subtitle: String,
    content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 32.dp),
    ) {
        AuthLogo()
        androidx.compose.foundation.layout.Spacer(modifier = Modifier.padding(top = 28.dp))
        Text(title, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
        androidx.compose.foundation.layout.Spacer(modifier = Modifier.padding(top = 6.dp))
        Text(subtitle, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        androidx.compose.foundation.layout.Spacer(modifier = Modifier.padding(top = 28.dp))
        content()
    }
}

@Composable
fun AuthLogo() {
    Box(
        modifier = Modifier
            .size(44.dp)
            .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(14.dp)),
        contentAlignment = Alignment.Center,
    ) {
        Text("S2", color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
    }
}
