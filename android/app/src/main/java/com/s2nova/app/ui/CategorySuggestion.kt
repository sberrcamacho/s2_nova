package com.s2nova.app.ui

import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.WalletType

// Name -> category/type suggestion, per
// design_handoff_s2_nova_overview/INTERACCIONES.md. Runs on every keystroke
// while creating a budget/wallet; the caller stops applying the suggestion
// the moment the user picks a value manually (see each screen's "userPicked"
// flag) so this never fights an explicit choice.
private val WALLET_TYPE_KEYWORDS: List<Pair<WalletType, List<String>>> = listOf(
    WalletType.NEQUI to listOf("nequi"),
    WalletType.DAVIPLATA to listOf("daviplata"),
    WalletType.BANK_CREDIT to listOf("tarjeta", "credito", "crédito", "visa", "master", "amex"),
    WalletType.BANK_DEBIT to listOf("corriente"),
    WalletType.SAVINGS to listOf("ahorro", "bancolombia", "davivienda", "bbva", "banco", "cuenta", "lulo", "scotia", "itau", "itaú"),
    WalletType.CASH to listOf("efectivo", "caja", "billetera", "bolsillo", "cash"),
)

private fun normalize(text: String): String = text.trim().lowercase()

// Keyword suggestion from the taxonomy (catGuess), returning the parent id;
// Taxonomy.guessCategory gives the leaf.
fun suggestExpenseCategory(name: String): CategoryId? =
    com.s2nova.app.data.Taxonomy.guessCategory(name, income = false)?.let { com.s2nova.app.data.AppContainer.categoryRepository.parentOf(it)?.id ?: it }

fun suggestIncomeCategory(name: String): CategoryId? =
    com.s2nova.app.data.Taxonomy.guessCategory(name, income = true)?.let { com.s2nova.app.data.AppContainer.categoryRepository.parentOf(it)?.id ?: it }

fun suggestWalletType(name: String): WalletType? {
    val normalized = normalize(name)
    if (normalized.isBlank()) return null
    return WALLET_TYPE_KEYWORDS.firstOrNull { (_, keywords) -> keywords.any { normalized.contains(it) } }?.first
}
