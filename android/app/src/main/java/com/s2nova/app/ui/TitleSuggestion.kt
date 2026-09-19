package com.s2nova.app.ui

import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.TransactionType

// Suggested-title copy for Add Transaction's description field — ported
// from the mockup's suggestTitle()/TITLE_BY_SUB/TITLE_BY_CATEGORY
// (design_handoff_s2_nova_overview/S2 Nova Android.dc.html). Each entry has
// three tiers by amount (< $50.000, < $250.000, >= $250.000 COP), picked
// from the subcategory when one is selected, falling back to the category.
// Kept as its own small es/en table (mirroring Strings.kt's shape) rather
// than 120+ new StringKey entries, since this copy is entirely
// combinatorial (subcategory/category x amount tier) and not reused
// anywhere else the enum-keyed dictionary is meant for.
private data class Tiered(val es: List<String>, val en: List<String>)

private val TITLE_BY_SUB: Map<String, Tiered> = mapOf(
    "food-groceries" to Tiered(listOf("Mercado rápido", "Mercado semanal", "Mercado del mes"), listOf("Quick grocery run", "Weekly groceries", "Monthly grocery shop")),
    "food-restaurants" to Tiered(listOf("Almuerzo", "Cena en restaurante", "Cena con familia"), listOf("Lunch", "Dinner out", "Family dinner")),
    "food-delivery" to Tiered(listOf("Domicilio", "Domicilio para dos", "Pedido grande"), listOf("Delivery order", "Delivery for two", "Large delivery order")),
    "food-coffee" to Tiered(listOf("Café", "Café y snacks", "Café para el equipo"), listOf("Coffee", "Coffee and snacks", "Coffee for the team")),
    "transportation-public-transit" to Tiered(listOf("Pasaje", "Recarga de transporte", "Recarga mensual"), listOf("Fare", "Transit top-up", "Monthly transit pass")),
    "transportation-fuel" to Tiered(listOf("Tanqueada parcial", "Tanqueada", "Tanqueada completa"), listOf("Partial fill-up", "Fill-up", "Full tank")),
    "transportation-rideshare" to Tiered(listOf("Viaje corto en app", "Viaje en app", "Viaje largo en app"), listOf("Short rideshare trip", "Rideshare trip", "Long rideshare trip")),
    "transportation-parking" to Tiered(listOf("Parqueadero", "Parqueadero y peajes", "Peajes del viaje"), listOf("Parking", "Parking and tolls", "Trip tolls")),
    "shopping-clothing" to Tiered(listOf("Accesorio", "Compra de ropa", "Renovación de closet"), listOf("Accessory", "Clothing purchase", "Closet refresh")),
    "shopping-electronics" to Tiered(listOf("Accesorio electrónico", "Compra de electrónica", "Equipo nuevo"), listOf("Electronic accessory", "Electronics purchase", "New equipment")),
    "shopping-home" to Tiered(listOf("Artículo para el hogar", "Compras del hogar", "Mueble o electrodoméstico"), listOf("Home item", "Home shopping", "Furniture or appliance")),
    "shopping-personal-care" to Tiered(listOf("Cuidado personal", "Productos de cuidado personal", "Tratamiento de cuidado personal"), listOf("Personal care", "Personal care products", "Personal care treatment")),
    "health-pharmacy" to Tiered(listOf("Medicamentos", "Compra en farmacia", "Tratamiento en farmacia"), listOf("Medication", "Pharmacy purchase", "Pharmacy treatment")),
    "health-doctor" to Tiered(listOf("Copago médico", "Consulta médica", "Procedimiento médico"), listOf("Doctor's copay", "Doctor visit", "Medical procedure")),
    "health-insurance" to Tiered(listOf("Ajuste de seguro", "Seguro médico", "Póliza de salud"), listOf("Insurance adjustment", "Health insurance", "Health policy")),
    "health-fitness" to Tiered(listOf("Clase suelta", "Mensualidad de gimnasio", "Plan de gimnasio"), listOf("Drop-in class", "Gym membership", "Gym plan")),
    "education-tuition" to Tiered(listOf("Trámite académico", "Cuota de matrícula", "Matrícula del semestre"), listOf("Academic paperwork", "Tuition installment", "Semester tuition")),
    "education-supplies" to Tiered(listOf("Materiales de estudio", "Libros y materiales", "Kit de materiales"), listOf("Study materials", "Books and materials", "Materials kit")),
    "education-courses" to Tiered(listOf("Inscripción a curso", "Curso en línea", "Certificación"), listOf("Course enrollment", "Online course", "Certification")),
    "entertainment-streaming" to Tiered(listOf("Alquiler de película", "Salida a cine", "Plan de cine y streaming"), listOf("Movie rental", "Movie night", "Cinema and streaming plan")),
    "entertainment-events" to Tiered(listOf("Entrada", "Entradas a evento", "Concierto"), listOf("Ticket", "Event tickets", "Concert")),
    "entertainment-hobbies" to Tiered(listOf("Juego o hobby", "Compra para hobbies", "Equipo para hobbies"), listOf("Game or hobby", "Hobby purchase", "Hobby equipment")),
    "bills-electricity" to Tiered(listOf("Recarga de energía", "Factura de electricidad", "Factura de electricidad"), listOf("Electricity top-up", "Electricity bill", "Electricity bill")),
    "bills-water" to Tiered(listOf("Recarga de agua", "Factura de agua", "Factura de agua"), listOf("Water top-up", "Water bill", "Water bill")),
    "bills-internet" to Tiered(listOf("Recarga de celular", "Internet y celular", "Plan de internet y celular"), listOf("Phone top-up", "Internet and phone", "Internet and phone plan")),
    "bills-rent" to Tiered(listOf("Cuota de arriendo", "Arriendo", "Arriendo del mes"), listOf("Rent installment", "Rent", "Monthly rent")),
    "subscriptions-streaming" to Tiered(listOf("Suscripción de streaming", "Apps de streaming", "Plan anual de streaming"), listOf("Streaming subscription", "Streaming apps", "Annual streaming plan")),
    "subscriptions-software" to Tiered(listOf("Suscripción de software", "Software / SaaS", "Licencia anual de software"), listOf("Software subscription", "Software / SaaS", "Annual software license")),
)

private val TITLE_BY_CATEGORY: Map<CategoryId, Tiered> = mapOf(
    CategoryId.FOOD to Tiered(listOf("Gasto en comida", "Compra de alimentación", "Gasto grande en alimentación"), listOf("Food expense", "Grocery purchase", "Large food expense")),
    CategoryId.TRANSPORTATION to Tiered(listOf("Viaje corto", "Gasto de transporte", "Gasto grande de transporte"), listOf("Short trip", "Transportation expense", "Large transportation expense")),
    CategoryId.SHOPPING to Tiered(listOf("Compra pequeña", "Compra", "Compra grande"), listOf("Small purchase", "Purchase", "Large purchase")),
    CategoryId.HEALTH to Tiered(listOf("Gasto de salud", "Consulta o medicamentos", "Gasto médico grande"), listOf("Health expense", "Consultation or medication", "Large medical expense")),
    CategoryId.EDUCATION to Tiered(listOf("Gasto académico", "Gasto de educación", "Pago académico grande"), listOf("Academic expense", "Education expense", "Large academic payment")),
    CategoryId.ENTERTAINMENT to Tiered(listOf("Plan sencillo", "Salida de entretenimiento", "Plan grande"), listOf("Simple plan", "Night out", "Big plan")),
    CategoryId.BILLS to Tiered(listOf("Servicio menor", "Pago de servicios", "Factura alta de servicios"), listOf("Minor bill", "Utility payment", "High utility bill")),
    CategoryId.SUBSCRIPTIONS to Tiered(listOf("Suscripción mensual", "Suscripción", "Suscripción anual"), listOf("Monthly subscription", "Subscription", "Annual subscription")),
    CategoryId.OTHER to Tiered(listOf("Gasto menor", "Movimiento", "Gasto grande"), listOf("Minor expense", "Transaction", "Large expense")),
    CategoryId.SALARY to Tiered(listOf("Bonificación", "Pago de nómina", "Salario del mes"), listOf("Bonus", "Payroll", "Monthly salary")),
    CategoryId.FREELANCE to Tiered(listOf("Anticipo freelance", "Pago freelance", "Proyecto freelance"), listOf("Freelance advance", "Freelance payment", "Freelance project")),
    CategoryId.GIFT to Tiered(listOf("Detalle recibido", "Obsequio", "Obsequio grande"), listOf("Small gift received", "Gift", "Large gift")),
)

private val TRANSFER_TITLES = Tiered(
    es = listOf("Traslado rápido", "Traslado entre billeteras", "Traslado alto entre billeteras"),
    en = listOf("Quick transfer", "Transfer between wallets", "Large transfer between wallets"),
)

// tier 0: < $50.000, tier 1: < $250.000, tier 2: >= $250.000 (COP).
private fun tierFor(amountText: String): Int {
    val value = amountText.filter { it.isDigit() }.toLongOrNull() ?: 0L
    return if (value < 50_000) 0 else if (value < 250_000) 1 else 2
}

fun suggestTransactionTitle(
    amountText: String,
    category: CategoryId,
    subcategorySlug: String?,
    subcategoryName: String?,
    type: TransactionType,
    isEnglish: Boolean,
): String {
    val tier = tierFor(amountText)
    if (type == TransactionType.TRANSFER) {
        return (if (isEnglish) TRANSFER_TITLES.en else TRANSFER_TITLES.es)[tier]
    }
    val tiered = subcategorySlug?.let { TITLE_BY_SUB[it] } ?: TITLE_BY_CATEGORY[category]
    if (tiered != null) return (if (isEnglish) tiered.en else tiered.es)[tier]
    return subcategoryName ?: category.name
}
