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

val goalCategories = listOf(
    GoalCategory(GoalCategoryId.EMERGENCY, Icons.Filled.HealthAndSafety, 0xFFE85D6B, StringKey.GOAL_CATEGORY_EMERGENCY),
    GoalCategory(GoalCategoryId.TRAVEL, Icons.Filled.Flight, 0xFF3DBBA8, StringKey.GOAL_CATEGORY_TRAVEL),
    GoalCategory(GoalCategoryId.EDUCATION, Icons.Filled.School, 0xFF5D6BE8, StringKey.GOAL_CATEGORY_EDUCATION),
    GoalCategory(GoalCategoryId.HOUSING, Icons.Filled.Home, 0xFFE8A23D, StringKey.GOAL_CATEGORY_HOUSING),
    GoalCategory(GoalCategoryId.VEHICLE, Icons.Filled.DirectionsCar, 0xFF3D8BE8, StringKey.GOAL_CATEGORY_VEHICLE),
    GoalCategory(GoalCategoryId.TECHNOLOGY, Icons.Filled.Devices, 0xFF6657E8, StringKey.GOAL_CATEGORY_TECHNOLOGY),
    GoalCategory(GoalCategoryId.HEALTH, Icons.Filled.FitnessCenter, 0xFF22A06B, StringKey.GOAL_CATEGORY_HEALTH),
    GoalCategory(GoalCategoryId.DEBT, Icons.Filled.CreditCard, 0xFF8A8A99, StringKey.GOAL_CATEGORY_DEBT),
    GoalCategory(GoalCategoryId.RETIREMENT, Icons.Filled.Savings, 0xFFB25DE8, StringKey.GOAL_CATEGORY_RETIREMENT),
    GoalCategory(GoalCategoryId.OTHER, Icons.Filled.MoreHoriz, 0xFF9C9CAA, StringKey.GOAL_CATEGORY_OTHER),
)

fun goalCategoryFor(id: String?): GoalCategory? =
    id?.let { raw -> goalCategories.find { it.id.name == raw } }

private val GOAL_CATEGORY_KEYWORDS: List<Pair<GoalCategoryId, List<String>>> = listOf(
    GoalCategoryId.EMERGENCY to listOf("fondo", "emergencia", "imprevisto"),
    GoalCategoryId.TRAVEL to listOf("viaje", "vacaciones", "vuelo", "hotel"),
    GoalCategoryId.EDUCATION to listOf("semestre", "maestria", "maestría", "especializacion", "especialización", "diplomado"),
    GoalCategoryId.HOUSING to listOf("casa", "apartamento", "cuota inicial", "remodelacion", "remodelación"),
    GoalCategoryId.VEHICLE to listOf("carro", "moto", "bicicleta", "soat"),
    GoalCategoryId.TECHNOLOGY to listOf("portatil", "portátil", "laptop", "celular", "consola"),
    GoalCategoryId.HEALTH to listOf("cirugia", "cirugía", "ortodoncia", "gimnasio"),
    GoalCategoryId.DEBT to listOf("deuda", "tarjeta", "prestamo", "préstamo", "saldar"),
    GoalCategoryId.RETIREMENT to listOf("retiro", "pension", "pensión", "inversion", "inversión", "largo plazo"),
)

fun suggestGoalCategory(name: String): GoalCategoryId? {
    val normalized = name.trim().lowercase()
    if (normalized.isBlank()) return null
    return GOAL_CATEGORY_KEYWORDS.firstOrNull { (_, keywords) -> keywords.any { normalized.contains(it) } }?.first
}

// A horizontally-scrolling row of category swatches for the Goal
// create/edit dialog. Unlike BudgetGoalThemePicker, a selection is always
// required (a goal always has a category) — tapping the selected one is a
// no-op rather than clearing it.
@Composable
fun GoalCategoryPicker(selected: GoalCategoryId, onSelect: (GoalCategoryId) -> Unit, modifier: Modifier = Modifier) {
    val t = rememberStrings()
    Row(modifier = modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        goalCategories.forEach { category ->
            val isSelected = selected == category.id
            val color = Color(category.color)
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = if (isSelected) 0.32f else 0.16f))
                    .then(if (isSelected) Modifier.border(2.dp, color, CircleShape) else Modifier)
                    .selectable(selected = isSelected, role = Role.RadioButton, onClick = { onSelect(category.id) }),
                contentAlignment = Alignment.Center,
            ) {
                Icon(category.icon, contentDescription = t(category.labelKey), tint = color, modifier = Modifier.size(20.dp))
            }
        }
    }
}
