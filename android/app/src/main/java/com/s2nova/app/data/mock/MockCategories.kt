package com.s2nova.app.data.mock

import com.s2nova.app.data.model.Category
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.PaymentMethodOption

// Mirrors web/src/data/categories.ts — keep colors/icons/labels in sync if
// either side changes, since both surfaces are meant to look like one product.
val categories: List<Category> = listOf(
    Category(CategoryId.FOOD, "Alimentación", "UtensilsCrossed", 0xFFE8A23D, isExpense = true, isIncome = false),
    Category(CategoryId.TRANSPORTATION, "Transporte", "Car", 0xFF3D8BE8, isExpense = true, isIncome = false),
    Category(CategoryId.SHOPPING, "Compras", "ShoppingBag", 0xFF3DBBA8, isExpense = true, isIncome = false),
    Category(CategoryId.HEALTH, "Salud", "HeartPulse", 0xFFE85D6B, isExpense = true, isIncome = false),
    Category(CategoryId.EDUCATION, "Educación", "GraduationCap", 0xFF5D6BE8, isExpense = true, isIncome = false),
    Category(CategoryId.ENTERTAINMENT, "Entretenimiento", "Popcorn", 0xFFB25DE8, isExpense = true, isIncome = false),
    Category(CategoryId.BILLS, "Servicios", "Receipt", 0xFF8A8A99, isExpense = true, isIncome = false),
    Category(CategoryId.SUBSCRIPTIONS, "Suscripciones", "RefreshCcw", 0xFFD95DB2, isExpense = true, isIncome = false),
    Category(CategoryId.SALARY, "Salario", "Wallet", 0xFF22A06B, isExpense = false, isIncome = true),
    Category(CategoryId.FREELANCE, "Freelance", "Laptop", 0xFF6657E8, isExpense = false, isIncome = true),
    Category(CategoryId.OTHER, "Otros", "CircleEllipsis", 0xFF9C9CAA, isExpense = true, isIncome = true),
)

val categoryMap: Map<CategoryId, Category> = categories.associateBy { it.id }

val expenseCategories: List<Category> = categories.filter { it.isExpense }
val incomeCategories: List<Category> = categories.filter { it.isIncome }

val paymentMethods: List<PaymentMethodOption> = listOf(
    PaymentMethodOption(PaymentMethod.CASH, "Efectivo"),
    PaymentMethodOption(PaymentMethod.DEBIT_CARD, "Tarjeta débito"),
    PaymentMethodOption(PaymentMethod.CREDIT_CARD, "Tarjeta crédito"),
    PaymentMethodOption(PaymentMethod.BANK_TRANSFER, "Transferencia"),
    PaymentMethodOption(PaymentMethod.NEQUI, "Nequi"),
    PaymentMethodOption(PaymentMethod.DAVIPLATA, "Daviplata"),
)

val paymentMethodMap: Map<PaymentMethod, PaymentMethodOption> = paymentMethods.associateBy { it.id }
