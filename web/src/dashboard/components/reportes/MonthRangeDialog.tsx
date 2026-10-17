import { useState } from 'react'
import { ModalFooter, ModalTitle, SaveButton, V2Modal, CancelButton } from '@/components/v2/Kit'
import { ICON_PATHS } from '@/components/v2/icons'
import { Glyph } from '@/components/v2/CategoryMark'
import { cn } from '@/lib/cn'
import { MONTHS_SHORT, monthYear } from '@/lib/inicio'
import { fill } from '@/lib/i18n/translations'
import { REPORT_MAX_MONTHS, monthsBetween, shiftMonthKey, spanLabel } from '@/lib/reportRange'
import { useTranslation } from '@/state/useTranslation'

// Reportes' "Rango": a year with its twelve months; the first tap picks the
// first month, the second the last (an earlier one restarts the range).
// Months after the current one, or more than 24 from the first, can't be
// picked. Fits without scrolling (DESIGN-SYSTEM §6.11). Android's
// MonthRangeSheet is the same picker.
export function MonthRangeDialog({ initial, currentMonth, onApply, onClose }: { initial: { from: string; to: string }; currentMonth: string; onApply: (from: string, to: string) => void; onClose: () => void }) {
  const { t, language } = useTranslation()
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState<string | null>(initial.to)
  const [year, setYear] = useState(Number(initial.to.slice(0, 4)))
  const currentYear = Number(currentMonth.slice(0, 4))
  const lastAllowed = to === null && shiftMonthKey(from, REPORT_MAX_MONTHS - 1) < currentMonth ? shiftMonthKey(from, REPORT_MAX_MONTHS - 1) : currentMonth

  const pick = (key: string) => {
    if (to !== null || key < from) {
      setFrom(key)
      setTo(null)
    } else setTo(key)
  }
  const end = to ?? from
  const count = monthsBetween(from, end)
  const hint = to === null ? fill(t('rep.range.hintEnd'), monthYear(from, language)) : t('rep.range.hintStart')

  return (
    <V2Modal width={440} onClose={onClose} label={t('rep.range.title')}>
      <ModalTitle>{t('rep.range.title')}</ModalTitle>
      <div>
        <div className="flex items-center justify-between">
          <YearButton label={t('rep.range.prevYear')} path={ICON_PATHS.chevronRight} flip onClick={() => setYear(year - 1)} />
          <div aria-live="polite" className="font-numeric text-title-sm font-semibold">
            {year}
          </div>
          <YearButton label={t('rep.range.nextYear')} path={ICON_PATHS.chevronRight} disabled={year >= currentYear} onClick={() => setYear(year + 1)} />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {MONTHS_SHORT[language].map((name, index) => {
            const key = `${year}-${String(index + 1).padStart(2, '0')}`
            const disabled = key > lastAllowed
            const edge = key === from || key === to
            const inside = !edge && to !== null && key > from && key < to
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                aria-pressed={edge || inside}
                aria-label={monthYear(key, language)}
                onClick={() => pick(key)}
                className={cn(
                  'inline-flex h-11 items-center justify-center gap-1 rounded-[10px] text-label capitalize transition-colors duration-150',
                  edge
                    ? 'chip-on font-semibold text-white [background:var(--cta-bg)]'
                    : inside
                      ? 'bg-accent-soft font-semibold text-on-primary-soft'
                      : disabled
                        ? 'cursor-not-allowed text-ink-tertiary opacity-50'
                        : 'cursor-pointer font-medium text-ink hover:bg-surface-sunken',
                )}
              >
                {name}
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <div className="min-w-0 truncate text-label font-semibold">{spanLabel(from, end, language)}</div>
          <div className="font-numeric flex-none text-label text-ink-secondary">{count === 1 ? t('rep.range.oneMonth') : fill(t('rep.range.months'), count)}</div>
        </div>
        <p className="mt-1 text-caption leading-[1.5] text-ink-tertiary">{hint}</p>
      </div>
      <ModalFooter>
        <CancelButton onClick={onClose} />
        <SaveButton valid onClick={() => onApply(from, end)}>
          {t('rep.range.apply')}
        </SaveButton>
      </ModalFooter>
    </V2Modal>
  )
}

function YearButton({ label, path, flip, disabled, onClick }: { label: string; path: string; flip?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn('flex size-9 items-center justify-center rounded-full', disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-surface-sunken')}
    >
      <span className={flip ? 'rotate-180' : undefined}>
        <Glyph paths={[path]} size={20} color="currentColor" />
      </span>
    </button>
  )
}
