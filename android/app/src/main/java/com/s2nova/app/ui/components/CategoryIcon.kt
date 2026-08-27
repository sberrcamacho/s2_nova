package com.s2nova.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Autorenew
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Laptop
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.rememberStrings

fun iconFor(category: CategoryId): ImageVector = when (category) {
    CategoryId.FOOD -> Icons.Filled.Restaurant
    CategoryId.TRANSPORTATION -> Icons.Filled.DirectionsCar
    CategoryId.SHOPPING -> Icons.Filled.ShoppingBag
    CategoryId.HEALTH -> Icons.Filled.Favorite
    CategoryId.EDUCATION -> Icons.Filled.School
    CategoryId.ENTERTAINMENT -> Icons.Filled.Movie
    CategoryId.BILLS -> Icons.Filled.Receipt
    CategoryId.SUBSCRIPTIONS -> Icons.Filled.Autorenew
    CategoryId.SALARY -> Icons.Filled.AccountBalanceWallet
    CategoryId.FREELANCE -> Icons.Filled.Laptop
    CategoryId.OTHER -> Icons.Filled.MoreHoriz
}

val ScanIcon = Icons.Filled.ShoppingCart

enum class CategoryIconSize(val box: Int, val icon: Int) {
    SM(32, 15), MD(40, 18), LG(48, 20),
    ROW(38, 17), GRID(52, 24),
}

@Composable
fun CategoryIcon(
    category: CategoryId,
    size: CategoryIconSize = CategoryIconSize.MD,
    fillAlpha: Float = 0.13f,
    modifier: Modifier = Modifier,
) {
    val meta = categoryMap[category]
    val color = meta?.let { Color(it.color) } ?: Color(0xFF9C9CAA)
    val t = rememberStrings()
    Box(
        modifier = modifier
            .size(size.box.dp)
            .background(color.copy(alpha = fillAlpha), CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = iconFor(category),
            contentDescription = t(categoryStringKey(category)),
            tint = color,
            modifier = Modifier.size(size.icon.dp),
        )
    }
}
