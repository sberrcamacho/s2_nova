import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Calendar, Check, ChevronDown } from 'lucide-react'
import { ICON_PATHS, StrokeIcon } from '@/components/v2/icons'
import { useTranslation } from '@/state/useTranslation'
import { DATE_RANGE_OPTIONS, useDashboardFilters } from '@/dashboard/DashboardFiltersContext'
import { cn } from '@/lib/cn'

interface HeaderProps {
  title: string
  onMenuClick: () => void
  onNewTransaction: () => void
}

// Web v2 header: breadcrumb, search, "Nuevo movimiento". The mockup's
// period selector belongs to Movimientos (its month dropdown lands in the
// Movimientos stage); until Reportes gets its own in-page 3M/6M/12M range,
// the existing range dropdown stays on Reportes only, where it still drives
// the charts.
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

  // Typing searches Movimientos, as in the mockup (onQuery → active: Transactions).
  const onQuery = (value: string) => {
    setQuery(value)
    if (value.trim()) navigate(`/movimientos?q=${encodeURIComponent(value)}`, { replace: onMovimientos })
    else if (onMovimientos) navigate('/movimientos', { replace: true })
  }

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
        {location.pathname === '/reportes' && <RangeSelector />}
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

function RangeSelector() {
  const { range, setRange, rangeLabelKey } = useDashboardFilters()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-[34px] items-center gap-2 rounded-[10px] border border-v2-line bg-v2-surface px-3 text-[12px] font-bold text-v2-muted"
      >
        <Calendar className="h-4 w-4" />
        {t(rangeLabelKey)}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 w-[180px] rounded-[12px] border border-v2-line2 bg-v2-surface p-1.5 shadow-[0_16px_40px_rgba(0,0,0,.35)]">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setRange(opt.value)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-[8px] px-2.5 py-[9px] text-left text-[12.5px]',
                range === opt.value ? 'bg-v2-subtle font-extrabold text-v2-text' : 'font-semibold text-v2-muted',
              )}
            >
              {t(opt.labelKey)}
              {range === opt.value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
