import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CategoryMark } from '@/components/v2/CategoryMark'
import { ICON_PATHS, StrokeIcon } from '@/components/v2/icons'
import { Money } from '@/components/v2/Money'
import { errorBoxClass, primaryButtonClass, secondaryButtonClass } from '@/components/panels/SidePanel'
import { recurringService } from '@/services/recurringService'
import { useCurrency } from '@/state/useCurrency'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import { fill, nextOccurrenceAfter, shortDate } from '@/lib/inicio'
import type { TranslationKey } from '@/lib/i18n/translations'
import type { RecurringSeries } from '@/types'

interface EventDialogProps {
  series: RecurringSeries
  walletName: string
  today: string
  hidden: boolean
  onClose: () => void
  onChanged: () => void
}

// A Programado's next occurrence (Web v2 mockup, modal kind "event"):
// confirm it into a real movement, or skip this one. Both go through the
// backend, which advances the series.
export function EventDialog({ series, walletName, today, hidden, onClose, onChanged }: EventDialogProps) {
  const { t, tCategory, language } = useTranslation()
  const { format } = useCurrency()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const income = series.type === 'income'
  const dueToday = series.nextOccurrenceDate <= today
  const year = series.nextOccurrenceDate.slice(0, 4)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const run = async (action: () => Promise<void>, toastKey: TranslationKey) => {
    setBusy(true)
    setError('')
    try {
      await action()
      showToast(fill(t(toastKey), series.name), 'success')
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inicio.syncError'))
    } finally {
      setBusy(false)
    }
  }

  const rows: [string, string][] = [
    [t('event.date'), dueToday ? t('event.today') : `${shortDate(series.nextOccurrenceDate, language)} ${year}`],
    [t('event.category'), tCategory(series.category)],
    [t('event.wallet'), walletName],
    [t('event.next'), shortDate(nextOccurrenceAfter(series.nextOccurrenceDate, series.interval), language)],
  ]

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,6,12,.62)] p-6 [line-height:normal] backdrop-blur-[4px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={series.name}
        onClick={(e) => e.stopPropagation()}
        className="flex w-[420px] max-w-full flex-col gap-4 rounded-[18px] border border-v2-line2 bg-v2-surface p-[22px] text-v2-text shadow-[0_24px_60px_rgba(0,0,0,.45)]"
      >
        <div className="flex items-center gap-3">
          <CategoryMark category={series.category} box={40} />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-extrabold tracking-[-.01em]">{series.name}</div>
            <div className="mt-0.5 text-[11.5px] text-v2-dim">{fill(t('event.sub'), t(`event.interval.${series.interval}` as TranslationKey))}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[9px] text-v2-dim hover:bg-v2-subtle hover:text-v2-text"
          >
            <StrokeIcon paths={ICON_PATHS.close} size={14} />
          </button>
        </div>
        <Money hidden={hidden} className="text-[30px] font-extrabold tracking-[-.02em]" style={{ color: income ? 'var(--v2-pos)' : 'var(--v2-neg)' }}>
          {`${income ? '+' : '−'}${format(series.amount)}`}
        </Money>
        <div className="flex flex-col">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 border-b border-v2-subtle py-2.5 text-[12.5px]">
              <span className="text-v2-dim">{label}</span>
              <span className="text-right font-bold">{value}</span>
            </div>
          ))}
        </div>
        {error && <div className={errorBoxClass}>{error}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => run(() => recurringService.skipOccurrence(series.id), 'event.skipped')} className={secondaryButtonClass}>
            {t('event.skip')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => recurringService.confirmOccurrence(series.id, today), 'event.confirmed')}
            className={primaryButtonClass}
          >
            {income ? t('event.confirmIncome') : t('event.confirmExpense')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
