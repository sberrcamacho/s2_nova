import { useState } from 'react'
import { Money, MoneyText } from '@/components/v2/Money'
import { BudgetPanel } from '@/dashboard/components/planes/BudgetPanel'
import { PlanAddTile } from '@/dashboard/components/planes/PlanAddTile'
import { type BudgetProgress } from '@/services/budgetService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useHideAmounts } from '@/state/useHideAmounts'
import { useTranslation } from '@/state/useTranslation'
import { todayISO } from '@/lib/date'
import { budgetNote } from '@/lib/inicio'
import { budgetNoteText } from '@/lib/planCopy'

function tone(pct: number): string {
  return pct >= 90 ? 'var(--v2-neg)' : pct >= 65 ? 'var(--v2-warn)' : 'var(--v2-pos)'
}

// Planes › Presupuestos (Web v2 mockup `isBudgets`): one card per budget,
// riskiest first, with the pace note Inicio uses. A card opens the budget
// panel; the dashed tile creates one (Android's "+ Nuevo presupuesto").
export default function BudgetsPage() {
  const { budgets, refresh, notifyChanged } = useAppData()
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const { t, tCategory } = useTranslation()
  const [editing, setEditing] = useState<BudgetProgress | 'new' | null>(null)
  const today = todayISO()
  const sorted = [...budgets].sort((a, b) => b.percentage - a.percentage)

  return (
    <>
      <div className="grid grid-cols-1 gap-3.5 min-[760px]:grid-cols-2 min-[1100px]:grid-cols-3">
        {sorted.map((b) => {
          const c = tone(b.percentage)
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setEditing(b)}
              className="cursor-pointer rounded-[16px] border bg-v2-surface px-5 py-[18px] text-left focus-visible:outline-2 focus-visible:outline-v2-accent"
              style={{ borderColor: b.percentage >= 90 ? 'var(--v2-neg-soft)' : 'var(--v2-line)' }}
            >
              <div className="flex items-baseline justify-between">
                <div className="text-[13.5px] font-extrabold">{b.name ?? tCategory(b.category)}</div>
                {/* The mockup's pill padding stays; its `var(--neg)24` background is invalid CSS and never paints. */}
                <span className="px-2 py-[3px] text-[11.5px] font-extrabold" style={{ color: c }}>
                  {b.percentage}%
                </span>
              </div>
              <Money hidden={hidden} className="mt-2 block text-[20px] font-extrabold tracking-[-.025em]">
                {format(b.spent)}
              </Money>
              <div className="mt-0.5 text-[11.5px] text-v2-dim">
                <MoneyText parts={[{ template: t('plans.of'), args: [{ amount: b.limit }] }]} hidden={hidden} format={format} />
              </div>
              <div className="mt-3.5 h-1.5 overflow-hidden rounded-[3px] bg-v2-line">
                <div className="h-full" style={{ width: `${Math.min(100, b.percentage)}%`, background: c }} />
              </div>
              <div className="mt-2.5 text-[11.5px] text-v2-muted">
                <MoneyText parts={[budgetNoteText(budgetNote(b.spent, b.limit, b.percentage, today), t)]} hidden={hidden} format={format} />
              </div>
            </button>
          )
        })}
        <PlanAddTile label={t('plans.newBudget')} onClick={() => setEditing('new')} />
      </div>
      {budgets.length === 0 && <div className="p-5 text-center text-[12.5px] text-v2-dim">{t('plans.budgetsEmpty')}</div>}

      {editing && (
        <BudgetPanel
          budget={editing === 'new' ? null : editing}
          taken={budgets.filter((b) => editing === 'new' || b.id !== editing.id).map((b) => b.category)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            notifyChanged()
            void refresh()
          }}
        />
      )}
    </>
  )
}

