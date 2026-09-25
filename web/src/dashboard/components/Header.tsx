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
    <header className="sticky top-0 z-[5] flex items-center justify-between gap-4 border-b border-v2-line bg-v2-bg px-4 py-3.5 min-[760px]:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={t('header.openMenu')}
          className="flex h-8 w-8 items-center justify-center rounded-[9px] text-v2-muted min-[760px]:hidden"
        >
          <StrokeIcon paths={ICON_PATHS.menu} size={18} />
        </button>
        <div className="truncate text-[12px] text-v2-dim">
          S2 Nova <span className="opacity-50">/</span> <span className="text-v2-muted">{title}</span>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2.5">
        <label className="hidden h-[34px] w-[280px] min-w-0 shrink items-center gap-2 rounded-[10px] border border-v2-line bg-v2-surface px-3 text-v2-dim min-[900px]:flex">
          <StrokeIcon paths={ICON_PATHS.search} size={14} />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t('v2.header.search')}
            aria-label={t('v2.header.search')}
            className="min-w-0 flex-1 border-none bg-transparent text-[12px] text-v2-text outline-none placeholder:text-v2-dim"
          />
        </label>
        {onMovimientos && <PeriodSelector />}
        <button
          type="button"
          onClick={onNewTransaction}
          aria-keyshortcuts="N"
          className="flex h-[34px] flex-none cursor-pointer items-center gap-[7px] rounded-[10px] bg-v2-accent px-3.5 text-[12.5px] font-bold text-white shadow-[0_8px_24px_rgba(108,92,231,.35)]"
        >
          <StrokeIcon paths={ICON_PATHS.plus} size={14} strokeWidth={2.6} />
          {t('v2.header.newTx')}
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
        className="flex h-[34px] cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-[10px] border border-v2-line bg-v2-surface px-3 text-[12px] font-bold text-v2-muted hover:border-v2-line2 hover:text-v2-text"
      >
        {monthYear(period, language)}
        <StrokeIcon paths={['M6 9l6 6 6-6']} size={12} strokeWidth={2.4} />
      </button>
      {open && (
        <div role="listbox" className="absolute right-0 top-10 z-20 flex w-[180px] flex-col gap-0.5 rounded-[12px] border border-v2-line2 bg-v2-surface p-1.5 shadow-[0_16px_40px_rgba(0,0,0,.35)]">
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
                'cursor-pointer rounded-[8px] px-2.5 py-[9px] text-left text-[12.5px] hover:bg-v2-subtle',
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
