import { tr } from '@/lib/i18n/translations'
import { useEffect, useState } from 'react'
import { RowSkeletons } from '@/components/v2/Rows'
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
import { budgetTone, percentText, type Tone } from '@/lib/inicio'
import { ICON_PATHS, StrokeIcon } from '@/components/v2/icons'
import { cn } from '@/lib/cn'
import type { Wallet } from '@/types'

const TONE_VAR: Record<Tone, string> = { neg: 'var(--color-negative)', warn: 'var(--color-warning)', pos: 'var(--color-positive)' }
const TONE_ICON: Record<Tone, string> = { neg: ICON_PATHS.alertCircle, warn: ICON_PATHS.warn, pos: ICON_PATHS.check }

// Planes › Presupuestos: one flat card per budget, laid out as a BudgetBar
// (DESIGN-SYSTEM.md §6.8): the name with the percentage and its state icon,
// the scope and period, the 8 px bar, then "spent de limit" with the state
// in words, so the tone never travels by color alone. A card opens
// the budget modal; the header's "Nuevo presupuesto" (PlanesPage) creates one.
export default function BudgetsPage({ adding, onAddingDone }: { adding: boolean; onAddingDone: () => void }) {
  useCategories()
  const { budgets, version, refresh, notifyChanged, isLoading } = useAppData()
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const { t, language } = useTranslation()
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
      <div className="grid grid-cols-1 gap-4 min-[760px]:grid-cols-2 min-[1100px]:grid-cols-3">
        {sorted.map((b, i) => {
          const tone = budgetTone(b.percentage)
          const color = TONE_VAR[tone]
          const name = b.name ?? categoryName(b.category)
          const scope = `${budgetScope(b, walletName)} · ${budgetPeriodLabel(b)}`
          const state = budgetStateNote(b, today, format)
          return (
            <button
              key={b.id}
              type="button"
              data-tour={i === 0 ? 'planes.card' : undefined}
              onClick={() => setEditing(b)}
              aria-label={`${tr('bud.edit')}: ${name}`}
              className={cn(
                'nova-rise nova-lift flex cursor-pointer flex-col rounded-[20px] border bg-surface p-5 text-left text-ink shadow-[var(--card-shadow)]',
                b.percentage >= 90 ? 'border-negative-soft' : 'border-border',
              )}
            >
              <div className="flex items-center gap-3">
                {b.kind === 'custom' ? <PlanMark icon={b.icon} box={40} /> : <CategoryMark category={b.category ?? 'exp.other'} box={40} />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-title-sm font-semibold" title={name}>{name}</span>
                    <span className="flex flex-none items-center gap-1 text-label font-semibold tabular-nums" style={{ color }}>
                      {percentText(b.percentage, language)}
                      <StrokeIcon paths={TONE_ICON[tone]} size={16} />
                    </span>
                  </div>
                  <div className="truncate text-body-sm text-ink-secondary" title={scope}>{scope}</div>
                </div>
              </div>
              <div
                role="progressbar"
                aria-label={name}
                aria-valuenow={b.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={`${percentText(b.percentage, language)}, ${state}`}
                className="mt-3 h-2 overflow-hidden rounded-full bg-surface-sunken"
              >
                <div className="nova-fill h-full rounded-full" style={{ width: `${Math.min(100, b.percentage)}%`, background: color }} />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-body-sm tabular-nums">
                <span className="whitespace-nowrap">
                  <Money hidden={hidden} inline>{format(b.spent)}</Money>
                  {` ${tr('plan.of')} `}
                  <Money hidden={hidden} inline>{format(b.limit)}</Money>
                </span>
                <span className="whitespace-nowrap" style={{ color: tone === 'pos' ? 'var(--color-text-secondary)' : color }}>{state}</span>
              </div>
            </button>
          )
        })}
      </div>
      {isLoading && budgets.length === 0 && <RowSkeletons count={4} box={40} />}
      {!isLoading && budgets.length === 0 && <div className="p-5 text-center text-body-sm text-ink-secondary">{t('plans.budgetsEmpty')}</div>}

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
