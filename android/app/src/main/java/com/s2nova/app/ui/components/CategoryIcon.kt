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
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.rememberStrings

// The v2 mockup's category glyphs (CAT_GLYPHS / SUB_GLYPHS): outline paths
// drawn at a 2.25 stroke in the category color inside the tinted circle.
private const val MARK_STROKE = 2.25f

private val categoryGlyphs: Map<CategoryId, ImageVector> = mapOf(
    CategoryId.FOOD to strokeIcon("Alimentación", "M3 2v7c0 1.1.9 2 2 2h1a2 2 0 0 0 2-2V2", "M6 2v20", "M17 2c-1.7 1.3-3 3.7-3 6 0 1.7.7 3 2 3h2c1.3 0 2-1.3 2-3 0-2.3-1.3-4.7-3-6z", "M18 11v11", strokeWidth = MARK_STROKE),
    CategoryId.TRANSPORTATION to strokeIcon("Transporte", "M5 17H3v-5l2-5h14l2 5v5h-2", "M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z", "M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z", "M9 17h6", strokeWidth = MARK_STROKE),
    CategoryId.SHOPPING to strokeIcon("Compras", "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z", "M3 6h18", "M16 10a4 4 0 0 1-8 0", strokeWidth = MARK_STROKE),
    CategoryId.HEALTH to strokeIcon("Salud", "M20.8 6.6a5 5 0 0 0-7.1 0L12 8.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-7.3a5 5 0 0 0 0-7.1z", strokeWidth = MARK_STROKE),
    CategoryId.EDUCATION to strokeIcon("Educación", "M22 9 12 5 2 9l10 4 10-4z", "M6 11v6c0 1.5 3 3 6 3s6-1.5 6-3v-6", strokeWidth = MARK_STROKE),
    CategoryId.ENTERTAINMENT to strokeIcon("Entretenimiento", "M4 11h16l-1.2 9a2 2 0 0 1-2 1.7H7.2a2 2 0 0 1-2-1.7z", "M4 11 8 3", "M12 11 9.5 4", "M16 11 14 5", strokeWidth = MARK_STROKE),
    CategoryId.BILLS to strokeIcon("Servicios", "M4 2h16v20l-3-2-2 2-3-2-3 2-2-2-3 2z", "M8 7h8", "M8 11h8", "M8 15h5", strokeWidth = MARK_STROKE),
    CategoryId.SUBSCRIPTIONS to strokeIcon("Suscripciones", "M3 12a9 9 0 0 1 15-6.7L21 8", "M21 3v5h-5", "M21 12a9 9 0 0 1-15 6.7L3 16", "M3 21v-5h5", strokeWidth = MARK_STROKE),
    CategoryId.SALARY to strokeIcon("Salario", "M3 7h18a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12", "M17 13h.01", strokeWidth = MARK_STROKE),
    CategoryId.FREELANCE to strokeIcon("Freelance", "M4 5h16v10H4z", "M2 19h20", strokeWidth = MARK_STROKE),
    CategoryId.OTHER to strokeIcon("Otros", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M8 11h.01", "M12 11h.01", "M16 11h.01", strokeWidth = MARK_STROKE),
)

private val subcategoryIcons: Map<String, ImageVector> = mapOf(
    "food-groceries" to strokeIcon("food-groceries", "M2 3h2.6l2.2 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 7H6", "M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z", "M18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z", strokeWidth = MARK_STROKE),
    "food-restaurants" to strokeIcon("food-restaurants", "M3 11h18", "M12 20a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9z", "M12 4v3", strokeWidth = MARK_STROKE),
    "food-delivery" to strokeIcon("food-delivery", "M5 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M8 16h8l-3-8H9", "M13 8h4l2 4", strokeWidth = MARK_STROKE),
    "food-coffee" to strokeIcon("food-coffee", "M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z", "M17 9h2a2 2 0 1 1 0 4h-2", "M7 2v3", "M11 2v3", strokeWidth = MARK_STROKE),
    "transportation-public-transit" to strokeIcon("transportation-public-transit", "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z", "M4 11h16", "M7 21v-2", "M17 21v-2", "M8 14h.01", "M16 14h.01", strokeWidth = MARK_STROKE),
    "transportation-fuel" to strokeIcon("transportation-fuel", "M3 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16", "M2 21h12", "M6 8h4", "M16 8l3 3v7a2 2 0 0 1-4 0V6", strokeWidth = MARK_STROKE),
    "transportation-rideshare" to strokeIcon("transportation-rideshare", "M5 17H3v-5l2-5h14l2 5v5h-2", "M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z", "M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z", "M9 3h6v4H9z", strokeWidth = MARK_STROKE),
    "transportation-parking" to strokeIcon("transportation-parking", "M4 3h16v18H4z", "M10 17V8h3a3 3 0 0 1 0 6h-3", strokeWidth = MARK_STROKE),
    "shopping-clothing" to strokeIcon("shopping-clothing", "M6 4 3 7v3h3v11h12V10h3V7l-3-3-3 1a3 3 0 0 1-6 0z", strokeWidth = MARK_STROKE),
    "shopping-electronics" to strokeIcon("shopping-electronics", "M3 5h18v11H3z", "M2 20h20", strokeWidth = MARK_STROKE),
    "shopping-home" to strokeIcon("shopping-home", "M3 11 12 3l9 8", "M5 10v10h14V10", strokeWidth = MARK_STROKE),
    "shopping-personal-care" to strokeIcon("shopping-personal-care", "M12 21c-4 0-8-3-8-7 4 0 8 3 8 7z", "M12 21c4 0 8-3 8-7-4 0-8 3-8 7z", "M12 21V10", strokeWidth = MARK_STROKE),
    "health-pharmacy" to strokeIcon("health-pharmacy", "M4 8h16v12H4z", "M8 4h8v4H8z", "M12 11v6", "M9 14h6", strokeWidth = MARK_STROKE),
    "health-doctor" to strokeIcon("health-doctor", "M6 3v6a5 5 0 0 0 10 0V3", "M4 3h3", "M15 3h3", "M16 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", strokeWidth = MARK_STROKE),
    "health-insurance" to strokeIcon("health-insurance", "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z", "M9 12l2 2 4-4", strokeWidth = MARK_STROKE),
    "health-fitness" to strokeIcon("health-fitness", "M4 9v6", "M20 9v6", "M7 6v12", "M17 6v12", "M7 12h10", strokeWidth = MARK_STROKE),
    "education-tuition" to strokeIcon("education-tuition", "M12 3 2 8h20z", "M4 8v9", "M20 8v9", "M2 21h20", "M9 12v5", "M15 12v5", strokeWidth = MARK_STROKE),
    "education-supplies" to strokeIcon("education-supplies", "M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z", "M8 7h8", strokeWidth = MARK_STROKE),
    "education-courses" to strokeIcon("education-courses", "M4 4h16v12H4z", "M8 20h8", "M12 16v4", strokeWidth = MARK_STROKE),
    "entertainment-streaming" to strokeIcon("entertainment-streaming", "M4 4h16v16H4z", "M4 9h16", "M9 4 8 9", "M15 4l-1 5", strokeWidth = MARK_STROKE),
    "entertainment-events" to strokeIcon("entertainment-events", "M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 8 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-8z", "M12 7v2", "M12 11v2", "M12 15v2", strokeWidth = MARK_STROKE),
    "entertainment-hobbies" to strokeIcon("entertainment-hobbies", "M6 8h12a4 4 0 0 1 4 4v2a3 3 0 0 1-5.2 2L15 15H9l-1.8 1A3 3 0 0 1 2 14v-2a4 4 0 0 1 4-4z", "M8 11v3", "M6.5 12.5h3", "M16 12h.01", "M18 14h.01", strokeWidth = MARK_STROKE),
    "bills-electricity" to strokeIcon("bills-electricity", "M13 2 4 14h7l-1 8 9-12h-7z", strokeWidth = MARK_STROKE),
    "bills-water" to strokeIcon("bills-water", "M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3z", strokeWidth = MARK_STROKE),
    "bills-internet" to strokeIcon("bills-internet", "M2 8.5a15 15 0 0 1 20 0", "M5 12a10 10 0 0 1 14 0", "M8.5 15.5a5 5 0 0 1 7 0", "M12 19h.01", strokeWidth = MARK_STROKE),
    "bills-rent" to strokeIcon("bills-rent", "M4 21V4h10v17", "M14 9h6v12", "M7 8h1", "M11 8h1", "M7 12h1", "M11 12h1", "M7 16h1", "M11 16h1", "M17 13h1", "M17 17h1", strokeWidth = MARK_STROKE),
    "subscriptions-streaming" to strokeIcon("subscriptions-streaming", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M10 8.5 16 12l-6 3.5z", strokeWidth = MARK_STROKE),
    "subscriptions-software" to strokeIcon("subscriptions-software", "M8 6 3 12l5 6", "M16 6l5 6-5 6", strokeWidth = MARK_STROKE),
)

// Obsequio has no glyph in the mockup, so it keeps its Material gift icon.
fun iconFor(category: CategoryId): ImageVector = categoryGlyphs[category] ?: Icons.Filled.CardGiftcard

// One distinct glyph per subcategory slug (see backend/prisma/seed.ts),
// falling back to the parent category's for any slug not listed here, so a
// subcategory added only on the backend degrades gracefully.
fun iconForSubcategory(slug: String, parentCategoryId: CategoryId): ImageVector =
    subcategoryIcons[slug] ?: iconFor(parentCategoryId)

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

// subcategoryId is optional and, when present, resolved to its own icon
// (iconForSubcategory) instead of the parent category's — this is what
// makes a transaction's subcategory icon (e.g. "Restaurantes" instead of
// the generic "Alimentación") show up anywhere a transaction is rendered:
// recent movements, the full transaction list, transaction detail, etc.
// Screens with no per-transaction subcategory to show (budgets, reports/
// statistics, recurring series, products) simply omit it and keep getting
// the plain category icon, unchanged.
@Composable
fun CategoryIcon(
    category: CategoryId,
    subcategoryId: String? = null,
    size: CategoryIconSize = CategoryIconSize.MD,
    fillAlpha: Float = 0.16f,
    modifier: Modifier = Modifier,
) {
    val meta = categoryMap[category]
    val color = meta?.let { Color(it.color) } ?: Color(0xFF9C9CAA)
    val t = rememberStrings()
    val subcategory = subcategoryId?.let { AppContainer.categoryRepository.subcategoryById(it) }
    IconCircle(
        icon = if (subcategory != null) iconForSubcategory(subcategory.slug, category) else iconFor(category),
        color = color,
        size = size,
        fillAlpha = fillAlpha,
        contentDescription = subcategory?.name ?: t(categoryStringKey(category)),
        modifier = modifier,
    )
}
