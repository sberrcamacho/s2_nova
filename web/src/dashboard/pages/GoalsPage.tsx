import { useCallback, useEffect, useState } from 'react'
import { IC, Icon } from '@/components/v2/Kit'
import { Money } from '@/components/v2/Money'
import { RowSkeletons, SyncBanner } from '@/components/v2/Rows'
import { GoalModal, GoalPayModal } from '@/dashboard/components/planes/GoalModals'
import { accountService } from '@/services/accountService'
import { goalService } from '@/services/goalService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useHideAmounts } from '@/state/useHideAmounts'
import { useTranslation } from '@/state/useTranslation'
import { todayISO } from '@/lib/date'
import { shortWallet } from '@/lib/movimientos'
import { goalEtaText, longDate, planText, shortDayMonth } from '@/lib/planCopy'
import { planIcon } from '@/lib/taxonomy'
import type { Goal, Wallet } from '@/types'

// Planes › Metas (Web v2 mockup `isGoals`): ring with the plan icon, name
// and percentage, target date, `current de target`, the estimate, the
// periodic contribution line and "Abonar". A card opens the goal modal;
// the header's "Nueva meta" (PlanesPage) creates one.
export default function GoalsPage({ adding, onAddingDone }: { adding: boolean; onAddingDone: () => void }) {
  const { transactions, version, refresh, notifyChanged } = useAppData()
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const { t, language } = useTranslation()
  const [goals, setGoals] = useState<Goal[] | null>(null)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [failed, setFailed] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [paying, setPaying] = useState<Goal | null>(null)
  const today = todayISO()
  const walletName = (id: string) => shortWallet(wallets.find((w) => w.id === id)?.name ?? '')

  const load = useCallback(async () => {
    const [g, w] = await Promise.allSettled([goalService.getGoals(), accountService.getWallets()])
    if (g.status === 'fulfilled') setGoals(g.value)
    if (w.status === 'fulfilled') setWallets(w.value)
    setFailed(g.status === 'rejected' || w.status === 'rejected')
  }, [])

  useEffect(() => {
    void load()
  }, [load, version])

  const close = () => {
    setEditing(null)
    setPaying(null)
    onAddingDone()
  }
  const saved = () => {
    close()
    notifyChanged()
    void refresh()
  }

  return (
    <>
      {failed && <SyncBanner onRetry={() => void load()} />}
      {goals === null ? (
        <div className="rounded-[16px] border border-v2-line bg-v2-surface px-5 py-2">
          <RowSkeletons count={3} box={56} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 min-[1100px]:grid-cols-2">
          {goals.map((g) => {
            const ic = planIcon(g.icon)
            const pct = Math.min(100, g.percentage)
            return (
              <div
                key={g.id}
                role="button"
                tabIndex={0}
                onClick={() => setEditing(g)}
                onKeyDown={(e) => e.key === 'Enter' && setEditing(g)}
                className="cursor-pointer rounded-[16px] border border-v2-line bg-v2-surface p-5 hover:border-v2-line2 focus-visible:outline-2 focus-visible:outline-v2-accent"
              >
                <div className="flex items-center gap-[18px]">
                  <span className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-full" style={{ background: `conic-gradient(${ic.color} ${pct}%, var(--v2-line) 0)` }}>
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-v2-surface">
                      <Icon paths={ic.glyph} size={24} color={ic.color} />
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 text-[14px] font-extrabold leading-[1.3] tracking-[-.01em]">{g.name}</div>
                      <span className="font-numeric text-[12px] font-extrabold" style={{ color: ic.color }}>
                        {g.percentage}%
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-v2-dim">{g.targetDate ? `Fecha objetivo ${longDate(g.targetDate)}` : 'Sin fecha objetivo'}</div>
                    <div className="font-numeric mt-1.5 text-[18px] font-extrabold leading-[1.3] tracking-[-.02em]">
                      <Money hidden={hidden} inline>
                        {format(g.currentAmount)}
                      </Money>{' '}
                      <span className="text-[12px] font-semibold tracking-normal text-v2-dim">
                        de{' '}
                        <Money hidden={hidden} inline>
                          {format(g.targetAmount)}
                        </Money>
                      </span>
                    </div>
                    <div className="mt-1.5 text-[11.5px] leading-[1.5] text-v2-dim">{goalEtaText(g, transactions, today, language, t)}</div>
                  </div>
                </div>
                {g.plan && (
                  <div className="mt-3.5 flex items-center gap-2 rounded-[10px] bg-v2-surface2 px-3 py-[9px] text-[11.5px] font-semibold text-v2-muted">
                    <Icon paths={IC.repeat} size={13} color="var(--v2-dim)" />
                    <span className="font-numeric">
                      {planText(g.plan, walletName(g.plan.accountId), format)} · próximo {shortDayMonth(g.plan.nextDate)}
                    </span>
                  </div>
                )}
                <div className="mt-3.5 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPaying(g)
                    }}
                    className="box-border flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-v2-line2 px-3.5 text-[12px] font-extrabold text-v2-accent2 hover:border-v2-accent2"
                  >
                    <span className="text-[14px] leading-none">+</span>Abonar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {goals?.length === 0 && <div className="p-5 text-center text-[12.5px] text-v2-dim">{t('plans.goalsEmpty')}</div>}

      {(editing || adding) && <GoalModal goal={editing} wallets={wallets} onClose={close} onSaved={saved} />}
      {paying && <GoalPayModal goal={paying} wallets={wallets} onClose={close} onSaved={saved} />}
    </>
  )
}
