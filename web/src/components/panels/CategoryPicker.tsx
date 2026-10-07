import { useEffect, useRef, useState } from 'react'
import { CategoryMark, GlyphMark } from '@/components/v2/CategoryMark'
import { GridCell, Icon } from '@/components/v2/Kit'
import { StepChoiceRow } from '@/components/v2/Steps'
import { categoryColor, categoryGlyph, categoryName, childCategories, parentCategories } from '@/lib/backendCategories'
import type { CategoryId } from '@/types'
import { useTranslation } from '@/state/useTranslation'

// Nuevo movimiento's category picker, a page that takes the panel's place
// (DESIGN-SYSTEM.md §6.11, drill-in with a back arrow) in two steps, as on
// Android: the categories, then that category's subcategories. Picking one
// returns to the form.
export function CategoryPicker({
  income,
  cat,
  sub,
  done,
  onPick,
  onBack,
  onManage,
}: {
  income: boolean
  cat: CategoryId | null
  sub: CategoryId | null
  done: boolean
  onPick: (cat: CategoryId, sub: CategoryId | null) => void
  onBack: () => void
  onManage: () => void
}) {
  const { t } = useTranslation()
  const [parent, setParent] = useState<CategoryId | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const subs = parent ? childCategories(parent, false) : []

  // Each page starts with its title focused, so a screen reader reads it.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [parent])

  const header = (title: string, back: () => void, step: string) => (
    <div className="flex items-center gap-2">
      <button type="button" onClick={back} aria-label={t('common.back')} className="-ml-2 flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full text-ink-secondary hover:bg-surface-sunken hover:text-ink">
        <Icon paths={['M15 18l-6-6 6-6']} size={20} color="currentColor" />
      </button>
      <div className="min-w-0 flex-1">
        <h2 ref={headingRef} tabIndex={-1} className="truncate text-title-sm font-semibold outline-none">
          {title}
        </h2>
        <div className="text-caption text-ink-secondary">{step}</div>
      </div>
    </div>
  )

  if (parent && subs.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        {header(categoryName(parent), () => setParent(null), t('nm.cat.step2'))}
        <div role="radiogroup" aria-label={categoryName(parent)} className="flex flex-col gap-2">
          <StepChoiceRow
            label={t('nm.none.f')}
            on={done && cat === parent && sub === null}
            onClick={() => onPick(parent, null)}
            leading={<CategoryMark category={parent} box={32} />}
          />
          {subs.map((s) => (
            <StepChoiceRow
              key={s.id}
              label={categoryName(s.id)}
              on={done && sub === s.id}
              onClick={() => onPick(parent, s.id)}
              leading={<GlyphMark paths={categoryGlyph(s.id)} color={categoryColor(parent)} box={32} />}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {header(t(income ? 'nm.cat.income' : 'nm.cat.expense'), onBack, t('nm.cat.step1'))}
      <div role="radiogroup" aria-label={t(income ? 'nm.cat.income' : 'nm.cat.expense')} className="grid grid-cols-3 gap-1.5">
        {parentCategories(income, false).map((x) => (
          <GridCell
            key={x.id}
            on={done && cat === x.id}
            chip={<CategoryMark category={x.id} box={40} />}
            label={categoryName(x.id)}
            onClick={() => {
              if (childCategories(x.id, false).length) setParent(x.id)
              else onPick(x.id, null)
            }}
          />
        ))}
      </div>
      <button type="button" onClick={onManage} className="min-h-8 cursor-pointer self-start text-label font-semibold text-link">
        {t('nm.manageCategories')}
      </button>
    </div>
  )
}
