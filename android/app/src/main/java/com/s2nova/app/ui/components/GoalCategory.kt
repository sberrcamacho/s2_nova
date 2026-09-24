package com.s2nova.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Devices
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Flight
import androidx.compose.material.icons.filled.HealthAndSafety
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberStrings

// A goal's own category set — distinct from the shared decorative
// Budget/Goal theme palette (BudgetGoalTheme.kt) and from transaction
// categories (CategoryIcon.kt), since a goal describes what it's *for*
// (Emergency fund, Travel, ...), not what it's spent on. Stored in the same
// `Goal.themeIcon` wire field as before — see backend/src/lib/goalCategories.ts
// and backend/prisma/schema.prisma's Goal.themeIcon doc comment. Mirrors
// design_handoff_s2_nova_overview/INTERACCIONES.md's "Metas" section — keep
// both lists (and colors) in sync.
enum class GoalCategoryId {
    EMERGENCY, TRAVEL, EDUCATION, HOUSING, VEHICLE, TECHNOLOGY, HEALTH, DEBT, RETIREMENT, OTHER,
}

data class GoalCategory(val id: GoalCategoryId, val icon: ImageVector, val color: Long, val labelKey: StringKey)

// Icons follow the mockup's GOAL_GLYPH_CAT: each goal category borrows a
// transaction category's glyph.
val goalCategories = listOf(
    GoalCategory(GoalCategoryId.EMERGENCY, iconFor(CategoryId.BILLS), 0xFFE85D6B, StringKey.GOAL_CATEGORY_EMERGENCY),
    GoalCategory(GoalCategoryId.TRAVEL, iconFor(CategoryId.ENTERTAINMENT), 0xFF3DBBA8, StringKey.GOAL_CATEGORY_TRAVEL),
    GoalCategory(GoalCategoryId.EDUCATION, iconFor(CategoryId.EDUCATION), 0xFF5D6BE8, StringKey.GOAL_CATEGORY_EDUCATION),
    GoalCategory(GoalCategoryId.HOUSING, iconFor(CategoryId.SHOPPING), 0xFFE8A23D, StringKey.GOAL_CATEGORY_HOUSING),
    GoalCategory(GoalCategoryId.VEHICLE, iconFor(CategoryId.TRANSPORTATION), 0xFF3D8BE8, StringKey.GOAL_CATEGORY_VEHICLE),
    GoalCategory(GoalCategoryId.TECHNOLOGY, iconFor(CategoryId.SHOPPING), 0xFF6657E8, StringKey.GOAL_CATEGORY_TECHNOLOGY),
    GoalCategory(GoalCategoryId.HEALTH, iconFor(CategoryId.HEALTH), 0xFF22A06B, StringKey.GOAL_CATEGORY_HEALTH),
    GoalCategory(GoalCategoryId.DEBT, iconFor(CategoryId.BILLS), 0xFF8A8A99, StringKey.GOAL_CATEGORY_DEBT),
    GoalCategory(GoalCategoryId.RETIREMENT, iconFor(CategoryId.OTHER), 0xFFB25DE8, StringKey.GOAL_CATEGORY_RETIREMENT),
    GoalCategory(GoalCategoryId.OTHER, iconFor(CategoryId.OTHER), 0xFF9C9CAA, StringKey.GOAL_CATEGORY_OTHER),
)

fun goalCategoryFor(id: String?): GoalCategory? =
    id?.let { raw -> goalCategories.find { it.id.name == raw } }

private val GOAL_CATEGORY_KEYWORDS: List<Pair<GoalCategoryId, List<String>>> = listOf(
    GoalCategoryId.EMERGENCY to listOf("emergencia", "fondo", "imprevisto", "colchon", "colchón", "respaldo"),
    GoalCategoryId.TRAVEL to listOf("viaje", "vacacion", "peru", "perú", "europa", "vuelo", "tiquete", "hotel", "crucero", "paseo"),
    GoalCategoryId.EDUCATION to listOf("estudio", "universidad", "semestre", "maestr", "especializa", "curso", "diplomado", "posgrado", "ingles", "inglés", "matricula", "matrícula"),
    GoalCategoryId.HOUSING to listOf("casa", "apartamento", "apto", "vivienda", "cuota inicial", "remodel", "mudanza", "arriendo", "lote"),
    GoalCategoryId.VEHICLE to listOf("carro", "moto", "vehiculo", "vehículo", "bicicleta", "bici", "soat", "llantas"),
    GoalCategoryId.TECHNOLOGY to listOf("portatil", "portátil", "laptop", "computador", "celular", "tablet", "consola", "camara", "cámara", "tecnolog", "monitor"),
    GoalCategoryId.HEALTH to listOf("salud", "cirug", "odont", "brackets", "ortodoncia", "gimnasio", "gym", "lentes", "terapia"),
    GoalCategoryId.DEBT to listOf("deuda", "tarjeta", "credito", "crédito", "prestamo", "préstamo", "saldar", "libranza"),
    GoalCategoryId.RETIREMENT to listOf("retiro", "pension", "pensión", "jubila", "inversion", "inversión", "futuro", "largo plazo"),
)

fun suggestGoalCategory(name: String): GoalCategoryId? {
    val normalized = name.trim().lowercase()
    if (normalized.isBlank()) return null
    return GOAL_CATEGORY_KEYWORDS.firstOrNull { (_, keywords) -> keywords.any { normalized.contains(it) } }?.first
}

