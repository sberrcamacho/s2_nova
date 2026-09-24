import { useCallback, useEffect, useState } from 'react'
import { Money, MoneyText } from '@/components/v2/Money'
import { RowSkeletons, SyncBanner } from '@/components/v2/Rows'
import { GoalPanel, GoalPayPanel } from '@/dashboard/components/planes/GoalPanels'
import { PlanAddTile } from '@/dashboard/components/planes/PlanAddTile'
import { accountService } from '@/services/accountService'
import { goalService } from '@/services/goalService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useHideAmounts } from '@/state/useHideAmounts'
import { useTranslation } from '@/state/useTranslation'
import { goalMark } from '@/lib/categoryGlyphs'
import { todayISO } from '@/lib/date'
import { goalEtaText } from '@/lib/planCopy'
import type { Goal, Wallet } from '@/types'

// Planes › Metas (Web v2 mockup `isGoals`): a ring with the percentage,
// `current de target` and the estimated date, as on Inicio. The card opens
// the goal panel; "Abonar" (Android's goal-card button, needed for parity)
// adds a contribution.
export default function GoalsPage() {
  const { transactions, version, refresh, notifyChanged } = useAppData()
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const { t, language } = useTranslation()
  const [goals, setGoals] = useState<Goal[] | null>(null)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [failed, setFailed] = useState(false)
  const [editing, setEditing] = useState<Goal | 'new' | null>(null)
  const [paying, setPaying] = useState<Goal | null>(null)
  const today = todayISO()

  const load = useCallback(async () => {
    const [g, w] = await Promise.allSettled([goalService.getGoals(), accountService.getWallets()])
    if (g.status === 'fulfilled') setGoals(g.value)
    if (w.status === 'fulfilled') setWallets(w.value)
    setFailed(g.status === 'rejected' || w.status === 'rejected')
  }, [])

  useEffect(() => {
    void load()
  }, [load, version])

  const saved = () => {
    setEditing(null)
    setPaying(null)
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
            const mark = goalMark(g.themeIcon)
            const pct = Math.min(100, g.percentage)
            return (
              <div key={g.id} className="flex items-center gap-3 rounded-[16px] border border-v2-line bg-v2-surface p-5">
                <button type="button" onClick={() => setEditing(g)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-[18px] text-left focus-visible:outline-2 focus-visible:outline-v2-accent">
                  <span
                    className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-full"
                    style={{ background: `conic-gradient(${mark.color} ${pct}%, var(--v2-line) 0)` }}
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-v2-surface">
                      <span className="font-numeric text-[14px] font-extrabold">{g.percentage}%</span>
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-extrabold tracking-[-.01em]">{g.name}</span>
                    <span className="font-numeric mt-[5px] block text-[18px] font-extrabold tracking-[-.02em]">
                      <Money hidden={hidden} inline>
                        {format(g.currentAmount)}
                      </Money>{' '}
                      <span className="text-[12px] font-semibold tracking-normal text-v2-dim">
                        <MoneyText parts={[{ template: t('plans.of'), args: [{ amount: g.targetAmount }] }]} hidden={hidden} format={format} />
                      </span>
                    </span>
                    <span className="mt-1.5 block text-[11.5px] leading-[1.5] text-v2-dim">{goalEtaText(g, transactions, today, language, t)}</span>
                  </span>
                </button>
                <button type="button" onClick={() => setPaying(g)} className="flex-none cursor-pointer self-end rounded-[10px] bg-v2-accent px-3.5 py-[9px] text-[12px] font-bold text-white">
                  {t('plans.contribute')}
                </button>
              </div>
            )
          })}
          <PlanAddTile label={t('plans.newGoal')} onClick={() => setEditing('new')} />
        </div>
      )}
      {goals?.length === 0 && <div className="p-5 text-center text-[12.5px] text-v2-dim">{t('plans.goalsEmpty')}</div>}

      {editing && <GoalPanel goal={editing === 'new' ? null : editing} wallets={wallets} onClose={() => setEditing(null)} onSaved={saved} />}
      {paying && <GoalPayPanel goal={paying} wallets={wallets} onClose={() => setPaying(null)} onSaved={saved} />}
    </>
  )
}
