package com.s2nova.app.data

import com.s2nova.app.data.model.TransactionType

// What a new movement starts with when it comes from a notification
// suggestion ("Por confirmar") or the assistant. The user still reviews and
// saves it in Nuevo movimiento; a suggestion is then linked to the movement.
data class MovementDraft(
    val type: TransactionType,
    val amount: Double,
    val currency: String? = null,
    val title: String? = null,
    val category: String? = null, // a leaf or parent slug
    val walletId: String? = null,
    val date: String? = null, // YYYY-MM-DD
    val time: String? = null, // HH:mm
    val suggestionId: String? = null,
)

// Handed from the screen that opens Nuevo movimiento to the form (which
// takes it once).
object PendingDraft {
    @Volatile private var value: MovementDraft? = null

    fun set(draft: MovementDraft) {
        value = draft
    }

    fun take(): MovementDraft? = value.also { value = null }
}
