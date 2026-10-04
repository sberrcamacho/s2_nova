import { ICON_PATHS, StrokeIcon } from '@/components/v2/icons'
import { currentLanguage, fill, tr, type TranslationKey } from '@/lib/i18n/translations'
import { MONTHS_LONG } from '@/lib/inicio'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { CategoryMark } from '@/components/v2/CategoryMark'
import { CancelButton, ConfirmDialog, DangerLink, Flat, IC, Icon, ModalFooter, V2Modal } from '@/components/v2/Kit'
import { Money } from '@/components/v2/Money'
import { RowSkeletons, SyncBanner } from '@/components/v2/Rows'
import { primaryButtonClass } from '@/components/panels/SidePanel'
import { accountService } from '@/services/accountService'
import { productService, type CatalogProduct } from '@/services/productService'
import { recurringService } from '@/services/recurringService'
import { transactionService } from '@/services/transactionService'
import { useAppData } from '@/state/AppDataContext'
import { useAuth } from '@/state/AuthContext'
import { useNewMovement } from '@/state/NewMovementContext'
import { useHideAmounts } from '@/state/useHideAmounts'
import { useToast } from '@/state/ToastContext'
import { TRANSFER, allCategories, categoryLabel, categoryName, categoryNode, useCategories } from '@/lib/backendCategories'
import { currencyInfo, formatApprox, formatMoney, referenceRate } from '@/lib/currency'
import { addDays } from '@/lib/inicio'
import { matchesSearch, shortWallet } from '@/lib/movimientos'
import { longDate, shortDayMonth } from '@/lib/planCopy'
import { todayISO } from '@/lib/date'
import { usePeriod } from '@/dashboard/usePeriod'
import { useFreshIds } from '@/lib/useFreshIds'
import { cn } from '@/lib/cn'
import type { NewTransactionInput, RecurringSeries, Transaction, Wallet } from '@/types'

type Filter = 'all' | 'expenses' | 'income' | 'scheduled'

const FILTERS: Filter[] = ['all', 'expenses', 'income', 'scheduled']

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

// The month's movements, plus every Programado when the month is the
// current one (the mockup lists "Arriendo · 1 sep" while in August).
function useMovements(period: string, version: number) {
  const [month, setMonth] = useState<Transaction[] | null>(null)
  const [planned, setPlanned] = useState<Transaction[]>([])
  const [wallets, setWallets] = useState<Wallet[] | null>(null)
  const [syncFailed, setSyncFailed] = useState(false)
  const [loadedPeriod, setLoadedPeriod] = useState<string | null>(null)
  const current = period === todayISO().slice(0, 7)

  const load = useCallback(async () => {
    const [rows, upcoming, accounts] = await Promise.allSettled([
      transactionService.getMonth(period),
      current ? transactionService.getPlanned() : Promise.resolve([]),
      accountService.getWallets(),
    ])
    if (rows.status === 'fulfilled') {
      setMonth(rows.value)
      setLoadedPeriod(period)
    }
    if (upcoming.status === 'fulfilled') setPlanned(upcoming.value)
    if (accounts.status === 'fulfilled') setWallets(accounts.value)
    setSyncFailed([rows, upcoming, accounts].some((r) => r.status === 'rejected'))
  }, [period, current])

  useEffect(() => {
    void load()
  }, [load, version])

  // A different month's rows never stand in for the selected one.
  const txns = useMemo(() => {
    if (loadedPeriod !== period || !month) return null
    const ids = new Set(month.map((x) => x.id))
    return [...month, ...planned.filter((x) => !ids.has(x.id))]
  }, [month, planned, loadedPeriod, period])

  return { txns, wallets, syncFailed, retry: load }
}

const isSched = (x: Transaction) => x.status === 'planned'

// + for income, − for expenses; transfers stay inside the user's wallets.
function sign(x: Transaction): '+' | '−' | '' {
  return x.type === 'transfer' ? '' : x.type === 'income' ? '+' : '−'
}

function inCategory(x: Transaction, parent: string): boolean {
  return x.category === parent || categoryNode(x.category)?.parentId === parent
}

// "21 DE AGOSTO" / "AUGUST 21" (+ the year when it isn't this one).
function dayLabel(iso: string, today: string): string {
  if (iso === today) return tr('common.today').toUpperCase()
  if (iso === addDays(today, -1)) return tr('common.yesterday').toUpperCase()
  const [y, m, d] = iso.split('-').map(Number)
  const other = String(y) !== today.slice(0, 4)
  const month = MONTHS_LONG[currentLanguage()][m - 1].toUpperCase()
  if (currentLanguage() === 'en') return `${month} ${d}${other ? `, ${y}` : ''}`
  return `${d} DE ${month}${other ? ` DE ${y}` : ''}`
}

// A server timestamp's calendar day on this device.
function localDay(timestamp: string): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// "Foto · 1,2 MB · agregado el 21 ago"
function sizeLabel(bytes: number): string {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`
}

// The mockup's repeatSummary for a Programado series.
function repeatText(series: RecurringSeries, start: string): string {
  const every = tr(`nm.every.${series.interval}` as TranslationKey)
  if (series.occurrences) {
    const end = new Date(`${start}T12:00:00`)
    const k = series.occurrences - 1
    if (series.interval === 'daily') end.setDate(end.getDate() + k)
    else if (series.interval === 'weekly') end.setDate(end.getDate() + 7 * k)
    else if (series.interval === 'monthly') end.setMonth(end.getMonth() + k)
    else end.setFullYear(end.getFullYear() + k)
    const iso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    return fill(tr('nm.repeat.count'), every, series.occurrences, shortDayMonth(start), shortDayMonth(iso))
  }
  if (series.endDate) return fill(tr('nm.repeat.until'), every, shortDayMonth(series.endDate))
  return fill(tr('nm.repeat.never'), every)
}

// Movimientos, per the Web v2 mockup: Programados on top, then the month
// by day with each day's total, filtered by type, category and the header
// search (`?q=`). A row opens the detail with its comprobante.
export default function MovimientosPage() {
  useCategories()
  const { user } = useAuth()
  const principal = user?.principalCurrency ?? 'COP'
  const { hidden } = useHideAmounts()
  const { version, notifyChanged, refresh: refreshAppData } = useAppData()
  const [params, setParams] = useSearchParams()
  const query = (params.get('q') ?? '').trim()
  const [period] = usePeriod()
  const [filter, setFilter] = useState<Filter>('all')
  const [cat, setCat] = useState('')
  const [openId, setOpenId] = useState<string | null>(params.get('tx'))
  const { txns, wallets, syncFailed, retry } = useMovements(period, version)
  const today = todayISO()
  const txIds = useMemo(() => txns?.map((x) => x.id) ?? [], [txns])
  const isFresh = useFreshIds(txIds, txns !== null, period)

  const walletOf = useCallback((id?: string) => wallets?.find((w) => w.id === id), [wallets])
  const walletShort = useCallback((id?: string) => shortWallet(walletOf(id)?.name ?? ''), [walletOf])

  const filtered = useMemo(() => {
    if (!txns) return null
    return txns.filter((x) => {
      if (filter === 'expenses' && x.type !== 'expense') return false
      if (filter === 'income' && x.type !== 'income') return false
      if (filter === 'scheduled' && !isSched(x)) return false
      if (cat && !inCategory(x, cat)) return false
      if (!query) return true
      const label = categoryLabel(x.type === 'transfer' ? TRANSFER : x.category)
      return matchesSearch(`${x.description} ${x.merchant ?? ''} ${x.counterpartyName ?? ''} ${label} ${walletOf(x.accountId)?.name ?? ''}`, query)
    })
  }, [txns, filter, cat, query, walletOf])

  const groups = useMemo(() => {
    if (!filtered) return []
    const out: { key: string; label: string; items: Transaction[] }[] = []
    const sched = filtered.filter(isSched).sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
    if (sched.length) out.push({ key: 'sched', label: tr('mv.scheduled').toUpperCase(), items: sched })
    filtered
      .filter((x) => !isSched(x))
      .sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1))
      .forEach((x) => {
        let g = out.find((y) => y.key === x.date)
        if (!g) out.push((g = { key: x.date, label: dayLabel(x.date, today), items: [] }))
        g.items.push(x)
      })
    return out
  }, [filtered, today])

  // "Gasto · Alimentación" when both kinds are listed.
  const catOptions = useMemo(() => {
    const parents = allCategories().filter((n) => !n.parentId && !n.hidden)
    const both = filter === 'all' || filter === 'scheduled'
    const kinds = filter === 'income' ? [true] : filter === 'expenses' ? [false] : [false, true]
    return kinds.flatMap((income) =>
      parents.filter((n) => n.income === income).map((n) => ({ value: n.id, label: (both ? `${tr(income ? 'nm.type.income' : 'nm.type.expense')} · ` : '') + categoryName(n.id) })),
    )
  }, [filter])

  const toPrincipal = (x: Transaction) => x.amount * referenceRate(x.currency, principal)
  const subtitle = query
    ? fill(tr('mv.results'), filtered?.length ?? 0, query)
    : txns
      ? fill(tr('mv.count'), txns.filter((x) => !isSched(x)).length, txns.filter(isSched).length)
      : ' '
  const open = openId ? txns?.find((x) => x.id === openId) : undefined

  const close = () => {
    setOpenId(null)
    if (params.has('tx')) {
      params.delete('tx')
      setParams(params, { replace: true })
    }
  }
  const changed = () => {
    notifyChanged()
    void refreshAppData()
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 pb-12 pt-6 min-[760px]:px-8 min-[760px]:pt-8">
      {syncFailed && <SyncBanner onRetry={() => void retry()} />}

      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-display-sm font-medium tracking-[-.025em]">{tr('guide.movimientos.label')}</h1>
          <div className="mt-1 text-body-sm text-ink-secondary">{subtitle}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr('mv.type')}>
            {FILTERS.map((key) => (
              <Flat
                key={key}
                role="radio"
                on={filter === key}
                onClick={() => {
                  setFilter(key)
                  setCat('')
                }}
              >
                {tr(`mv.filter.${key}` as TranslationKey)}
              </Flat>
            ))}
          </div>
          <select
            aria-label={tr('bud.category')}
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="ml-auto h-8 min-w-0 max-w-full cursor-pointer rounded-[8px] border border-border-input bg-surface px-2.5 text-label font-semibold text-ink"
          >
            <option value="">{tr('mv.allCategories')}</option>
            {catOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Flat layout: one `surface` card per day, its heading and net total above it. */}
      {!filtered ? (
        <section className="nova-card px-5 py-2">
          <RowSkeletons count={6} box={40} />
        </section>
      ) : groups.length === 0 ? (
        <section className="nova-card px-5 py-[30px] text-center text-body-sm text-ink-secondary">{tr('mv.empty')}</section>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => {
            const unit = 10 ** currencyInfo(principal).decimals
            const raw = g.items.reduce((a, x) => a + (x.type === 'transfer' ? 0 : x.type === 'income' ? 1 : -1) * toPrincipal(x), 0)
            const sum = (Math.sign(raw) * Math.round(Math.abs(raw) * unit)) / unit
            const sched = g.key === 'sched'
            return (
              <section key={g.key} aria-labelledby={`mv-day-${g.key}`}>
                <h2 id={`mv-day-${g.key}`} className={cn('flex items-baseline gap-3 px-1 pb-2 text-overline font-semibold uppercase', sched ? 'text-warning' : 'text-ink-tertiary')}>
                  <span className="min-w-0 flex-1 truncate">{g.label}</span>
                  <Money hidden={hidden} className={cn('flex-none tabular-nums', sched ? 'text-warning' : sum >= 0 ? 'text-positive' : 'text-ink-tertiary')}>
                    {`${sum >= 0 ? '+' : '−'}${formatMoney(Math.abs(sum), principal)}`}
                  </Money>
                </h2>
                <div className="overflow-hidden nova-card">
                  {g.items.map((x, i) => (
                    <MovementRow
                      key={x.id}
                      x={x}
                      last={i === g.items.length - 1}
                      wallet={walletShort(x.accountId)}
                      principal={principal}
                      hidden={hidden}
                      onOpen={() => setOpenId(x.id)}
                      fresh={isFresh(x.id)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {open && (
        <MovementDetail
          key={open.id}
          txn={open}
          wallet={walletOf(open.accountId)}
          walletTo={walletOf(open.transferAccountId)}
          principal={principal}
          hidden={hidden}
          onClose={close}
          onChanged={changed}
        />
      )}
    </div>
  )
}

// ListRow (DESIGN-SYSTEM.md §6.2): icon 40, a one-line title and meta line,
// and an intrinsic-width amount column; at least 56 px tall. The attachment
// and repeat badges and a Programado's `warning` clock sit in the meta line.
function MovementRow({ x, last, wallet, principal, hidden, onOpen, fresh }: { x: Transaction; last: boolean; wallet: string; principal: string; hidden: boolean; onOpen: () => void; fresh: boolean }) {
  const sched = isSched(x)
  const label = categoryLabel(x.type === 'transfer' ? TRANSFER : x.category)
  const sub = `${label} · ${[x.merchant || x.counterpartyName, wallet].filter(Boolean).join(' · ')} · ${sched ? `${shortDayMonth(x.date)} ` : ''}${x.time}`
  const color = x.type === 'transfer' ? 'text-ink' : x.type === 'income' ? 'text-positive' : 'text-negative'
  const title = x.description || label
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-ink hover:bg-surface-sunken', !last && 'border-b border-divider', fresh && 'animate-row-in')}
    >
      <CategoryMark category={x.type === 'transfer' ? TRANSFER : x.category} box={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-title-sm font-semibold" title={title}>{title}</div>
        <div className="flex min-w-0 items-center gap-1.5 text-body-sm text-ink-secondary">
          {sched && (
            <>
              <Icon paths={IC.clock} size={14} color="var(--color-warning)" />
              <span className="sr-only">{tr('mv.scheduledOne')}</span>
            </>
          )}
          <span className="min-w-0 truncate" title={sub}>{sub}</span>
          {x.attachment && <Icon paths={IC.clip} size={14} color="currentColor" />}
          {x.recurringSeriesId && <Icon paths={IC.repeat} size={14} color="currentColor" />}
        </div>
      </div>
      <div className="flex-none whitespace-nowrap pl-2 text-right">
        <Money hidden={hidden} className={cn('block text-amount font-semibold tabular-nums', color)}>
          {`${sign(x)}${formatMoney(x.amount, x.currency)}`}
        </Money>
        {x.currency !== principal && (
          <Money hidden={hidden} className="block text-caption tabular-nums text-ink-tertiary">
            {`≈ ${formatApprox(x.amount * referenceRate(x.currency, principal), principal)}`}
          </Money>
        )}
      </div>
    </button>
  )
}

// What re-creates a deleted movement for "Deshacer".
function snapshot(x: Transaction): NewTransactionInput {
  return {
    accountId: x.accountId,
    transferAccountId: x.transferAccountId,
    description: x.description || categoryLabel(x.type === 'transfer' ? TRANSFER : x.category),
    amount: x.amount,
    currency: x.currency,
    type: x.type,
    status: x.status,
    category: x.type === 'transfer' ? undefined : x.category,
    date: x.date,
    time: x.time,
    customBudgetId: x.customBudgetId,
    counterpartyKind: x.counterpartyKind,
    merchant: x.merchant,
    note: x.note,
    budgetId: x.budgetId,
    goalId: x.goalId,
    loanKind: x.loanKind,
    counterpartyName: x.counterpartyName,
    dueDate: x.dueDate,
  }
}

// The mockup's "Detalle con comprobante": amount and state, the movement's
// fields, the receipt (Ver · Reemplazar · Descargar · Quitar, or attach
// one), and "Eliminar movimiento" (two-step when it matters, else undoable).
function MovementDetail({
  txn,
  wallet,
  walletTo,
  principal,
  hidden,
  onClose,
  onChanged,
}: {
  txn: Transaction
  wallet?: Wallet
  walletTo?: Wallet
  principal: string
  hidden: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const { showToast } = useToast()
  const { budgets } = useAppData()
  const openMovement = useNewMovement()
  const [series, setSeries] = useState<RecurringSeries | null>(null)
  const [product, setProduct] = useState<CatalogProduct | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [viewer, setViewer] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const sched = isSched(txn)
  const transfer = txn.type === 'transfer'
  const label = categoryLabel(transfer ? TRANSFER : txn.category)
  const walletName = shortWallet(wallet?.name ?? '')

  useEffect(() => {
    if (!txn.recurringSeriesId) return
    recurringService.getRecurringSeries().then(
      (all) => setSeries(all.find((s) => s.id === txn.recurringSeriesId) ?? null),
      () => undefined,
    )
  }, [txn.recurringSeriesId])

  useEffect(() => {
    setProduct(null)
    if (txn.productId) void productService.get(txn.productId).then(setProduct)
  }, [txn.productId])

  // The category budget this expense counts toward, if any.
  const budget = txn.type === 'expense' ? budgets.find((b) => b.kind !== 'custom' && !!b.category && inCategory(txn, b.category)) : undefined

  const rate = referenceRate(txn.currency, principal)
  const rows = [
    [tr('mv.row.title'), txn.description || label],
    txn.note ? [tr('mv.row.note'), txn.note] : null,
    [tr('nm.section.when'), `${longDate(txn.date)} · ${txn.time}`],
    [tr('mv.row.wallet'), transfer ? `${walletName} → ${shortWallet(walletTo?.name ?? '')}` : `${walletName} · ${wallet?.currency ?? txn.currency}`],
    txn.type === 'income' && txn.counterpartyName ? [tr('nm.from'), txn.counterpartyName] : null,
    txn.merchant ? [tr('mv.row.merchant'), txn.merchant] : null,
    product ? [tr('mv.row.product'), [product.name, product.brand].filter(Boolean).join(' · ')] : null,
    budget ? [tr('nm.budget'), `${budget.name || categoryName(budget.category)} · ${budget.percentage}%`] : null,
    series ? [tr('mv.row.repeats'), repeatText(series, txn.date)] : null,
  ].filter((r): r is [string, string] => !!r)

  const attach = txn.attachment
  const photo = attach?.kind === 'image'

  const upload = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_ATTACHMENT_BYTES) return showToast(tr('nm.err.fileSize'), 'error')
    try {
      await transactionService.uploadAttachment(txn.id, file)
      showToast(tr('mv.receipt.saved'), 'success')
      onChanged()
    } catch (err) {
      showToast(err instanceof Error ? err.message : tr('mv.receipt.errSave'), 'error')
    }
  }

  const removeAttachment = async () => {
    if (!attach) return
    try {
      const blob = await transactionService.attachmentBlob(txn.id).catch(() => null)
      await transactionService.deleteAttachment(txn.id)
      onChanged()
      showToast(
        tr('mv.receipt.removed'),
        'info',
        blob && blob.size > 0
          ? { label: tr('mv.undo'), onClick: () => void transactionService.uploadAttachment(txn.id, new File([blob], attach.name, { type: attach.mime })).then(onChanged) }
          : undefined,
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : tr('mv.receipt.errRemove'), 'error')
    }
  }

  const download = async () => {
    if (!attach) return
    try {
      const url = URL.createObjectURL(await transactionService.attachmentBlob(txn.id))
      const a = document.createElement('a')
      a.href = url
      a.download = attach.name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      showToast(tr('mv.receipt.errDownload'), 'error')
    }
  }

  const abs = txn.amount * rate
  const significant = abs >= 200_000 || !!attach || !!txn.recurringSeriesId
  const doDelete = async () => {
    try {
      await transactionService.deleteTransaction(txn.id, !!txn.recurringSeriesId)
      onClose()
      onChanged()
      showToast(
        tr('mv.deleted'),
        'info',
        significant ? undefined : { label: tr('mv.undo'), onClick: () => void transactionService.addTransaction(snapshot(txn)).then(onChanged) },
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : tr('mv.errDelete'), 'error')
    }
  }

  return (
    <>
      <V2Modal width={480} onClose={onClose} label={txn.description || label}>
        <div className="flex items-center gap-3">
          <CategoryMark category={transfer ? TRANSFER : txn.category} box={44} />
          <div className="min-w-0 flex-1">
            <div className="text-title-sm font-semibold">{txn.description || label}</div>
            <div className="mt-0.5 text-caption text-ink-secondary">{label}</div>
          </div>
          <button type="button" onClick={onClose} aria-label={tr('common.close')} className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[9px] text-ink-secondary">
            ✕
          </button>
        </div>
        <div>
          <Money
            hidden={hidden}
            className="block text-headline font-semibold tracking-[-.025em]"
            style={{ color: sched || transfer ? 'var(--v2-text)' : txn.type === 'income' ? 'var(--v2-pos)' : 'var(--v2-neg)' }}
          >
            {`${sign(txn)}${formatMoney(txn.amount, txn.currency)}`}
          </Money>
          {txn.currency !== principal && (
            <Money hidden={hidden} className="mt-0.5 block text-caption text-ink-secondary">
              {`≈ ${formatMoney(abs, principal)} ${principal} · 1 ${txn.currency} = ${formatMoney(rate, principal)}`}
            </Money>
          )}
        </div>
        <span
          className={cn(
            'flex items-center gap-1 self-start rounded-full px-2.5 py-1 text-caption font-semibold',
            sched ? 'bg-warning-soft text-warning' : 'bg-positive-soft text-positive',
          )}
        >
          {/* The state carries an icon, not just the tone. */}
          <StrokeIcon paths={sched ? ICON_PATHS.clock : ICON_PATHS.check} size={14} />
          {tr(sched ? 'mv.state.scheduled' : 'mv.state.recorded')}
        </span>
        <div className="flex flex-col">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-divider py-2.5 text-body-sm">
              <span className="whitespace-nowrap text-ink-secondary">{k}</span>
              <span className="min-w-0 text-right font-numeric font-semibold">{v}</span>
            </div>
          ))}
        </div>
        <div className="text-body-sm font-semibold">{tr('mv.receipt')}</div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          aria-label={tr('mv.receipt.file')}
          onChange={(e) => {
            void upload(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {attach ? (
          <div className="flex items-center gap-3.5 rounded-[14px] border border-border p-2.5">
            <button
              type="button"
              onClick={() => setViewer(true)}
              aria-label={tr('mv.receipt.view')}
              className="flex h-[78px] w-[62px] flex-none cursor-pointer items-center justify-center rounded-[10px] border border-border-input"
              style={{ background: photo ? 'repeating-linear-gradient(135deg,var(--v2-surface2) 0 8px,var(--v2-subtle) 8px 16px)' : 'var(--v2-neg-soft)' }}
            >
              <Icon paths={photo ? IC.image : IC.file} size={20} color={photo ? 'var(--v2-muted)' : 'var(--v2-neg)'} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-body-sm font-semibold">{attach.name}</div>
              <div className="mt-0.5 text-caption text-ink-secondary">{fill(tr('mv.receipt.meta'), photo ? tr('nm.photo') : 'PDF', sizeLabel(attach.size), shortDayMonth(localDay(attach.createdAt)))}</div>
              <div className="-ml-2 mt-1 flex flex-wrap text-label font-semibold">
                <button type="button" onClick={() => setViewer(true)} className="flex min-h-8 cursor-pointer items-center rounded-[8px] px-2 text-link hover:bg-surface-sunken">
                  {tr('mv.receipt.see')}
                </button>
                <button type="button" onClick={() => fileRef.current?.click()} className="flex min-h-8 cursor-pointer items-center rounded-[8px] px-2 text-link hover:bg-surface-sunken">
                  {tr('mv.receipt.replace')}
                </button>
                <button type="button" onClick={() => void download()} className="flex min-h-8 cursor-pointer items-center rounded-[8px] px-2 text-link hover:bg-surface-sunken">
                  {tr('mv.receipt.download')}
                </button>
                <button type="button" onClick={() => void removeAttachment()} className="flex min-h-8 cursor-pointer items-center rounded-[8px] px-2 text-negative hover:bg-negative-soft">
                  {tr('mv.receipt.remove')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              void upload(e.dataTransfer.files[0])
            }}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-border-input p-3.5 text-body-sm font-semibold text-link"
          >
            <Icon paths={IC.clip} size={15} color="var(--v2-accent2)" />
            {tr('mv.receipt.attach')}
          </button>
        )}
        <ModalFooter left={<DangerLink onClick={() => (significant ? setConfirm(true) : void doDelete())}>{tr('mv.delete')}</DangerLink>}>
          {/* Not in the web mockup: editing a movement needs a way in (parity with Android). */}
          {openMovement && !txn.loanKind && (
            <CancelButton
              onClick={() => {
                onClose()
                openMovement(txn)
              }}
            >
              {tr('mv.edit')}
            </CancelButton>
          )}
          <button type="button" onClick={onClose} className={primaryButtonClass}>
            {tr('common.close')}
          </button>
        </ModalFooter>
      </V2Modal>

      {viewer && attach && <ReceiptViewer txnId={txn.id} name={attach.name} mime={attach.mime} photo={photo} onClose={() => setViewer(false)} />}

      {confirm && (
        <ConfirmDialog
          title={fill(tr('loan.delete.title'), txn.description || label)}
          lines={[
            `${sign(txn)}${formatMoney(txn.amount, txn.currency)} · ${longDate(txn.date)} · ${walletName}`,
            attach ? fill(tr('mv.delete.receipt'), attach.name) : null,
            txn.recurringSeriesId ? tr('mv.delete.repeats') : null,
            fill(tr('mv.delete.balance'), walletName),
          ].filter((l): l is string => !!l)}
          ack={tr(attach ? 'mv.delete.ackReceipt' : 'mv.delete.ack')}
          cta={tr('mv.delete')}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false)
            void doDelete()
          }}
        />
      )}
    </>
  )
}

// Full-screen receipt: the file itself, or the mockup's placeholder when
// it can't be shown.
function ReceiptViewer({ txnId, name, mime, photo, onClose }: { txnId: string; name: string; mime: string; photo: boolean; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let revoke: string | null = null
    transactionService.attachmentBlob(txnId).then(
      (blob) => {
        if (!blob.size) return
        revoke = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: mime }))
        setUrl(revoke)
      },
      () => undefined,
    )
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [txnId, mime, onClose])

  return createPortal(
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={name} className="fixed inset-0 z-[55] flex flex-col items-center justify-center gap-4 bg-[rgba(5,5,7,.92)] p-[30px] [line-height:normal]">
      <div className="text-body-sm font-semibold text-white">{name}</div>
      {url && photo ? (
        <img src={url} alt={name} className="max-h-[75vh] w-[420px] max-w-[90vw] rounded-[14px] border border-white/[.14] object-contain" />
      ) : url ? (
        <object data={url} type={mime} aria-label={name} className="aspect-[3/4] w-[420px] max-w-[90vw] rounded-[14px] border border-white/[.14] bg-white" />
      ) : (
        <div
          className="flex aspect-[3/4] w-[420px] max-w-[90vw] flex-col items-center justify-center gap-2.5 rounded-[14px] border border-white/[.14] text-body-sm text-[#a8a8b8]"
          style={{ background: 'repeating-linear-gradient(135deg,#13131d 0 10px,#16161f 10px 20px)' }}
        >
          <Icon paths={photo ? IC.image : IC.file} size={20} color={photo ? 'var(--v2-muted)' : 'var(--v2-neg)'} />
          <span>{tr('mv.receipt.preview')}</span>
        </div>
      )}
      <div className="text-caption text-[#a8a8b8]">{tr('mv.receipt.clickClose')}</div>
    </div>,
    document.body,
  )
}
