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

  return (
    <div className="flex flex-col gap-[18px] px-4 pb-10 pt-[26px] min-[760px]:px-7">
      <div className="flex flex-col gap-3.5">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-[-.025em]">{t('planes.title')}</h1>
          <div className="mt-[3px] text-[12.5px] text-v2-dim">{t('planes.subtitle')}</div>
        </div>
        <div role="tablist" className="flex border-b border-v2-line">
          {TABS.map((x) => {
            const on = x.id === tab
            return (
              <button
                key={x.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setParams({ tab: x.id }, { replace: true })}
                className={cn(
                  'mb-[-1px] cursor-pointer border-b-2 px-3.5 py-2.5 text-[12.5px]',
                  on ? 'border-v2-accent3 font-extrabold text-v2-text' : 'border-transparent font-semibold text-v2-dim',
                )}
              >
                {t(x.labelKey)}
              </button>
            )
          })}
        </div>
      </div>
      {tab === 'presupuestos' && <BudgetsPage />}
      {tab === 'metas' && <GoalsPage />}
      {tab === 'prestamos' && <LoansTab side={side} onSide={(s) => setParams({ tab: 'prestamos', side: s }, { replace: true })} />}
    </div>
  )
}
