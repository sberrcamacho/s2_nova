import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { CategoryMark } from '@/components/v2/CategoryMark'
import { ConfirmDialog, DangerLink, Flat, IC, Icon, ModalFooter, V2Modal } from '@/components/v2/Kit'
import { Money } from '@/components/v2/Money'
import { RowSkeletons, SyncBanner } from '@/components/v2/Rows'
import { primaryButtonClass } from '@/components/panels/SidePanel'
import { accountService } from '@/services/accountService'
import { recurringService } from '@/services/recurringService'
import { transactionService } from '@/services/transactionService'
import { useAppData } from '@/state/AppDataContext'
import { useAuth } from '@/state/AuthContext'
import { useHideAmounts } from '@/state/useHideAmounts'
import { useToast } from '@/state/ToastContext'
import { TRANSFER, allCategories, categoryLabel, categoryName, categoryNode, useCategories } from '@/lib/backendCategories'
import { currencyInfo, formatMoney, referenceRate } from '@/lib/currency'
import { addDays } from '@/lib/inicio'
import { shortWallet } from '@/lib/movimientos'
import { longDate, shortDayMonth } from '@/lib/planCopy'
import { todayISO } from '@/lib/date'
import { usePeriod } from '@/dashboard/usePeriod'
import { cn } from '@/lib/cn'
import type { NewTransactionInput, RecurringSeries, Transaction, Wallet } from '@/types'

type Filter = 'all' | 'expenses' | 'income' | 'scheduled'

const FILTERS: [Filter, string][] = [
  ['all', 'Todos'],
  ['expenses', 'Gastos'],
  ['income', 'Ingresos'],
  ['scheduled', 'Programados'],
]

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

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']

function dayLabel(iso: string, today: string): string {
  if (iso === today) return 'HOY'
  if (iso === addDays(today, -1)) return 'AYER'
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} DE ${MONTHS[m - 1]}${String(y) === today.slice(0, 4) ? '' : ` DE ${y}`}`
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
  const unit = { daily: 'día', weekly: 'semana', monthly: 'mes', yearly: 'año' }[series.interval]
  const every = `Cada ${unit}`
  if (series.occurrences) {
    const end = new Date(`${start}T12:00:00`)
    const k = series.occurrences - 1
    if (series.interval === 'daily') end.setDate(end.getDate() + k)
    else if (series.interval === 'weekly') end.setDate(end.getDate() + 7 * k)
    else if (series.interval === 'monthly') end.setMonth(end.getMonth() + k)
    else end.setFullYear(end.getFullYear() + k)
    const iso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    return `${every} × ${series.occurrences} · del ${shortDayMonth(start)} al ${shortDayMonth(iso)}`
  }
  if (series.endDate) return `${every} · hasta el ${shortDayMonth(series.endDate)}`
  return `${every} · sin fecha de fin`
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

  const walletOf = useCallback((id?: string) => wallets?.find((w) => w.id === id), [wallets])
  const walletShort = useCallback((id?: string) => shortWallet(walletOf(id)?.name ?? ''), [walletOf])

  const filtered = useMemo(() => {
    if (!txns) return null
    const q = query.toLowerCase()
    return txns.filter((x) => {
      if (filter === 'expenses' && x.type !== 'expense') return false
      if (filter === 'income' && x.type !== 'income') return false
      if (filter === 'scheduled' && !isSched(x)) return false
      if (cat && !inCategory(x, cat)) return false
      if (!q) return true
      const label = x.type === 'transfer' ? 'Transferencia' : categoryLabel(x.category)
      return `${x.description} ${x.merchant ?? ''} ${x.counterpartyName ?? ''} ${label} ${walletOf(x.accountId)?.name ?? ''}`.toLowerCase().includes(q)
    })
  }, [txns, filter, cat, query, walletOf])

  const groups = useMemo(() => {
    if (!filtered) return []
    const out: { key: string; label: string; items: Transaction[] }[] = []
    const sched = filtered.filter(isSched).sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
    if (sched.length) out.push({ key: 'sched', label: 'PROGRAMADOS', items: sched })
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
      parents.filter((n) => n.income === income).map((n) => ({ value: n.id, label: (both ? (income ? 'Ingreso · ' : 'Gasto · ') : '') + n.name })),
    )
  }, [filter])

  const toPrincipal = (x: Transaction) => x.amount * referenceRate(x.currency, principal)
  const subtitle = query
    ? `${filtered?.length ?? 0} resultados para “${query}”`
    : txns
      ? `${txns.filter((x) => !isSched(x)).length} movimientos · ${txns.filter(isSched).length} programados`
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
    <div className="flex flex-col gap-[18px] px-4 pb-10 pt-[26px] min-[760px]:px-7">
      {syncFailed && <SyncBanner onRetry={() => void retry()} />}

      <div className="flex flex-col gap-3.5">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-[-.025em]">Movimientos</h1>
          <div className="mt-1 text-[12.5px] text-v2-dim">{subtitle}</div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo">
            {FILTERS.map(([key, label]) => (
              <Flat
                key={key}
                on={filter === key}
                onClick={() => {
                  setFilter(key)
                  setCat('')
                }}
              >
                {label}
              </Flat>
            ))}
          </div>
          <select
            aria-label="Categoría"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="ml-auto h-[34px] cursor-pointer rounded-[10px] border border-v2-line2 bg-v2-surface px-2.5 text-[12px] font-bold text-v2-text outline-none"
          >
            <option value="">Todas las categorías</option>
            {catOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="flex flex-col rounded-[16px] border border-v2-line bg-v2-surface px-5 py-2">
        {!filtered ? (
          <RowSkeletons count={6} box={36} />
        ) : groups.length === 0 ? (
          <div className="py-[30px] text-center text-[12.5px] text-v2-dim">Sin movimientos para este filtro.</div>
        ) : (
          groups.map((g, gi) => {
            const unit = 10 ** currencyInfo(principal).decimals
            const raw = g.items.reduce((a, x) => a + (x.type === 'transfer' ? 0 : x.type === 'income' ? 1 : -1) * toPrincipal(x), 0)
            const sum = (Math.sign(raw) * Math.round(Math.abs(raw) * unit)) / unit
            const sched = g.key === 'sched'
            return (
              <div key={g.key}>
                <div className={cn('pb-1.5 text-[10.5px] font-bold tracking-[.1em]', gi === 0 ? 'pt-3' : 'pt-[22px]', sched ? 'text-v2-warn' : 'text-v2-dim')}>
                  {`${g.label} · `}
                  <Money hidden={hidden} style={{ color: sched ? 'var(--v2-warn)' : sum >= 0 ? 'var(--v2-pos)' : 'var(--v2-dim)' }}>
                    {`${sum >= 0 ? '+' : '−'}${formatMoney(Math.abs(sum), principal)}`}
                  </Money>
                </div>
                {g.items.map((x, i) => (
                  <MovementRow
                    key={x.id}
                    x={x}
                    last={i === g.items.length - 1}
                    wallet={walletShort(x.accountId)}
                    principal={principal}
                    hidden={hidden}
                    onOpen={() => setOpenId(x.id)}
                  />
                ))}
              </div>
            )
          })
        )}
      </section>

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

function MovementRow({ x, last, wallet, principal, hidden, onOpen }: { x: Transaction; last: boolean; wallet: string; principal: string; hidden: boolean; onOpen: () => void }) {
  const sched = isSched(x)
  const label = x.type === 'transfer' ? 'Transferencia' : categoryLabel(x.category)
  const sub = `${label} · ${[x.merchant || x.counterpartyName, wallet].filter(Boolean).join(' · ')} · ${sched ? `${shortDayMonth(x.date)} ` : ''}${x.time}`
  const color = sched || x.type === 'transfer' ? 'var(--v2-muted)' : x.type === 'income' ? 'var(--v2-pos)' : 'var(--v2-neg)'
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('mx-[-10px] flex w-[calc(100%+20px)] cursor-pointer items-center gap-3.5 rounded-[12px] px-2.5 py-[13px] text-left text-v2-text hover:bg-v2-subtle', !last && 'border-b border-v2-subtle')}
    >
      <CategoryMark category={x.type === 'transfer' ? TRANSFER : x.category} box={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-[7px] text-[12.5px] font-bold">
          <span className="min-w-0 flex-[0_1_auto] truncate">{x.description || label}</span>
          {x.attachment && <Icon paths={IC.clip} size={13} color="var(--v2-dim)" />}
          {x.recurringSeriesId && <Icon paths={IC.repeat} size={13} color="var(--v2-dim)" />}
          {sched && <span className="flex-none rounded-full bg-[rgba(240,180,41,.14)] px-[7px] py-0.5 text-[10px] font-extrabold text-v2-warn">Programado</span>}
        </div>
        <div className="mt-[3px] truncate text-[11px] text-v2-dim">{sub}</div>
      </div>
      <div className="flex-none whitespace-nowrap text-right">
        <Money hidden={hidden} className="block text-[13px] font-extrabold" style={{ color }}>
          {`${sign(x)}${formatMoney(x.amount, x.currency)}`}
        </Money>
        {x.currency !== principal && (
          <Money hidden={hidden} className="mt-0.5 block text-[10.5px] text-v2-dim">
            {`≈ ${formatMoney(x.amount * referenceRate(x.currency, principal), principal)}`}
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
    description: x.description,
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
  const [series, setSeries] = useState<RecurringSeries | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [viewer, setViewer] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const sched = isSched(txn)
  const transfer = txn.type === 'transfer'
  const label = transfer ? 'Transferencia' : categoryLabel(txn.category)
  const walletName = shortWallet(wallet?.name ?? '')

  useEffect(() => {
    if (!txn.recurringSeriesId) return
    recurringService.getRecurringSeries().then(
      (all) => setSeries(all.find((s) => s.id === txn.recurringSeriesId) ?? null),
      () => undefined,
    )
  }, [txn.recurringSeriesId])

  // The category budget this expense counts toward, if any.
  const budget = txn.type === 'expense' ? budgets.find((b) => b.kind !== 'custom' && !!b.category && inCategory(txn, b.category)) : undefined

  const rate = referenceRate(txn.currency, principal)
  const rows = [
    ['Título', txn.description || label],
    txn.note ? ['Nota', txn.note] : null,
    ['Fecha y hora', `${longDate(txn.date)} · ${txn.time}`],
    ['Billetera', transfer ? `${walletName} → ${shortWallet(walletTo?.name ?? '')}` : `${walletName} · ${wallet?.currency ?? txn.currency}`],
    txn.type === 'income' && txn.counterpartyName ? ['De', txn.counterpartyName] : null,
    txn.merchant ? ['Comercio', txn.merchant] : null,
    budget ? ['Presupuesto', `${budget.name || categoryName(budget.category)} · ${budget.percentage}%`] : null,
    series ? ['Se repite', repeatText(series, txn.date)] : null,
  ].filter((r): r is [string, string] => !!r)

  const attach = txn.attachment
  const photo = attach?.kind === 'image'

  const upload = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_ATTACHMENT_BYTES) return showToast('El archivo supera 10 MB.', 'error')
    try {
      await transactionService.uploadAttachment(txn.id, file)
      showToast('Comprobante guardado en el movimiento', 'success')
      onChanged()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo guardar el comprobante.', 'error')
    }
  }

  const removeAttachment = async () => {
    if (!attach) return
    try {
      const blob = await transactionService.attachmentBlob(txn.id).catch(() => null)
      await transactionService.deleteAttachment(txn.id)
      onChanged()
      showToast(
        'Comprobante quitado',
        'info',
        blob && blob.size > 0
          ? { label: 'Deshacer', onClick: () => void transactionService.uploadAttachment(txn.id, new File([blob], attach.name, { type: attach.mime })).then(onChanged) }
          : undefined,
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo quitar el comprobante.', 'error')
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
      showToast('No se pudo descargar el comprobante.', 'error')
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
        'Movimiento eliminado',
        'info',
        significant ? undefined : { label: 'Deshacer', onClick: () => void transactionService.addTransaction(snapshot(txn)).then(onChanged) },
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo eliminar el movimiento.', 'error')
    }
  }

  return (
    <>
      <V2Modal width={480} onClose={onClose} label={txn.description || label}>
        <div className="flex items-center gap-3">
          <CategoryMark category={transfer ? TRANSFER : txn.category} box={44} />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-extrabold">{txn.description || label}</div>
            <div className="mt-0.5 text-[11.5px] text-v2-dim">{label}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[9px] text-v2-dim">
            ✕
          </button>
        </div>
        <div>
          <Money
            hidden={hidden}
            className="block text-[28px] font-extrabold tracking-[-.025em]"
            style={{ color: sched || transfer ? 'var(--v2-text)' : txn.type === 'income' ? 'var(--v2-pos)' : 'var(--v2-neg)' }}
          >
            {`${sign(txn)}${formatMoney(txn.amount, txn.currency)}`}
          </Money>
          {txn.currency !== principal && (
            <Money hidden={hidden} className="mt-0.5 block text-[11.5px] text-v2-dim">
              {`≈ ${formatMoney(abs, principal)} ${principal} · 1 ${txn.currency} = ${formatMoney(rate, principal)}`}
            </Money>
          )}
        </div>
        <span
          className={cn(
            'self-start rounded-full px-2.5 py-1 text-[11px] font-extrabold',
            sched ? 'bg-[rgba(240,180,41,.16)] text-v2-warn' : 'bg-[rgba(50,201,138,.14)] text-v2-pos',
          )}
        >
          {sched ? 'Programado · no afecta el saldo todavía' : 'Registrado'}
        </span>
        <div className="flex flex-col">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-v2-subtle py-2.5 text-[12.5px]">
              <span className="whitespace-nowrap text-v2-dim">{k}</span>
              <span className="min-w-0 text-right font-numeric font-bold">{v}</span>
            </div>
          ))}
        </div>
        <div className="text-[13px] font-extrabold">Comprobante</div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          aria-label="Archivo del comprobante"
          onChange={(e) => {
            void upload(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {attach ? (
          <div className="flex items-center gap-3.5 rounded-[14px] border border-v2-line p-2.5">
            <button
              type="button"
              onClick={() => setViewer(true)}
              aria-label="Ver comprobante"
              className="flex h-[78px] w-[62px] flex-none cursor-pointer items-center justify-center rounded-[10px] border border-v2-line2"
              style={{ background: photo ? 'repeating-linear-gradient(135deg,var(--v2-surface2) 0 8px,var(--v2-subtle) 8px 16px)' : 'var(--v2-neg-soft)' }}
            >
              <Icon paths={photo ? IC.image : IC.file} size={20} color={photo ? 'var(--v2-muted)' : 'var(--v2-neg)'} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-bold">{attach.name}</div>
              <div className="mt-0.5 text-[11px] text-v2-dim">{`${photo ? 'Foto' : 'PDF'} · ${sizeLabel(attach.size)} · agregado el ${shortDayMonth(localDay(attach.createdAt))}`}</div>
              <div className="mt-[9px] flex gap-3.5 text-[12px] font-extrabold">
                <button type="button" onClick={() => setViewer(true)} className="cursor-pointer text-v2-accent2">
                  Ver
                </button>
                <button type="button" onClick={() => fileRef.current?.click()} className="cursor-pointer text-v2-accent2">
                  Reemplazar
                </button>
                <button type="button" onClick={() => void download()} className="cursor-pointer text-v2-accent2">
                  Descargar
                </button>
                <button type="button" onClick={() => void removeAttachment()} className="cursor-pointer text-v2-neg">
                  Quitar
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
            className="flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-v2-line2 p-3.5 text-[12.5px] font-extrabold text-v2-accent2"
          >
            <Icon paths={IC.clip} size={15} color="var(--v2-accent2)" />
            Adjuntar recibo o factura · o arrástralo aquí
          </button>
        )}
        <ModalFooter left={<DangerLink onClick={() => (significant ? setConfirm(true) : void doDelete())}>Eliminar movimiento</DangerLink>}>
          <button type="button" onClick={onClose} className={primaryButtonClass}>
            Cerrar
          </button>
        </ModalFooter>
      </V2Modal>

      {viewer && attach && <ReceiptViewer txnId={txn.id} name={attach.name} mime={attach.mime} photo={photo} onClose={() => setViewer(false)} />}

      {confirm && (
        <ConfirmDialog
          title={`Eliminar “${txn.description || label}”`}
          lines={[
            `${sign(txn)}${formatMoney(txn.amount, txn.currency)} · ${longDate(txn.date)} · ${walletName}`,
            attach ? `Su comprobante: ${attach.name}` : null,
            txn.recurringSeriesId ? 'Las repeticiones futuras de este movimiento' : null,
            `El saldo de ${walletName} y tus presupuestos se recalculan`,
          ].filter((l): l is string => !!l)}
          ack={`Entiendo que el movimiento${attach ? ' y su comprobante se eliminan' : ' se elimina'} para siempre.`}
          cta="Eliminar movimiento"
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
      <div className="text-[13px] font-bold text-white">{name}</div>
      {url && photo ? (
        <img src={url} alt={name} className="max-h-[75vh] w-[420px] max-w-[90vw] rounded-[14px] border border-white/[.14] object-contain" />
      ) : url ? (
        <object data={url} type={mime} aria-label={name} className="aspect-[3/4] w-[420px] max-w-[90vw] rounded-[14px] border border-white/[.14] bg-white" />
      ) : (
        <div
          className="flex aspect-[3/4] w-[420px] max-w-[90vw] flex-col items-center justify-center gap-2.5 rounded-[14px] border border-white/[.14] text-[12px] text-[#a8a8b8]"
          style={{ background: 'repeating-linear-gradient(135deg,#13131d 0 10px,#16161f 10px 20px)' }}
        >
          <Icon paths={photo ? IC.image : IC.file} size={20} color={photo ? 'var(--v2-muted)' : 'var(--v2-neg)'} />
          <span>Vista previa del comprobante</span>
        </div>
      )}
      <div className="text-[11.5px] text-[#a8a8b8]">Clic en cualquier lugar para cerrar</div>
    </div>,
    document.body,
  )
}
