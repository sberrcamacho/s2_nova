import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Barcode, Loader2, PackageSearch, ScanLine, X } from 'lucide-react'
import { MobileHeader } from '@/mobile/components/MobileHeader'
import { Button } from '@/components/ui/Button'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Select } from '@/components/ui/Select'
import { productService } from '@/services/productService'
import { useAppData } from '@/state/AppDataContext'
import { useToast } from '@/state/ToastContext'
import { categoryMap, paymentMethods } from '@/data/categories'
import { formatCOP } from '@/lib/currency'
import { todayISO } from '@/lib/date'
import type { PaymentMethod, Product } from '@/types'

type ScanState = 'idle' | 'scanning' | 'found' | 'not_found'

export default function ScannerScreen() {
  const [state, setState] = useState<ScanState>('idle')
  const [product, setProduct] = useState<Product | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('nequi')
  const [isSaving, setIsSaving] = useState(false)
  const navigate = useNavigate()
  const { addTransaction } = useAppData()
  const { showToast } = useToast()

  const runScan = async (barcode: string) => {
    setState('scanning')
    const found = await productService.lookupBarcode(barcode)
    if (found) {
      setProduct(found)
      setState('found')
    } else {
      setState('not_found')
    }
  }

  const simulateScan = () => runScan(productService.getRandomSampleBarcode())

  const reset = () => {
    setProduct(null)
    setState('idle')
  }

  const confirmPurchase = async () => {
    if (!product) return
    setIsSaving(true)
    await addTransaction({
      description: product.name,
      amount: product.price,
      type: 'expense',
      category: product.category,
      date: todayISO(),
      paymentMethod,
      merchant: product.brand,
      productId: product.barcode,
    })
    setIsSaving(false)
    showToast('Compra registrada desde el escáner', 'success')
    navigate('/app/home')
  }

  return (
    <div className="flex h-full flex-col bg-[var(--scan-surface)] text-white">
      <MobileHeader
        title="Escanear código"
        action={
          <button aria-label="Cerrar escáner" onClick={() => navigate(-1)} className="text-white/70">
            <X className="h-5 w-5" />
          </button>
        }
        className="text-white [&_h1]:text-white"
      />

      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-8">
        {/* Simulated camera surface */}
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{ background: 'radial-gradient(120% 90% at 50% 30%, #16121f 0%, #000000 75%)' }}
        />

        <div className="relative flex flex-col items-center gap-6">
          <div className="relative h-56 w-56">
            {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
              <span
                key={corner}
                className={`absolute h-9 w-9 border-primary-secondary ${
                  corner === 'tl'
                    ? 'left-0 top-0 rounded-tl-2xl border-l-[3px] border-t-[3px]'
                    : corner === 'tr'
                      ? 'right-0 top-0 rounded-tr-2xl border-r-[3px] border-t-[3px]'
                      : corner === 'bl'
                        ? 'bottom-0 left-0 rounded-bl-2xl border-b-[3px] border-l-[3px]'
                        : 'bottom-0 right-0 rounded-br-2xl border-b-[3px] border-r-[3px]'
                }`}
              />
            ))}
            {state === 'scanning' && (
              <div className="absolute inset-x-3 h-0.5 animate-scan-line rounded-full bg-primary-secondary shadow-[0_0_12px_2px_rgba(133,120,255,0.7)]" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              {state === 'scanning' ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary-secondary" />
              ) : (
                <ScanLine className="h-9 w-9 text-white/25" />
              )}
            </div>
          </div>

          <p className="max-w-[220px] text-center text-[13px] font-medium text-white/60">
            {state === 'scanning'
              ? 'Buscando el producto en la base de datos…'
              : 'Ubica el código de barras dentro del marco'}
          </p>

          {state === 'idle' && (
            <Button size="lg" onClick={simulateScan} leftIcon={<Barcode className="h-4 w-4" />}>
              Simular escaneo
            </Button>
          )}

          {state === 'not_found' && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-semibold text-negative">No encontramos ese producto.</p>
              <Button variant="secondary" onClick={reset}>
                Intentar de nuevo
              </Button>
            </div>
          )}
        </div>

        {/* Manual code fallback */}
        {state === 'idle' && (
          <div className="absolute inset-x-8 bottom-6 flex gap-2">
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="O ingresa el código manualmente"
              className="h-11 flex-1 rounded-[var(--radius-md)] border border-white/15 bg-white/5 px-3.5 text-[13px] text-white placeholder:text-white/35 outline-none focus:border-primary-secondary"
            />
            <Button
              variant="secondary"
              disabled={!manualCode.trim()}
              onClick={() => runScan(manualCode.trim())}
              className="border-white/15 bg-white/10 text-white hover:bg-white/15"
            >
              Buscar
            </Button>
          </div>
        )}
      </div>

      {/* Product found sheet */}
      {state === 'found' && product && (
        <div className="animate-fade-in rounded-t-[var(--radius-xl)] bg-surface p-6 text-ink shadow-[var(--shadow-lg)]">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-tertiary">
            <PackageSearch className="h-3.5 w-3.5" /> Producto identificado
          </div>
          <div className="mt-3 flex items-center gap-3">
            <CategoryIcon category={product.category} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-ink">{product.name}</p>
              <p className="text-xs text-ink-tertiary">
                {product.brand} · {product.unit} · {categoryMap[product.category]?.label}
              </p>
            </div>
            <p className="font-numeric text-lg font-extrabold text-ink">{formatCOP(product.price)}</p>
          </div>

          <div className="mt-4">
            <Select
              label="¿Cómo pagaste?"
              options={paymentMethods.map((m) => ({ value: m.id, label: m.label }))}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            />
          </div>

          <p className="mt-4 text-[13px] font-medium text-ink-secondary">¿Registrar esta compra como un gasto?</p>
          <div className="mt-3 flex gap-3">
            <Button variant="secondary" fullWidth onClick={reset}>
              Descartar
            </Button>
            <Button fullWidth loading={isSaving} onClick={confirmPurchase}>
              Registrar compra
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
