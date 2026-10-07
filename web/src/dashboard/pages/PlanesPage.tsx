import { useState } from 'react'
import { useAutoTour } from '@/components/tour/TourProvider'
import { useAppData } from '@/state/AppDataContext'
import { useSearchParams } from 'react-router-dom'
import BudgetsPage from '@/dashboard/pages/BudgetsPage'
import GoalsPage from '@/dashboard/pages/GoalsPage'
import { LoansTab } from '@/dashboard/components/LoansTab'
import { useTranslation } from '@/state/useTranslation'
import type { TranslationKey } from '@/lib/i18n/translations'
import { cn } from '@/lib/cn'

const TABS: { id: 'presupuestos' | 'metas' | 'prestamos'; labelKey: TranslationKey }[] = [
  { id: 'presupuestos', labelKey: 'planes.tab.budgets' },
  { id: 'metas', labelKey: 'planes.tab.goals' },
  { id: 'prestamos', labelKey: 'planes.tab.loans' },
]

// Planes = Presupuestos · Metas · Préstamos (Web v2 mockup). The tab is in
// the URL (`?tab=`, plus `&side=lent|borrowed` for Préstamos) so Inicio's
// "Ver en Planes →" links and alerts land on the right one.
export default function PlanesPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((x) => x.id === params.get('tab'))?.id ?? 'presupuestos'
  const side = params.get('side') === 'borrowed' ? 'borrowed' : 'lent'
  const [adding, setAdding] = useState(false)
  const done = () => setAdding(false)
  const { isLoading } = useAppData()
  useAutoTour('tour.planes', !isLoading)
  const addLabel = t(tab === 'presupuestos' ? 'plans.newBudget' : tab === 'metas' ? 'plans.newGoal' : side === 'borrowed' ? 'loans.newBorrowed' : 'loans.newLent')

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 pb-12 pt-6 min-[760px]:px-8 min-[760px]:pt-8">
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-display-sm font-medium tracking-[-.025em]">{t('planes.title')}</h1>
            <div className="mt-1 text-body-sm text-ink-secondary">{t('planes.subtitle')}</div>
          </div>
          <button
            type="button"
            onClick={() => setAdding(true)}
            data-tour="planes.create"
            className="btn-cta flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-[12px] px-5 text-label font-semibold"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="flex-none">
              <path d="M12 5v14 M5 12h14" />
            </svg>
            {addLabel}
          </button>
        </div>
        <div role="tablist" data-tour="planes.tabs" className="flex overflow-x-auto border-b border-border scrollbar-none">
          {TABS.map((x) => {
            const on = x.id === tab
            return (
              <button
                key={x.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setAdding(false)
                  setParams({ tab: x.id }, { replace: true })
                }}
                className={cn(
                  'mb-[-1px] h-10 flex-none cursor-pointer whitespace-nowrap border-b-2 px-4 text-label',
                  on ? 'border-primary-border font-semibold text-ink' : 'border-transparent font-semibold text-ink-secondary hover:text-ink',
                )}
              >
                {t(x.labelKey)}
              </button>
            )
          })}
        </div>
      </div>
      {tab === 'presupuestos' && <BudgetsPage adding={adding} onAddingDone={done} />}
      {tab === 'metas' && <GoalsPage adding={adding} onAddingDone={done} />}
      {tab === 'prestamos' && <LoansTab side={side} onSide={(s) => setParams({ tab: 'prestamos', side: s }, { replace: true })} adding={adding} onAddingDone={done} />}
    </div>
  )
}
