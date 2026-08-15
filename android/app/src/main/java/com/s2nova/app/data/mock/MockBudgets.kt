package com.s2nova.app.data.mock

import com.s2nova.app.data.currentMonthKey
import com.s2nova.app.data.model.CategoryBudget
import com.s2nova.app.data.model.CategoryId

// Mirrors web/src/data/budgets.ts
fun seedBudgets(): List<CategoryBudget> {
    val month = currentMonthKey()
    return listOf(
        CategoryBudget("bud_food", CategoryId.FOOD, 900_000.0, month),
        CategoryBudget("bud_transportation", CategoryId.TRANSPORTATION, 350_000.0, month),
        CategoryBudget("bud_shopping", CategoryId.SHOPPING, 500_000.0, month),
        CategoryBudget("bud_health", CategoryId.HEALTH, 250_000.0, month),
        CategoryBudget("bud_education", CategoryId.EDUCATION, 200_000.0, month),
        CategoryBudget("bud_entertainment", CategoryId.ENTERTAINMENT, 300_000.0, month),
        CategoryBudget("bud_bills", CategoryId.BILLS, 650_000.0, month),
        CategoryBudget("bud_subscriptions", CategoryId.SUBSCRIPTIONS, 130_000.0, month),
    )
}

const val MONTHLY_INCOME_TARGET = 4_800_000.0
