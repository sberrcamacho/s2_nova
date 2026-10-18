package com.s2nova.app.ui.components

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.focus.onFocusEvent
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity

// A focused text field only scrolls its cursor line into view, so the box,
// its label or its error could stay under the keyboard or a fixed Guardar.
// This keeps the whole element in view while it has focus, again on every
// step of the keyboard sliding in (the space above it shrinks as it rises)
// and when the element grows (an error or a rule appears while typing).
// On a group (a field and its submit button), focus anywhere inside counts.
fun Modifier.revealOnFocus(): Modifier = composed {
    val requester = remember { BringIntoViewRequester() }
    var focused by remember { mutableStateOf(false) }
    // Read only while focused, so the other fields don't recompose with
    // every frame of the keyboard animation.
    val ime = if (focused) WindowInsets.ime.getBottom(LocalDensity.current) else 0
    var height by remember { mutableIntStateOf(0) }
    LaunchedEffect(focused, ime, height) {
        if (focused) requester.bringIntoView()
    }
    bringIntoViewRequester(requester)
        .onSizeChanged { height = it.height }
        .onFocusEvent { focused = it.hasFocus }
}
