package com.s2nova.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.BeachAccess
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.Celebration
import androidx.compose.material.icons.filled.Diamond
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.FamilyRestroom
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Flight
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Pets
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp

// A small fixed palette Budgets and Goals may optionally pick from —
// purely cosmetic, decoupled from the transaction CategoryId icon set (see
// CategoryIcon.kt), so a "Vacation" budget can look like a plane rather
// than whatever transaction category it happens to track. Mirrors
// backend/src/lib/budgetGoalThemes.ts — keep both lists in sync.
enum class BudgetGoalThemeId {
    FLAG, STAR, HOME, TROPHY, FLIGHT, BEACH, FITNESS, CELEBRATION,
    GIFT, DIAMOND, SAVINGS, TRENDING_UP, PETS, FAMILY,
}

data class BudgetGoalTheme(val id: BudgetGoalThemeId, val icon: ImageVector, val color: Long)

val budgetGoalThemes = listOf(
    BudgetGoalTheme(BudgetGoalThemeId.FLAG, Icons.Filled.Flag, 0xFFE85D6B),
    BudgetGoalTheme(BudgetGoalThemeId.STAR, Icons.Filled.Star, 0xFFE8A23D),
    BudgetGoalTheme(BudgetGoalThemeId.HOME, Icons.Filled.Home, 0xFF3D8BE8),
    BudgetGoalTheme(BudgetGoalThemeId.TROPHY, Icons.Filled.EmojiEvents, 0xFFD9A441),
    BudgetGoalTheme(BudgetGoalThemeId.FLIGHT, Icons.Filled.Flight, 0xFF5D6BE8),
    BudgetGoalTheme(BudgetGoalThemeId.BEACH, Icons.Filled.BeachAccess, 0xFF3DBBA8),
    BudgetGoalTheme(BudgetGoalThemeId.FITNESS, Icons.Filled.FitnessCenter, 0xFFB25DE8),
    BudgetGoalTheme(BudgetGoalThemeId.CELEBRATION, Icons.Filled.Celebration, 0xFFD95DB2),
    BudgetGoalTheme(BudgetGoalThemeId.GIFT, Icons.Filled.CardGiftcard, 0xFF22A06B),
    BudgetGoalTheme(BudgetGoalThemeId.DIAMOND, Icons.Filled.Diamond, 0xFF6657E8),
    BudgetGoalTheme(BudgetGoalThemeId.SAVINGS, Icons.Filled.Savings, 0xFF3D8BE8),
    BudgetGoalTheme(BudgetGoalThemeId.TRENDING_UP, Icons.AutoMirrored.Filled.TrendingUp, 0xFF22A06B),
    BudgetGoalTheme(BudgetGoalThemeId.PETS, Icons.Filled.Pets, 0xFF9C6B4E),
    BudgetGoalTheme(BudgetGoalThemeId.FAMILY, Icons.Filled.FamilyRestroom, 0xFFE8A23D),
)

fun budgetGoalThemeFor(id: String?): BudgetGoalTheme? =
    id?.let { raw -> budgetGoalThemes.find { it.id.name == raw } }

// A horizontally-scrolling row of theme swatches for a Budget/Goal
// create/edit dialog — tapping the already-selected one clears it (falls
// back to whatever default the caller shows for "no theme").
@Composable
fun BudgetGoalThemePicker(selected: String?, onSelect: (String?) -> Unit, modifier: Modifier = Modifier) {
    Row(modifier = modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        budgetGoalThemes.forEach { theme ->
            val isSelected = selected == theme.id.name
            val color = Color(theme.color)
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = if (isSelected) 0.32f else 0.16f))
                    .then(if (isSelected) Modifier.border(2.dp, color, CircleShape) else Modifier)
                    .selectable(
                        selected = isSelected,
                        role = Role.RadioButton,
                        onClick = { onSelect(if (isSelected) null else theme.id.name) },
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(theme.icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
            }
        }
    }
}
