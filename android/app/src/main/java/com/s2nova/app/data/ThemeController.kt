package com.s2nova.app.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

// App-wide dark-mode override — null means "follow the system", matching
// the web app's explicit light/dark toggle (also user-settable, also
// independent of any persisted backend preference for now).
object ThemeController {
    private val _darkOverride = MutableStateFlow<Boolean?>(null)
    val darkOverride: StateFlow<Boolean?> = _darkOverride.asStateFlow()

    fun setDark(dark: Boolean) {
        _darkOverride.value = dark
    }
}
