package com.s2nova.app.data.repository

import com.s2nova.app.data.mock.productByBarcode
import com.s2nova.app.data.mock.sampleBarcodes
import com.s2nova.app.data.model.Product
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ApiService
import com.s2nova.app.data.remote.ProductDto
import retrofit2.HttpException

// Scanner catalog (backend/src/routes/products.ts): the backend checks its
// own table and several public product databases (Open Food Facts and its
// sister projects, UPCitemdb) and caches what it finds. Barcodes and QR
// payloads are the same thing here — just a code string. The bundled samples
// only answer in guest mode or when the backend cannot be reached.
class ProductRepository(
    private val api: ApiService = ApiClient.api,
    private val categories: () -> CategoryRepository = { com.s2nova.app.data.AppContainer.categoryRepository },
) {
    private fun ProductDto.toProduct() = Product(
        barcode = barcode,
        name = name,
        brand = brand.orEmpty(),
        category = categories().idForBackendId(categoryId) ?: "exp.other",
        price = 0.0,
        unit = "",
        id = id,
    )

    // null = no database knows the code (offer to create it).
    suspend fun lookup(code: String): Product? {
        val clean = code.trim()
        if (DemoModeFlag.active) return productByBarcode[clean]
        return try {
            api.getProduct(clean).toProduct()
        } catch (e: HttpException) {
            if (e.code() == 404) null else productByBarcode[clean]
        } catch (e: java.io.IOException) {
            productByBarcode[clean]
        }
    }

    fun randomSampleBarcode(): String = sampleBarcodes.random()
}
