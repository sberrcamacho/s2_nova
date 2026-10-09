import { ICON_PATHS, StrokeIcon } from '@/components/v2/icons'
import { useAutoTour } from '@/components/tour/TourProvider'
import { fill, tr } from '@/lib/i18n/translations'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/v2/Kit'
import { Money } from '@/components/v2/Money'
import { WalletModal, walletGlyph, walletKindLabel } from '@/dashboard/components/WalletModal'
import { shortWallet } from '@/lib/movimientos'
import { accountService } from '@/services/accountService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useHideAmounts } from '@/state/useHideAmounts'
import type { Wallet } from '@/types'

// Billeteras (Web v2 mockup, isWalletsPage): one card per wallet with its
// currency, the "≈" principal line for foreign ones and its share of the
// total. A card opens the wallet modal; "Ver movimientos →" searches
// Movimientos for it.
export default function BilleterasPage() {
  const navigate = useNavigate()
  const { format, formatIn, currency: principal } = useCurrency()
  const { hidden } = useHideAmounts()
  const { refresh, notifyChanged } = useAppData()
  const [wallets, setWallets] = useState<Wallet[] | null>(null)
  const [editing, setEditing] = useState<Wallet | 'new' | null>(null)

  const load = useCallback(() => {
    accountService
      .getWallets()
      .then(setWallets)
      .catch(() => setWallets([]))
  }, [])
  useEffect(load, [load])

  useAutoTour('tour.billeteras', wallets !== null)
  const total = wallets?.reduce((s, w) => s + w.principalBalance, 0) ?? 0
  const share = (w: Wallet) => fill(tr('wallet.share'), total > 0 ? Math.round((w.principalBalance / total) * 100) : 0)

  const saved = () => {
    setEditing(null)
    load()
    void refresh()
    notifyChanged()
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 pb-12 pt-6 min-[760px]:px-8 min-[760px]:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-display-sm font-medium tracking-[-.025em]">{tr('v2.nav.billeteras')}</h1>
        <button
          type="button"
          onClick={() => setEditing('new')}
          data-tour="wal.add"
          className="btn-cta flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-[12px] px-5 text-label font-semibold"
        >
          <StrokeIcon paths={ICON_PATHS.plus} size={16} strokeWidth={2.4} />
          {tr('wallet.new')}
        </button>
      </div>
      {/* The total in the principal currency, with the conversion note. */}
      {wallets && wallets.length > 0 && (
        <section data-tour="wal.total" className="nova-card p-5 text-ink [container-type:inline-size]">
          <div className="text-overline font-semibold uppercase text-ink-tertiary">{fill(tr('wallet.totalLabel'), principal)}</div>
          <Money hidden={hidden} className="mt-1 block whitespace-nowrap text-[clamp(28px,10cqi,40px)] font-normal leading-[1.1] tracking-[-.035em] tabular-nums">
            {format(total)}
          </Money>
          {wallets.some((w) => w.currency !== principal) && <div className="mt-1 text-body-sm text-ink-secondary">{tr('wallet.totalNote')}</div>}
        </section>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4" aria-busy={wallets === null}>
        {wallets === null &&
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} aria-hidden="true" className="flex h-[132px] animate-pulse flex-col justify-between nova-card p-4">
              <div className="h-4 w-1/2 rounded-[6px] bg-v2-line" />
              <div className="h-6 w-2/3 rounded-[6px] bg-v2-line" />
            </div>
          ))}
        {wallets?.map((w, i) => (
          <div
            key={w.id}
            role="button"
            tabIndex={0}
            data-tour={i === 0 ? 'wal.card' : undefined}
            onClick={() => setEditing(w)}
            onKeyDown={(e) => e.key === 'Enter' && setEditing(w)}
            className="flex cursor-pointer flex-col gap-3 nova-card p-5 text-ink hover:border-border-strong focus-visible:outline-2 focus-visible:outline-focus"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px]" style={{ background: 'linear-gradient(150deg,var(--color-primary-pressed),var(--color-primary-secondary))' }}>
                <Icon paths={walletGlyph(w.accountType)} size={18} color="#fff" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-title-sm font-semibold" title={w.name}>{w.name}</div>
                <div className="truncate text-body-sm text-ink-secondary">
                  {walletKindLabel(w.accountType)} · {w.currency}
                </div>
              </div>
            </div>
            <div>
              <Money hidden={hidden} className="block whitespace-nowrap text-title font-semibold tabular-nums">
                {formatIn(w.currentBalance, w.currency)}
              </Money>
              <div className="text-body-sm tabular-nums text-ink-secondary">
                {w.currency !== principal && (
                  <Money hidden={hidden} inline>
                    {`≈ ${format(w.principalBalance)}`}
                  </Money>
                )}
                {w.currency !== principal && ' · '}
                {share(w)}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/movimientos?q=${encodeURIComponent(shortWallet(w.name))}`)
              }}
              className="-mx-1 flex min-h-8 cursor-pointer items-center self-start rounded-[8px] px-1 text-label font-semibold text-link hover:bg-surface-sunken"
            >
              {tr('wallet.seeMovements')}
            </button>
          </div>
        ))}
      </div>
      {editing && wallets && <WalletModal wallet={editing === 'new' ? null : editing} wallets={wallets} onClose={() => setEditing(null)} onSaved={saved} />}
    </div>
  )
}
