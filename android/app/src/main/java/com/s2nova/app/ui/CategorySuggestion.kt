package com.s2nova.app.ui

import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.WalletType

// Name -> category/type suggestion, per
// design_handoff_s2_nova_overview/INTERACCIONES.md. Runs on every keystroke
// while creating a budget/wallet; the caller stops applying the suggestion
// the moment the user picks a value manually (see each screen's "userPicked"
// flag) so this never fights an explicit choice.
private val EXPENSE_CATEGORY_KEYWORDS: List<Pair<CategoryId, List<String>>> = listOf(
    CategoryId.FOOD to listOf("mercado", "comida", "restaurante", "domicilio"),
    CategoryId.TRANSPORTATION to listOf("taxi", "gasolina", "peaje", "uber", "transporte", "bus", "metro"),
    CategoryId.EDUCATION to listOf("estudio", "semestre", "matricula", "matrícula", "curso", "universidad", "colegio"),
    CategoryId.ENTERTAINMENT to listOf("vacaciones", "viaje", "cine", "hotel", "entretenimiento", "salida", "fiesta"),
    CategoryId.HEALTH to listOf("medico", "médico", "eps", "gym", "gimnasio", "farmacia", "salud"),
    CategoryId.BILLS to listOf("luz", "agua", "internet", "arriendo", "factura", "servicios", "gas"),
    CategoryId.SUBSCRIPTIONS to listOf("suscripcion", "suscripción", "streaming", "membresia", "membresía", "netflix", "spotify"),
    CategoryId.SHOPPING to listOf("ropa", "regalo", "tecnologia", "tecnología", "hogar", "compras"),
)

private val INCOME_CATEGORY_KEYWORDS: List<Pair<CategoryId, List<String>>> = listOf(
    CategoryId.SALARY to listOf("salario", "nomina", "nómina", "sueldo", "quincena"),
    CategoryId.FREELANCE to listOf("freelance", "proyecto", "honorario", "factura", "cliente"),
)

private val WALLET_TYPE_KEYWORDS: List<Pair<WalletType, List<String>>> = listOf(
    WalletType.NEQUI to listOf("nequi"),
    WalletType.DAVIPLATA to listOf("daviplata"),
    WalletType.BANK_CREDIT to listOf("tarjeta", "credito", "crédito", "visa", "master", "amex"),
    WalletType.BANK_DEBIT to listOf("corriente"),
    WalletType.SAVINGS to listOf("ahorro", "bancolombia", "davivienda", "bbva", "banco", "cuenta", "lulo", "scotia", "itau", "itaú"),
    WalletType.CASH to listOf("efectivo", "caja", "billetera", "bolsillo", "cash"),
)

private fun normalize(text: String): String = text.trim().lowercase()

fun suggestExpenseCategory(name: String): CategoryId? {
    val normalized = normalize(name)
    if (normalized.isBlank()) return null
    return EXPENSE_CATEGORY_KEYWORDS.firstOrNull { (_, keywords) -> keywords.any { normalized.contains(it) } }?.first
}

fun suggestIncomeCategory(name: String): CategoryId? {
    val normalized = normalize(name)
    if (normalized.isBlank()) return null
    return INCOME_CATEGORY_KEYWORDS.firstOrNull { (_, keywords) -> keywords.any { normalized.contains(it) } }?.first
}

fun suggestWalletType(name: String): WalletType? {
    val normalized = normalize(name)
    if (normalized.isBlank()) return null
    return WALLET_TYPE_KEYWORDS.firstOrNull { (_, keywords) -> keywords.any { normalized.contains(it) } }?.first
}
