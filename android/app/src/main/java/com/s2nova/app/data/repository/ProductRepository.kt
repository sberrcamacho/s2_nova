package com.s2nova.app.data.repository

import com.s2nova.app.data.mock.productByBarcode
import com.s2nova.app.data.mock.sampleBarcodes
import com.s2nova.app.data.model.Product

// Mirrors web/src/services/productService.ts — a real integration would
// call an external UPC/EAN product-lookup API here instead of a static map.
class ProductRepository {
    fun lookupBarcode(barcode: String): Product? = productByBarcode[barcode.trim()]

    fun randomSampleBarcode(): String = sampleBarcodes.random()
}
