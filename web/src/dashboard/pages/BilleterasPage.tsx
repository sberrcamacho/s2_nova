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

  const total = wallets?.reduce((s, w) => s + w.principalBalance, 0) ?? 0
  const share = (w: Wallet) => `${total > 0 ? Math.round((w.principalBalance / total) * 100) : 0}% del total`

  const saved = () => {
    setEditing(null)
    load()
    void refresh()
    notifyChanged()
  }

  return (
    <div className="flex flex-col gap-[18px] px-4 pb-10 pt-[26px] min-[760px]:px-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[24px] font-extrabold tracking-[-.025em]">Billeteras</h1>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="box-border flex h-[34px] cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-[10px] bg-v2-accent px-3.5 text-[12.5px] font-bold text-white"
        >
          + Nueva billetera
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
        {wallets?.map((w) => (
          <div
            key={w.id}
            role="button"
            tabIndex={0}
            onClick={() => setEditing(w)}
            onKeyDown={(e) => e.key === 'Enter' && setEditing(w)}
            className="flex cursor-pointer flex-col gap-3 rounded-[16px] border border-v2-line bg-v2-surface p-[18px] hover:border-v2-line2 focus-visible:outline-2 focus-visible:outline-v2-accent"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full" style={{ background: 'linear-gradient(150deg,var(--v2-hero-b),var(--v2-accent))' }}>
                <Icon paths={walletGlyph(w.accountType)} size={18} color="#fff" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-extrabold">{w.name}</div>
                <div className="mt-0.5 text-[11.5px] text-v2-dim">
                  {walletKindLabel(w.accountType)} · {w.currency}
                </div>
              </div>
            </div>
            <div>
              <Money hidden={hidden} className="block text-[22px] font-extrabold tracking-[-.02em]">
                {formatIn(w.currentBalance, w.currency)}
              </Money>
              <div className="font-numeric mt-0.5 text-[11.5px] text-v2-dim">
                {w.currency !== principal && (
                  <Money hidden={hidden} inline>
                    {`≈ ${format(w.principalBalance)}`}
                  </Money>
                )}{' '}
                {share(w)}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/movimientos?q=${encodeURIComponent(shortWallet(w.name))}`)
              }}
              className="cursor-pointer self-start text-[12px] font-bold text-v2-accent2"
            >
              Ver movimientos →
            </button>
          </div>
        ))}
      </div>
      {editing && wallets && <WalletModal wallet={editing === 'new' ? null : editing} wallets={wallets} onClose={() => setEditing(null)} onSaved={saved} />}
    </div>
  )
}
