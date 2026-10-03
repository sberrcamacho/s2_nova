import { useState } from 'react'
import { CategoryMark } from '@/components/v2/CategoryMark'
import { DetailDialog } from '@/components/v2/DetailDialog'
import { Money } from '@/components/v2/Money'
import { dangerButtonClass } from '@/components/panels/PanelFields'
import { primaryButtonClass, secondaryButtonClass } from '@/components/panels/SidePanel'
import { recurringService } from '@/services/recurringService'
import { useCurrency } from '@/state/useCurrency'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import { fill, nextOccurrenceAfter, shortDate } from '@/lib/inicio'
import { categoryLabel } from '@/lib/backendCategories'
import { shortWallet } from '@/lib/movimientos'
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
// backend, which advances the series. "Eliminar serie" (not in the mockup;
// Web has no Programados page) stops it, after a second click to confirm;
// past movements are kept.
export function EventDialog({ series, walletName, today, hidden, onClose, onChanged }: EventDialogProps) {
  const { t, language } = useTranslation()
  const { format } = useCurrency()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const income = series.type === 'income'
  const dueToday = series.nextOccurrenceDate <= today
  const year = series.nextOccurrenceDate.slice(0, 4)

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
    [t('event.category'), categoryLabel(series.category)],
    [t('event.wallet'), shortWallet(walletName)],
    [t('event.next'), shortDate(nextOccurrenceAfter(series.nextOccurrenceDate, series.interval), language)],
  ]

  return (
    <DetailDialog
      title={series.name}
      sub={fill(t('event.sub'), t(`event.interval.${series.interval}` as TranslationKey))}
      chip={<CategoryMark category={series.category} box={40} />}
      amount={
        <Money hidden={hidden} className="text-display-sm font-semibold tracking-[-.02em]" style={{ color: income ? 'var(--v2-pos)' : 'var(--v2-neg)' }}>
          {`${income ? '+' : '−'}${format(series.amount)}`}
        </Money>
      }
      rows={rows}
      error={error}
      onClose={onClose}
      actions={
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => (confirmDelete ? run(() => recurringService.deleteSeries(series.id), 'event.deleted') : setConfirmDelete(true))}
            className={dangerButtonClass}
          >
            {confirmDelete ? t('event.deleteConfirm') : t('event.delete')}
          </button>
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
        </>
      }
    />
  )
}
