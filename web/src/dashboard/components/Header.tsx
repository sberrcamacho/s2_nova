import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Calendar, Check, ChevronDown } from 'lucide-react'
import { ICON_PATHS, StrokeIcon } from '@/components/v2/icons'
import { useTranslation } from '@/state/useTranslation'
import { cn } from '@/lib/cn'
import { todayISO } from '@/lib/date'
import { monthYear } from '@/lib/inicio'
import { recentMonths } from '@/lib/movimientos'
import { usePeriod } from '@/dashboard/usePeriod'

interface HeaderProps {
  title: string
  onMenuClick: () => void
  onNewTransaction: () => void
}

// Web v2 header: breadcrumb, search, the period selector (Movimientos
// only, per the mockup's showPeriod) and "Nuevo movimiento". Reportes has
// its own in-page 3M/6M/12M range.
export function Header({ title, onMenuClick, onNewTransaction }: HeaderProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const onMovimientos = location.pathname === '/movimientos'
  const [query, setQuery] = useState(onMovimientos ? (params.get('q') ?? '') : '')

  useEffect(() => {
    if (!onMovimientos) setQuery('')
  }, [onMovimientos])

  // Typing searches Movimientos, as in the mockup (onQuery → active:
  // Transactions); on Movimientos the selected period is kept.
  const onQuery = (value: string) => {
    setQuery(value)
    const next = new URLSearchParams(onMovimientos ? params : undefined)
    if (value.trim()) next.set('q', value)
    else next.delete('q')
    if (value.trim() || onMovimientos) {
      const search = next.toString()
      navigate(`/movimientos${search ? `?${search}` : ''}`, { replace: onMovimientos })
    }
  }

  // Inicio's wallet rows open Movimientos with the wallet as the query.
  useEffect(() => {
    if (onMovimientos) setQuery(params.get('q') ?? '')
  }, [onMovimientos, params])

  return (
    <header className="sticky top-0 z-[5] flex h-16 flex-none items-center justify-between gap-4 border-b border-v2-line bg-v2-bg/80 px-4 backdrop-blur-xl min-[760px]:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={t('header.openMenu')}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-v2-line bg-v2-surface text-v2-muted hover:text-v2-text min-[760px]:hidden"
        >
          <StrokeIcon paths={ICON_PATHS.menu} size={18} />
        </button>
        <div className="truncate text-body-sm text-v2-dim">
          S2 Nova <span aria-hidden="true" className="px-0.5 opacity-60">/</span> <span className="font-semibold text-v2-text">{title}</span>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2.5">
        <label className="hidden h-10 w-[300px] min-w-0 shrink items-center gap-2.5 rounded-full border border-v2-line bg-v2-surface px-4 text-v2-dim transition-colors focus-within:border-[var(--color-border-input)] min-[900px]:flex">
          <StrokeIcon paths={ICON_PATHS.search} size={16} />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t('v2.header.search')}
            aria-label={t('v2.header.search')}
            className="min-w-0 flex-1 border-none bg-transparent text-body-sm text-v2-text outline-none placeholder:text-v2-dim"
          />
        </label>
        {onMovimientos && <PeriodSelector />}
        <button
          type="button"
          onClick={onNewTransaction}
          aria-keyshortcuts="N"
          title={t('v2.header.newTx')}
          // Icon-only on phones, where the label would push the button off-screen next to the period selector.
          className="btn-cta flex h-10 flex-none cursor-pointer items-center gap-2 rounded-full px-5 text-label font-semibold max-[519px]:w-10 max-[519px]:justify-center max-[519px]:px-0"
        >
          <StrokeIcon paths={ICON_PATHS.plus} size={16} strokeWidth={2.4} />
          <span className="whitespace-nowrap max-[519px]:sr-only">{t('v2.header.newTx')}</span>
        </button>
      </div>
    </header>
  )
}

// The mockup's month dropdown: current month and the ones before it
// (`recentMonths`), written to Movimientos' `?period=`.
function PeriodSelector() {
  const { t, language } = useTranslation()
  const [period, setPeriod] = usePeriod()
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('mov.period')}: ${monthYear(period, language)}`}
        className="flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-v2-line bg-v2-surface px-4 text-label font-semibold text-v2-muted hover:border-v2-line2 hover:text-v2-text"
      >
        {monthYear(period, language)}
        <StrokeIcon paths={['M6 9l6 6 6-6']} size={12} strokeWidth={2.4} />
      </button>
      {open && (
        <div role="listbox" className="absolute right-0 top-12 z-20 flex w-[200px] flex-col gap-0.5 rounded-[16px] border border-v2-line2 bg-v2-surface p-1.5 shadow-[var(--shadow-lg)]">
          {recentMonths(todayISO()).map((m) => (
            <button
              key={m}
              type="button"
              role="option"
              aria-selected={period === m}
              onClick={() => {
                setPeriod(m)
                setOpen(false)
              }}
              className={cn(
                'cursor-pointer rounded-[10px] px-3 py-2.5 text-left text-label hover:bg-v2-subtle',
                period === m ? 'bg-v2-subtle font-extrabold text-v2-text' : 'font-semibold text-v2-muted',
              )}
            >
              {monthYear(m, language)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
