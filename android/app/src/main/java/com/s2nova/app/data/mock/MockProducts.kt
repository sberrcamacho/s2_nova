package com.s2nova.app.data.mock

import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.Product

// Mirrors web/src/data/products.ts — simulates the external product-lookup
// API a real barcode-scanning integration (e.g. a UPC/EAN database) would
// provide. Same barcodes on both platforms so a demo is reproducible.
val products: List<Product> = listOf(
    Product("7702004001234", "Leche Entera 1L", "Alquería", CategoryId.FOOD, 5_200.0, "1 L"),
    Product("7702004005678", "Huevos AA x30", "Kikes", CategoryId.FOOD, 18_900.0, "30 un"),
    Product("7702090011452", "Arroz Diana x1000g", "Diana", CategoryId.FOOD, 4_800.0, "1000 g"),
    Product("7702025105891", "Coca-Cola 1.5L", "Coca-Cola", CategoryId.FOOD, 6_500.0, "1.5 L"),
    Product("7702025400391", "Bon Yourt Fresa 200g", "Alpina", CategoryId.FOOD, 3_100.0, "200 g"),
    Product("7702011014322", "Pan Tajado Blanco", "Bimbo", CategoryId.FOOD, 7_300.0, "500 g"),
    Product("7702870005416", "Café Molido 500g", "Juan Valdez", CategoryId.FOOD, 22_400.0, "500 g"),
    Product("7501234567895", "Papas Margarita 150g", "Margarita", CategoryId.FOOD, 4_500.0, "150 g"),
    Product("7702285001129", "Jabón en Barra x3", "Protex", CategoryId.HEALTH, 9_900.0, "3 un"),
    Product("7891024137459", "Crema Dental 90g", "Colgate", CategoryId.HEALTH, 6_200.0, "90 g"),
    Product("7702180000456", "Acetaminofén 500mg x20", "MK", CategoryId.HEALTH, 5_400.0, "20 tab"),
    Product("7702112233445", "Detergente Líquido 1L", "Fab", CategoryId.SHOPPING, 14_200.0, "1 L"),
    Product("7501055363437", "Cuaderno Cuadriculado 100h", "Norma", CategoryId.EDUCATION, 6_800.0, "1 un"),
    Product("7702123456780", "Audífonos Bluetooth", "JBL", CategoryId.SHOPPING, 129_900.0, "1 un"),
    Product("7896004000123", "Gaseosa Postobón 1.5L", "Postobón", CategoryId.FOOD, 5_900.0, "1.5 L"),
)

val productByBarcode: Map<String, Product> = products.associateBy { it.barcode }

val sampleBarcodes: List<String> = products.map { it.barcode }
