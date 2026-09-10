package com.s2nova.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Apartment
import androidx.compose.material.icons.filled.Autorenew
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.Chair
import androidx.compose.material.icons.filled.Checkroom
import androidx.compose.material.icons.filled.Class
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.DeliveryDining
import androidx.compose.material.icons.filled.Devices
import androidx.compose.material.icons.filled.DirectionsBus
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.ElectricBolt
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.HealthAndSafety
import androidx.compose.material.icons.filled.Laptop
import androidx.compose.material.icons.filled.LocalCafe
import androidx.compose.material.icons.filled.LocalGasStation
import androidx.compose.material.icons.filled.LocalParking
import androidx.compose.material.icons.filled.LocalPharmacy
import androidx.compose.material.icons.filled.LocalTaxi
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.RamenDining
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Spa
import androidx.compose.material.icons.filled.SportsEsports
import androidx.compose.material.icons.filled.Theaters
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material.icons.filled.Wifi
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
    CategoryId.GIFT -> Icons.Filled.CardGiftcard
    CategoryId.OTHER -> Icons.Filled.MoreHoriz
}

// One distinct icon per subcategory slug (see backend/prisma/seed.ts) —
// unlike the top-level icon, this is purely a client-side lookup (the
// subcategory's own `icon` DB column just mirrors its parent's, since
// nothing reads it). Falls back to the parent category's icon for any
// slug not listed here, so a future subcategory added only on the
// backend degrades gracefully instead of crashing.
private val subcategoryIcons: Map<String, ImageVector> = mapOf(
    "food-groceries" to Icons.Filled.ShoppingCart,
    "food-restaurants" to Icons.Filled.RamenDining,
    "food-delivery" to Icons.Filled.DeliveryDining,
    "food-coffee" to Icons.Filled.LocalCafe,
    "transportation-public-transit" to Icons.Filled.DirectionsBus,
    "transportation-fuel" to Icons.Filled.LocalGasStation,
    "transportation-rideshare" to Icons.Filled.LocalTaxi,
    "transportation-parking" to Icons.Filled.LocalParking,
    "shopping-clothing" to Icons.Filled.Checkroom,
    "shopping-electronics" to Icons.Filled.Devices,
    "shopping-home" to Icons.Filled.Chair,
    "shopping-personal-care" to Icons.Filled.Spa,
    "health-pharmacy" to Icons.Filled.LocalPharmacy,
    "health-doctor" to Icons.Filled.MedicalServices,
    "health-insurance" to Icons.Filled.HealthAndSafety,
    "health-fitness" to Icons.Filled.FitnessCenter,
    "education-tuition" to Icons.Filled.AccountBalance,
    "education-supplies" to Icons.AutoMirrored.Filled.MenuBook,
    "education-courses" to Icons.Filled.Class,
    "entertainment-streaming" to Icons.Filled.Theaters,
    "entertainment-events" to Icons.Filled.ConfirmationNumber,
    "entertainment-hobbies" to Icons.Filled.SportsEsports,
    "bills-electricity" to Icons.Filled.ElectricBolt,
    "bills-water" to Icons.Filled.WaterDrop,
    "bills-internet" to Icons.Filled.Wifi,
    "bills-rent" to Icons.Filled.Apartment,
    "subscriptions-streaming" to Icons.Filled.PlayCircle,
    "subscriptions-software" to Icons.Filled.Code,
)

fun iconForSubcategory(slug: String, parentCategoryId: CategoryId): ImageVector =
    subcategoryIcons[slug] ?: iconFor(parentCategoryId)

val ScanIcon = Icons.Filled.ShoppingCart

enum class CategoryIconSize(val box: Int, val icon: Int) {
    SM(32, 15), MD(40, 18), LG(48, 20),
    ROW(38, 17), GRID(52, 24),
}

@Composable
fun IconCircle(
    icon: ImageVector,
    color: Color,
    size: CategoryIconSize = CategoryIconSize.MD,
    fillAlpha: Float = 0.13f,
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
    IconCircle(
        icon = iconFor(category),
        color = color,
        size = size,
        fillAlpha = fillAlpha,
        contentDescription = t(categoryStringKey(category)),
        modifier = modifier,
    )
}
