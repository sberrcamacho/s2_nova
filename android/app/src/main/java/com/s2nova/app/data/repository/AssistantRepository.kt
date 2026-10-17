package com.s2nova.app.data.repository

import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ApiService
import com.s2nova.app.data.remote.AssistantRequest
import com.s2nova.app.data.remote.ChatTurnDto
import com.s2nova.app.data.todayISO

// "Asistente" (backend routes/assistant.ts): answers from the user's own
// data; it only reads. A proposal is a draft the user saves from Nuevo
// movimiento. The conversation stays on the device.
data class ChatTurn(val fromUser: Boolean, val text: String, val proposals: List<AssistantProposal> = emptyList())

data class AssistantProposal(val type: TransactionType, val amount: Double, val description: String, val category: String?, val date: String?)

data class AssistantReply(val text: String, val proposals: List<AssistantProposal>, val remaining: Int)

class AssistantRepository(private val categories: CategoryRepository, private val api: ApiService = ApiClient.api) {
    suspend fun available(): Boolean = !DemoModeFlag.active && runCatching { api.assistantStatus().available }.getOrDefault(false)

    suspend fun send(turns: List<ChatTurn>): AssistantReply {
        val body = api.assistantMessage(
            AssistantRequest(turns.takeLast(20).map { ChatTurnDto(if (it.fromUser) "user" else "model", it.text) }, todayISO()),
        )
        return AssistantReply(
            text = body.reply,
            proposals = body.proposals.map {
                AssistantProposal(
                    type = if (it.type == "INCOME") TransactionType.INCOME else TransactionType.EXPENSE,
                    amount = it.amount,
                    description = it.description,
                    category = categories.idForBackendId(it.categoryId),
                    date = it.date,
                )
            },
            remaining = body.remaining,
        )
    }
}
