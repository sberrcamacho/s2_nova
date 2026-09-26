package com.s2nova.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.CategoryId

// Category glyphs, colors and names all resolve through CategoryRepository
// from the one taxonomy (design_handoff_s2_nova_v2/s2-categories.js): the
// mockup's outline paths drawn at a 2.25 stroke in the category color
// inside the tinted circle. A leaf uses its own glyph when the taxonomy has
// one, else its parent's; its color is always the parent's.

fun iconFor(category: CategoryId?): ImageVector = glyphIcon(AppContainer.categoryRepository.glyph(category))

fun categoryColor(category: CategoryId?): Color = Color(AppContainer.categoryRepository.color(category))

// The name a screen shows for a category or subcategory node.
fun categoryName(category: CategoryId?): String = AppContainer.categoryRepository.name(category)

// "Alimentación · Mercado".
fun categoryLabel(category: CategoryId?): String = AppContainer.categoryRepository.label(category)

val ScanIcon = Icons.Filled.ShoppingCart

enum class CategoryIconSize(val box: Int, val icon: Int) {
    SM(32, 15), MD(40, 18), LG(48, 20),
    ROW(38, 17), GRID(52, 24),

    // Alert marks on Inicio's alert card and in the bell sheet (mockup mark(…, 36)).
    ALERT(36, 17),
}

@Composable
fun IconCircle(
    icon: ImageVector,
    color: Color,
    size: CategoryIconSize = CategoryIconSize.MD,
    fillAlpha: Float = 0.16f,
    contentDescription: String? = null,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .size(size.box.dp)
            .background(color.copy(alpha = fillAlpha), CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Icon(imageVector = icon, contentDescription = contentDescription, tint = color, modifier = Modifier.size(size.icon.dp))
    }
}

// subcategoryId (a leaf's dotted id), when present, shows the leaf's own
// glyph instead of the parent's anywhere a movement is rendered.
@Composable
fun CategoryIcon(
    category: CategoryId,
    subcategoryId: CategoryId? = null,
    size: CategoryIconSize = CategoryIconSize.MD,
    fillAlpha: Float = 0.16f,
    modifier: Modifier = Modifier,
) {
    val id = subcategoryId ?: category
    IconCircle(
        icon = iconFor(id),
        color = categoryColor(category),
        size = size,
        fillAlpha = fillAlpha,
        contentDescription = categoryName(id),
        modifier = modifier,
    )
}
