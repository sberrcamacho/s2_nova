package com.s2nova.app.ui.screens.splash

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun SplashScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(20.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text("S2", color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp)
            }
            CircularProgressIndicator(
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .padding(top = 24.dp)
                    .size(28.dp),
                strokeWidth = 3.dp,
            )
        }
    }
}
