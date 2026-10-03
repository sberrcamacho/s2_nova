package com.s2nova.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.core.handlers.ReplaceFileCorruptionHandler
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.preferencesDataStore
import kotlin.properties.ReadOnlyProperty

// Every local preferences file goes through here. A file that can't be
// parsed (cut short by a crash or a kill mid-write, or bytes damaged on
// disk) is replaced with an empty one instead of crashing the app at its
// first read: the stored value is lost (sign in again, turn "Ingreso
// biométrico" on again), never the app.
fun novaPreferencesDataStore(name: String): ReadOnlyProperty<Context, DataStore<Preferences>> =
    preferencesDataStore(
        name = name,
        corruptionHandler = ReplaceFileCorruptionHandler { emptyPreferences() },
    )
