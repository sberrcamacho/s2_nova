import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/v2/Kit'
import { AjCard, AjSubHeader } from '@/dashboard/components/ajustes/AjustesUi'
import { cn } from '@/lib/cn'
import { currencyName, deviceRegion, formatMoney } from '@/lib/currency'
import { fill, tr } from '@/lib/i18n/translations'
import { useTranslation } from '@/state/useTranslation'
import { currencyService, type UserCurrency } from '@/services/currencyService'
import { useAuth } from '@/state/AuthContext'
import { useToast } from '@/state/ToastContext'

const errorText = (err: unknown) => (err instanceof Error ? err.message : tr('api.generic'))

// The mockup's currency mark: the symbol in a 36px violet circle.
function CurrencyMark({ children }: { children: ReactNode }) {
  return <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-v2-accent/16 text-caption font-extrabold text-v2-accent2">{children}</span>
}

// Ajustes › Monedas (Dashboard v2 isSettingsCurrencies,
// CURRENCIES_AND_WALLETS.md §3): the principal currency, the other ones
// with their rate and wallet count, and the catalog to add from. A
// currency can only be removed while no wallet uses it (the backend
// answers 409 otherwise).
export default function MonedasPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
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
        showToast(fill(t('cur.added'), currencyName(c.code, c.name)))
      },
      (err) => showToast(errorText(err), 'error'),
    )

  const remove = (c: UserCurrency) => {
    setRemoving(null)
    currencyService.remove(c.code).then(setMine, (err) => showToast(errorText(err), 'error'))
  }

  return (
    <div className="flex max-w-[976px] flex-col gap-[18px] px-7 pt-[26px] pb-10">
      <AjSubHeader title={t('aj.currencies')} subtitle={t('cur.subtitle')} />
      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-[18px]">
        <div className="flex flex-col gap-3.5">
          <AjCard className="flex flex-col gap-2.5 p-5">
            <div className="text-caption font-extrabold tracking-[.08em] text-v2-dim">{t('cur.principal').toUpperCase()}</div>
            {principal && (
              <div className="flex items-center gap-3">
                <CurrencyMark>{principal.symbol}</CurrencyMark>
                <div className="flex-1 text-[14px] font-extrabold">{`${currencyName(P, principal.name)} · ${P}`}</div>
                <span className="rounded-full border border-v2-accent2 px-2 py-[3px] text-caption font-extrabold text-v2-accent2">{t('cur.principalBadge')}</span>
              </div>
            )}
            <div className="text-caption leading-[1.5] text-v2-dim">
              {fill(t('cur.detected'), deviceRegion().country, P)}
            </div>
          </AjCard>
          <AjCard className="px-5 py-2">
            {others.map((c, i) => (
              <div key={c.code} className={cn('flex items-center gap-3 py-[13px]', i < others.length - 1 && 'border-b border-v2-subtle')}>
                <CurrencyMark>{c.symbol}</CurrencyMark>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold">{`${currencyName(c.code, c.name)} · ${c.code}`}</div>
                  <div className="font-numeric mt-0.5 text-caption text-v2-dim">
                    {`1 ${c.code} = ${formatMoney(c.rate, P)} · ${c.wallets ? fill(t(c.wallets === 1 ? 'cur.walletOne' : 'cur.walletMany'), c.wallets) : t('cur.noWallets')}`}
                  </div>
                </div>
                {c.wallets === 0 && (
                  <button type="button" onClick={() => setRemoving(c)} className="cursor-pointer text-[12px] font-extrabold text-v2-neg">
                    {t('mv.receipt.remove')}
                  </button>
                )}
              </div>
            ))}
          </AjCard>
        </div>
        <AjCard className="px-[18px] py-4">
          <div className="mb-1.5 text-[14px] font-extrabold">{t('cur.add')}</div>
          {addable.map((c) => (
            <button key={c.code} type="button" onClick={() => void add(c)} className="flex w-full cursor-pointer items-center gap-3 py-[9px] text-left">
              <CurrencyMark>{c.symbol}</CurrencyMark>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-bold">{`${currencyName(c.code, c.name)} · ${c.code}`}</div>
                <div className="font-numeric text-caption text-v2-dim">{`1 ${c.code} = ${formatMoney(c.rate, P)}`}</div>
              </div>
              <span className="text-[16px] text-v2-accent2">+</span>
            </button>
          ))}
        </AjCard>
      </div>
      {removing && (
        <ConfirmDialog
          title={fill(t('cur.remove.title'), currencyName(removing.code, removing.name))}
          lines={[t('cur.remove.gone'), fill(t('cur.remove.keep'), removing.code)]}
          ack={fill(t('cur.remove.ack'), removing.code)}
          cta={t('cur.remove')}
          onCancel={() => setRemoving(null)}
          onConfirm={() => remove(removing)}
        />
      )}
    </div>
  )
}
