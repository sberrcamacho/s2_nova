import { productByBarcode, sampleBarcodes } from '@/data/products'
import { delay } from '@/lib/async'
import type { Product } from '@/types'

// Simulates a real product-lookup API (e.g. an external UPC/EAN database).
// A barcode is only an identifier — this call is what actually resolves it
// to product information, exactly as a real integration would.
export const productService = {
  async lookupBarcode(barcode: string): Promise<Product | null> {
    const product = productByBarcode[barcode]
    return delay(product ?? null, 900)
  },

  // Used by the scanner screen to simulate a camera successfully reading a
  // code, since there is no real camera/decoder integration yet.
  getRandomSampleBarcode(): string {
    return sampleBarcodes[Math.floor(Math.random() * sampleBarcodes.length)]
  },
}
