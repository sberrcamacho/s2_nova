package com.s2nova.app.ui.components

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
import androidx.compose.ui.graphics.Color
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
