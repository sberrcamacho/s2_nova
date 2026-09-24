import { useState } from 'react'
import { SidePanel, errorBoxClass, primaryButtonClass, secondaryButtonClass } from '@/components/panels/SidePanel'
import { AmountInput, ColorChip, PanelField, dangerButtonClass, panelInputClass } from '@/components/panels/PanelFields'
import { CategoryMark } from '@/components/v2/CategoryMark'
import { ApiError } from '@/lib/apiClient'
import { categoryColor } from '@/lib/categoryGlyphs'
import { EXPENSE_CATEGORY_IDS, guessCategory } from '@/lib/inicio'
import { budgetService, type BudgetProgress } from '@/services/budgetService'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import type { CategoryId } from '@/types'

// Android's budget sheet offers every expense category plus "Otros".
const BUDGET_CATEGORY_IDS: CategoryId[] = EXPENSE_CATEGORY_IDS.includes('other') ? EXPENSE_CATEGORY_IDS : [...EXPENSE_CATEGORY_IDS, 'other']

// Create / edit / delete a budget — Android's Presupuestos sheet as a Web
// side panel (STAGE-2-INICIO §5): Nombre with the category it suggests,
// Categoría, Límite mensual. The backend keeps one budget per category and
// month, so a taken category comes back as a 409.
export function BudgetPanel({ budget, taken, onClose, onSaved }: { budget: BudgetProgress | null; taken: CategoryId[]; onClose: () => void; onSaved: () => void }) {
  const { t, tCategory } = useTranslation()
  const { showToast } = useToast()
  const isEdit = budget !== null
  const firstFree = !taken.includes('other') ? 'other' : (BUDGET_CATEGORY_IDS.find((c) => !taken.includes(c)) ?? 'other')
  const [name, setName] = useState(budget ? (budget.name ?? tCategory(budget.category)) : '')
  const [category, setCategory] = useState<CategoryId>(budget?.category ?? firstFree)
  const [picked, setPicked] = useState(isEdit)
  const [limit, setLimit] = useState(budget ? String(budget.limit) : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const guessed = guessCategory(name)
  const auto = !picked && guessed !== null && BUDGET_CATEGORY_IDS.includes(guessed)

  const onName = (value: string) => {
    setName(value)
    setError('')
    const g = guessCategory(value)
    if (!picked && g && BUDGET_CATEGORY_IDS.includes(g)) setCategory(g)
  }

  const save = async () => {
    const amount = Number(limit)
    if (!name.trim()) return setError(t('plans.errName'))
    if (!amount) return setError(t('plans.errAmount'))
    // A name equal to a category label is that category's display name.
    const labels = [tCategory(category), budget ? tCategory(budget.category) : '']
    const custom = labels.includes(name.trim()) ? null : name.trim()
    setBusy(true)
    try {
      if (budget) {
        await budgetService.updateBudget(budget.id, { name: custom, limit: amount, category: category !== budget.category ? category : undefined })
      } else {
        await budgetService.createBudget({ name: custom ?? undefined, category, limit: amount })
      }
      showToast(t('plans.budgetSaved'), 'success')
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? t('plans.categoryTaken') : err instanceof Error ? err.message : t('inicio.syncError'))
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!budget) return
    setBusy(true)
    try {
      await budgetService.deleteBudget(budget.id)
      showToast(t('plans.budgetDeleted'), 'success')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inicio.syncError'))
      setBusy(false)
    }
  }

  return (
    <SidePanel
      title={t(isEdit ? 'plans.editBudget' : 'plans.newBudget')}
      onClose={onClose}
      footer={
        <>
          {isEdit && (
            <button type="button" onClick={remove} disabled={busy} className={dangerButtonClass}>
              {t('plans.deleteBudget')}
            </button>
          )}
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={save} disabled={busy} className={primaryButtonClass}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <PanelField label={t('plans.name')} htmlFor="bp-name" note={t(auto ? 'plans.categoryAuto' : 'plans.categoryNote')}>
        <div className="flex items-center gap-3">
          <CategoryMark category={category} box={40} />
          <input id="bp-name" value={name} onChange={(e) => onName(e.target.value)} placeholder={t('plans.budgetNamePlaceholder')} className={panelInputClass} />
        </div>
      </PanelField>

      <PanelField label={t('plans.category')}>
        <div role="radiogroup" aria-label={t('plans.category')} className="flex flex-wrap gap-2">
          {BUDGET_CATEGORY_IDS.map((id) => (
            <ColorChip
              key={id}
              label={tCategory(id)}
              color={categoryColor(id)}
              selected={category === id}
              onClick={() => {
                setCategory(id)
                setPicked(true)
                setError('')
              }}
            />
          ))}
        </div>
      </PanelField>

      <PanelField label={t('plans.monthlyLimit')} htmlFor="bp-limit">
        <AmountInput id="bp-limit" value={limit} onChange={(v) => { setLimit(v); setError('') }} />
      </PanelField>

      {error && (
        <div role="alert" className={errorBoxClass}>
          {error}
        </div>
      )}
    </SidePanel>
  )
}
