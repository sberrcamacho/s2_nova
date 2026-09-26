import { useEffect, useState } from 'react'
import { CategoryMark, PlanMark } from '@/components/v2/CategoryMark'
import { Money } from '@/components/v2/Money'
import { BudgetModal } from '@/dashboard/components/planes/BudgetModal'
import { categoryName, useCategories } from '@/lib/backendCategories'
import { shortWallet } from '@/lib/movimientos'
import { budgetPeriodLabel, budgetScope, budgetStateNote } from '@/lib/planCopy'
import { accountService } from '@/services/accountService'
import { type BudgetProgress } from '@/services/budgetService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useHideAmounts } from '@/state/useHideAmounts'
import { useTranslation } from '@/state/useTranslation'
import { todayISO } from '@/lib/date'
import type { Wallet } from '@/types'

// The mockup's toneOf(): color + pill background by percentage.
function toneOf(pct: number): [string, string] {
  return pct >= 90 ? ['var(--v2-neg)', 'rgba(255,98,98,.14)'] : pct >= 65 ? ['var(--v2-warn)', 'rgba(240,180,41,.16)'] : ['var(--v2-pos)', 'rgba(50,201,138,.14)']
}

// Planes › Presupuestos (Web v2 mockup `isBudgets`): one card per budget
// with its mark, scope, spent/limit, state note and period. A card opens
// the budget modal; the header's "Nuevo presupuesto" (PlanesPage) creates one.
export default function BudgetsPage({ adding, onAddingDone }: { adding: boolean; onAddingDone: () => void }) {
  useCategories()
  const { budgets, version, refresh, notifyChanged } = useAppData()
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const { t } = useTranslation()
  const [editing, setEditing] = useState<BudgetProgress | null>(null)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const today = todayISO()
  const sorted = [...budgets].sort((a, b) => b.percentage - a.percentage)
  const walletName = (id: string) => shortWallet(wallets.find((w) => w.id === id)?.name ?? '')

  useEffect(() => {
    accountService.getWallets().then(setWallets, () => {})
  }, [version])

  const close = () => {
    setEditing(null)
    onAddingDone()
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3.5 min-[760px]:grid-cols-2 min-[1100px]:grid-cols-3">
        {sorted.map((b) => {
          const [tone, bg] = toneOf(b.percentage)
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setEditing(b)}
              className="cursor-pointer rounded-[16px] border bg-v2-surface px-5 py-[18px] text-left hover:!border-v2-line2 focus-visible:outline-2 focus-visible:outline-v2-accent"
              style={{ borderColor: b.percentage >= 90 ? 'var(--v2-neg-soft)' : 'var(--v2-line)' }}
            >
              <div className="flex items-center gap-2.5">
                {b.kind === 'custom' ? <PlanMark icon={b.icon} box={36} /> : <CategoryMark category={b.category ?? 'exp.other'} box={36} />}
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-extrabold">{b.name ?? categoryName(b.category)}</div>
                  <div className="mt-px text-[11px] text-v2-dim">{budgetScope(b, walletName)}</div>
                </div>
                <span className="rounded-full px-2 py-[3px] text-[11.5px] font-extrabold" style={{ color: tone, background: bg }}>
                  {b.percentage}%
                </span>
              </div>
              <Money hidden={hidden} className="mt-2 block text-[20px] font-extrabold tracking-[-.025em]">
                {format(b.spent)}
              </Money>
              <div className="mt-0.5 text-[11.5px] text-v2-dim">
                de{' '}
                <Money hidden={hidden} inline>
                  {format(b.limit)}
                </Money>
              </div>
              <div className="mt-3.5 h-1.5 overflow-hidden rounded-[3px] bg-v2-line">
                <div className="h-full" style={{ width: `${Math.min(100, b.percentage)}%`, background: tone }} />
              </div>
              <div className="mt-2.5 flex justify-between gap-2.5 text-[11.5px]">
                <span className="text-v2-muted">{budgetStateNote(b, today, format)}</span>
                <span className="text-v2-dim">{budgetPeriodLabel(b)}</span>
              </div>
            </button>
          )
        })}
      </div>
      {budgets.length === 0 && <div className="p-5 text-center text-[12.5px] text-v2-dim">{t('plans.budgetsEmpty')}</div>}

      {(editing || adding) && (
        <BudgetModal
          budget={editing}
          wallets={wallets}
          onClose={close}
          onSaved={() => {
            close()
            notifyChanged()
            void refresh()
          }}
        />
      )}
    </>
  )
}
