import { fill, tr } from '@/lib/i18n/translations'
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
        <div className="rounded-[16px] border border-border bg-surface px-5 py-2">
          <RowSkeletons count={3} box={56} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-2">
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
                className="cursor-pointer rounded-[16px] border border-border bg-surface p-5 text-ink hover:border-border-strong focus-visible:outline-2 focus-visible:outline-focus"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-full" style={{ background: `conic-gradient(${ic.color} ${pct}%, var(--color-border) 0)` }}>
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
                      <Icon paths={ic.glyph} size={24} color={ic.color} />
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 truncate text-title-sm font-semibold" title={g.name}>{g.name}</div>
                      {/* The ring keeps the goal's color; the figure uses text color, since the
                          lighter goal colors fall under 4.5:1 on a light surface. */}
                      <span className="flex-none whitespace-nowrap text-label font-semibold tabular-nums text-ink-secondary">
                        {g.percentage}%
                      </span>
                    </div>
                    <div className="text-body-sm text-ink-secondary">{g.targetDate ? fill(tr('goal.targetOn'), longDate(g.targetDate)) : tr('goal.noTarget')}</div>
                    <div className="mt-1.5 text-title font-semibold leading-[1.3] tabular-nums">
                      <Money hidden={hidden} inline>
                        {format(g.currentAmount)}
                      </Money>{' '}
                      <span className="text-body-sm font-medium text-ink-secondary">
                        {`${tr('plan.of')} `}
                        <Money hidden={hidden} inline>
                          {format(g.targetAmount)}
                        </Money>
                      </span>
                    </div>
                    <div className="mt-0.5 text-body-sm text-ink-secondary">{goalEtaText(g, transactions, today, language, t)}</div>
                  </div>
                </div>
                {g.plan && (
                  <div className="mt-4 flex items-center gap-2 rounded-[12px] bg-surface-sunken px-3 py-2.5 text-body-sm text-ink-secondary">
                    <Icon paths={IC.repeat} size={16} color="currentColor" />
                    <span className="tabular-nums">
                      {`${planText(g.plan, walletName(g.plan.accountId), format)} · ${fill(tr('goal.next'), shortDayMonth(g.plan.nextDate))}`}
                    </span>
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPaying(g)
                    }}
                    className="h-10 cursor-pointer whitespace-nowrap rounded-[12px] bg-accent-soft px-4 text-label font-semibold text-on-primary-soft hover:brightness-95"
                  >
                    {t('goal.pay')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {goals?.length === 0 && <div className="p-5 text-center text-body-sm text-ink-secondary">{t('plans.goalsEmpty')}</div>}

      {(editing || adding) && <GoalModal goal={editing} wallets={wallets} onClose={close} onSaved={saved} />}
      {paying && <GoalPayModal goal={paying} wallets={wallets} onClose={close} onSaved={saved} />}
    </>
  )
}
