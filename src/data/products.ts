import type { Product } from '@/types'

// A barcode is just an opaque identifier — it carries no product data by
// itself. This table simulates the external product-lookup API a real
// integration (e.g. a UPC/EAN database) would provide.
export const products: Product[] = [
  { barcode: '7702004001234', name: 'Leche Entera 1L', brand: 'Alquería', category: 'food', price: 5_200, unit: '1 L', imageColor: '#E8A23D' },
  { barcode: '7702004005678', name: 'Huevos AA x30', brand: 'Kikes', category: 'food', price: 18_900, unit: '30 un', imageColor: '#E8A23D' },
  { barcode: '7702090011452', name: 'Arroz Diana x1000g', brand: 'Diana', category: 'food', price: 4_800, unit: '1000 g', imageColor: '#E8A23D' },
  { barcode: '7702025105891', name: 'Coca-Cola 1.5L', brand: 'Coca-Cola', category: 'food', price: 6_500, unit: '1.5 L', imageColor: '#E8A23D' },
  { barcode: '7702025400391', name: 'Bon Yourt Fresa 200g', brand: 'Alpina', category: 'food', price: 3_100, unit: '200 g', imageColor: '#E8A23D' },
  { barcode: '7702011014322', name: 'Pan Tajado Blanco', brand: 'Bimbo', category: 'food', price: 7_300, unit: '500 g', imageColor: '#E8A23D' },
  { barcode: '7702870005416', name: 'Café Molido 500g', brand: 'Juan Valdez', category: 'food', price: 22_400, unit: '500 g', imageColor: '#E8A23D' },
  { barcode: '7501234567895', name: 'Papas Margarita 150g', brand: 'Margarita', category: 'food', price: 4_500, unit: '150 g', imageColor: '#E8A23D' },
  { barcode: '7702285001129', name: 'Jabón en Barra x3', brand: 'Protex', category: 'health', price: 9_900, unit: '3 un', imageColor: '#E85D6B' },
  { barcode: '7891024137459', name: 'Crema Dental 90g', brand: 'Colgate', category: 'health', price: 6_200, unit: '90 g', imageColor: '#E85D6B' },
  { barcode: '7702180000456', name: 'Acetaminofén 500mg x20', brand: 'MK', category: 'health', price: 5_400, unit: '20 tab', imageColor: '#E85D6B' },
  { barcode: '7702112233445', name: 'Detergente Líquido 1L', brand: 'Fab', category: 'shopping', price: 14_200, unit: '1 L', imageColor: '#3DBBA8' },
  { barcode: '7501055363437', name: 'Cuaderno Cuadriculado 100h', brand: 'Norma', category: 'education', price: 6_800, unit: '1 un', imageColor: '#5D6BE8' },
  { barcode: '7702123456780', name: 'Audífonos Bluetooth', brand: 'JBL', category: 'shopping', price: 129_900, unit: '1 un', imageColor: '#3DBBA8' },
  { barcode: '7896004000123', name: 'Gaseosa Postobón 1.5L', brand: 'Postobón', category: 'food', price: 5_900, unit: '1.5 L', imageColor: '#E8A23D' },
]

export const productByBarcode: Record<string, Product> = Object.fromEntries(
  products.map((p) => [p.barcode, p]),
)

// A representative sample of scannable codes, used by the mock scanner to
// simulate a successful read when the user taps "Simulate scan".
export const sampleBarcodes = products.map((p) => p.barcode)
