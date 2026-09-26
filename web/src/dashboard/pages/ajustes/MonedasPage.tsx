import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/v2/Kit'
import { AjCard, AjSubHeader } from '@/dashboard/components/ajustes/AjustesUi'
import { cn } from '@/lib/cn'
import { deviceRegion, formatMoney } from '@/lib/currency'
import { currencyService, type UserCurrency } from '@/services/currencyService'
import { useAuth } from '@/state/AuthContext'
import { useToast } from '@/state/ToastContext'

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Algo salió mal. Intenta de nuevo.')

// The mockup's currency mark: the symbol in a 36px violet circle.
function CurrencyMark({ children }: { children: ReactNode }) {
  return <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[rgba(108,92,231,.16)] text-[11.5px] font-extrabold text-v2-accent2">{children}</span>
}

// Ajustes › Monedas (Dashboard v2 isSettingsCurrencies,
// CURRENCIES_AND_WALLETS.md §3): the principal currency, the other ones
// with their rate and wallet count, and the catalog to add from. A
// currency can only be removed while no wallet uses it (the backend
// answers 409 otherwise).
export default function MonedasPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [mine, setMine] = useState<UserCurrency[]>([])
  const [catalog, setCatalog] = useState<UserCurrency[]>([])
  const [removing, setRemoving] = useState<UserCurrency | null>(null)

  const load = useCallback(() => {
    currencyService.getMine().then(setMine, (err) => showToast(errorText(err), 'error'))
    currencyService.getCatalog().then(setCatalog, () => setCatalog([]))
  }, [showToast])
  useEffect(load, [load])

  const principal = mine.find((c) => c.isPrincipal) ?? null
  const P = principal?.code ?? user?.principalCurrency ?? 'COP'
  const others = mine.filter((c) => c.code !== P)
  const addable = catalog.filter((c) => !mine.some((m) => m.code === c.code))

  const add = (c: UserCurrency) =>
    currencyService.add(c.code).then(
      (list) => {
        setMine(list)
        showToast(`${c.name} agregado`)
      },
      (err) => showToast(errorText(err), 'error'),
    )

  const remove = (c: UserCurrency) => {
    setRemoving(null)
    currencyService.remove(c.code).then(setMine, (err) => showToast(errorText(err), 'error'))
  }

  return (
    <div className="flex max-w-[976px] flex-col gap-[18px] px-7 pt-[26px] pb-10">
      <AjSubHeader title="Monedas" subtitle="Cada billetera tiene una moneda. Cada movimiento guarda su moneda original y la tasa usada." />
      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-[18px]">
        <div className="flex flex-col gap-3.5">
          <AjCard className="flex flex-col gap-2.5 p-5">
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-v2-dim">MONEDA PRINCIPAL</div>
            {principal && (
              <div className="flex items-center gap-3">
                <CurrencyMark>{principal.symbol}</CurrencyMark>
                <div className="flex-1 text-[14px] font-extrabold">{`${principal.name} · ${P}`}</div>
                <span className="rounded-full border border-v2-accent2 px-2 py-[3px] text-[10.5px] font-extrabold text-v2-accent2">Principal</span>
              </div>
            )}
            <div className="text-[11.5px] leading-[1.5] text-v2-dim">
              {`Detectada por la región de tu navegador (${deviceRegion().country}). El saldo total, los presupuestos y los reportes se muestran en ${P}.`}
            </div>
          </AjCard>
          <AjCard className="px-5 py-2">
            {others.map((c, i) => (
              <div key={c.code} className={cn('flex items-center gap-3 py-[13px]', i < others.length - 1 && 'border-b border-v2-subtle')}>
                <CurrencyMark>{c.symbol}</CurrencyMark>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold">{`${c.name} · ${c.code}`}</div>
                  <div className="font-numeric mt-0.5 text-[11.5px] text-v2-dim">
                    {`1 ${c.code} = ${formatMoney(c.rate, P)} · ${c.wallets ? `${c.wallets} ${c.wallets === 1 ? 'billetera' : 'billeteras'}` : 'sin billeteras'}`}
                  </div>
                </div>
                {c.wallets === 0 && (
                  <button type="button" onClick={() => setRemoving(c)} className="cursor-pointer text-[12px] font-extrabold text-v2-neg">
                    Quitar
                  </button>
                )}
              </div>
            ))}
          </AjCard>
        </div>
        <AjCard className="px-[18px] py-4">
          <div className="mb-1.5 text-[14px] font-extrabold">Agregar moneda</div>
          {addable.map((c) => (
            <button key={c.code} type="button" onClick={() => void add(c)} className="flex w-full cursor-pointer items-center gap-3 py-[9px] text-left">
              <CurrencyMark>{c.symbol}</CurrencyMark>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-bold">{`${c.name} · ${c.code}`}</div>
                <div className="font-numeric text-[11px] text-v2-dim">{`1 ${c.code} = ${formatMoney(c.rate, P)}`}</div>
              </div>
              <span className="text-[16px] text-v2-accent2">+</span>
            </button>
          ))}
        </AjCard>
      </div>
      {removing && (
        <ConfirmDialog
          title={`Quitar ${removing.name}`}
          lines={['Deja de aparecer al crear billeteras y movimientos', `Los movimientos ya registrados en ${removing.code} conservan su monto y su tasa`]}
          ack={`Entiendo que ${removing.code} se quita de mis monedas.`}
          cta="Quitar moneda"
          onCancel={() => setRemoving(null)}
          onConfirm={() => remove(removing)}
        />
      )}
    </div>
  )
}
