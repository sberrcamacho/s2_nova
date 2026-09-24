import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CategoryMark } from '@/components/v2/CategoryMark'
import { DetailDialog } from '@/components/v2/DetailDialog'
import { Money } from '@/components/v2/Money'
import { RowButton, RowSkeletons, SyncBanner } from '@/components/v2/Rows'
import { primaryButtonClass } from '@/components/panels/SidePanel'
import { accountService } from '@/services/accountService'
import { transactionService } from '@/services/transactionService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useHideAmounts } from '@/state/useHideAmounts'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import { fill, monthYear, shortDate } from '@/lib/inicio'
import { filterMovements, shortWallet, type MovementFilter } from '@/lib/movimientos'
import { usePeriod } from '@/dashboard/usePeriod'
import { cn } from '@/lib/cn'
import type { Transaction, Wallet } from '@/types'

const FILTERS: [MovementFilter, 'mov.filter.all' | 'mov.filter.expenses' | 'mov.filter.income'][] = [
  ['all', 'mov.filter.all'],
  ['expenses', 'mov.filter.expenses'],
  ['income', 'mov.filter.income'],
]

function useMonthData(period: string, version: number) {
  const [txns, setTxns] = useState<Transaction[] | null>(null)
  const [wallets, setWallets] = useState<Wallet[] | null>(null)
  const [syncFailed, setSyncFailed] = useState(false)
  const [loadedPeriod, setLoadedPeriod] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [rows, accounts] = await Promise.allSettled([transactionService.getMonth(period), accountService.getWallets()])
    if (rows.status === 'fulfilled') {
      setTxns(rows.value)
      setLoadedPeriod(period)
    }
    if (accounts.status === 'fulfilled') setWallets(accounts.value)
    setSyncFailed(rows.status === 'rejected' || accounts.status === 'rejected')
  }, [period])

  useEffect(() => {
    void load()
  }, [load, version])

  // A different month's rows never stand in for the selected one.
  return { txns: loadedPeriod === period ? txns : null, wallets, syncFailed, retry: load }
}

// Movimientos, per the Web v2 mockup: the selected month's movements in
// one card, filtered by type and by the header search (`?q=`).
export default function MovimientosPage() {
  const { t, tCategory, language } = useTranslation()
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const { version, notifyChanged, refresh: refreshAppData } = useAppData()
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''
  const [period] = usePeriod()
  const [filter, setFilter] = useState<MovementFilter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const { txns, wallets, syncFailed, retry } = useMonthData(period, version)

  const walletName = useCallback((id?: string) => wallets?.find((w) => w.id === id)?.name ?? '', [wallets])
  const filtered = useMemo(
    () =>
      txns
        ? filterMovements(txns, filter, query, {
            category: (x) => tCategory(x.category),
            wallet: (x) => `${walletName(x.accountId)} ${walletName(x.transferAccountId)}`,
          })
        : null,
    [txns, filter, query, tCategory, walletName],
  )

  const q = query.trim()
  const count = filtered?.length ?? 0
  const subtitle = q
    ? count === 1
      ? fill(t('mov.resultsOne'), q)
      : fill(t('mov.resultsMany'), count, q)
    : fill(t(count === 1 ? 'mov.countOne' : 'mov.countMany'), monthYear(period, language), count)
  const open = openId ? txns?.find((x) => x.id === openId) : undefined

  return (
    <div className="flex flex-col gap-[18px] px-4 pb-10 pt-[26px] min-[760px]:px-7">
      {syncFailed && <SyncBanner onRetry={() => void retry()} />}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-[-.025em]">{t('mov.title')}</h1>
          <div className="mt-[3px] text-[12.5px] text-v2-dim">{filtered ? subtitle : ' '}</div>
        </div>
        <div className="flex gap-1.5" role="radiogroup" aria-label={t('mov.type')}>
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                'cursor-pointer rounded-[9px] border px-[13px] py-[7px] text-[11.5px] font-bold',
                filter === key ? 'border-v2-accent bg-v2-accent text-white' : 'border-v2-line bg-v2-surface text-v2-dim',
              )}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </div>

      <section className="flex flex-col rounded-[16px] border border-v2-line bg-v2-surface px-5 py-2">
        {!filtered ? (
          <RowSkeletons count={6} box={38} />
        ) : filtered.length === 0 ? (
          <div className="py-[30px] text-center text-[12.5px] text-v2-dim">
            {q ? t('mov.emptySearch') : fill(t('mov.emptyPeriod'), monthYear(period, language).toLowerCase())}
          </div>
        ) : (
          filtered.map((x, i, arr) => (
            <RowButton key={x.id} last={i === arr.length - 1} onClick={() => setOpenId(x.id)}>
              <CategoryMark category={x.category} box={38} />
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-[12.5px] font-bold">{x.description}</div>
                <div className="truncate text-[11px] text-v2-dim">
                  {[x.merchant || tCategory(x.category), shortDate(x.date, language), shortWallet(walletName(x.accountId))].filter(Boolean).join(' · ')}
                </div>
              </div>
              <Money hidden={hidden} className="flex-none text-[13px] font-extrabold" style={{ color: amountColor(x) }}>
                {signedAmount(x, format)}
              </Money>
            </RowButton>
          ))
        )}
      </section>

      {open && (
        <MovementDialog
          txn={open}
          walletName={walletName}
          hidden={hidden}
          onClose={() => setOpenId(null)}
          onDeleted={() => {
            setOpenId(null)
            notifyChanged()
            void refreshAppData()
          }}
        />
      )}
    </div>
  )
}

function amountColor(x: Transaction): string {
  if (x.type === 'transfer') return 'var(--v2-text)'
  return x.type === 'income' ? 'var(--v2-pos)' : 'var(--v2-neg)'
}

// Transfers stay inside the user's own wallets, so they carry no sign.
function signedAmount(x: Transaction, format: (v: number) => string): string {
  if (x.type === 'transfer') return format(x.amount)
  return `${x.type === 'income' ? '+' : '−'}${format(x.amount)}`
}

// The mockup's movement modal (kind "txn"): date, category, wallet and
// type, with "Eliminar" and "Cerrar". Deleting goes through the backend,
// which reverses the movement's balance effect.
function MovementDialog({
  txn,
  walletName,
  hidden,
  onClose,
  onDeleted,
}: {
  txn: Transaction
  walletName: (id?: string) => string
  hidden: boolean
  onClose: () => void
  onDeleted: () => void
}) {
  const { t, tCategory, language } = useTranslation()
  const { format } = useCurrency()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      await transactionService.deleteTransaction(txn.id)
      showToast(t('mov.deleted'), 'success')
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inicio.syncError'))
      setBusy(false)
    }
  }

  const wallet =
    txn.type === 'transfer'
      ? `${shortWallet(walletName(txn.accountId))} → ${shortWallet(walletName(txn.transferAccountId))}`
      : shortWallet(walletName(txn.accountId))
  const rows: [string, string][] = [
    [t('mov.date'), `${shortDate(txn.date, language)} ${txn.date.slice(0, 4)}`],
    [t('mov.category'), tCategory(txn.category)],
    [t('mov.wallet'), wallet],
    [t('mov.type'), t(`mov.type.${txn.type}`)],
  ]

  return (
    <DetailDialog
      title={txn.description}
      sub={txn.merchant || tCategory(txn.category)}
      chip={<CategoryMark category={txn.category} box={40} />}
      amount={
        <Money hidden={hidden} className="text-[30px] font-extrabold tracking-[-.02em]" style={{ color: amountColor(txn) }}>
          {signedAmount(txn, format)}
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
            onClick={() => void remove()}
            className="cursor-pointer rounded-[10px] border border-[rgba(255,98,98,.35)] px-4 py-2.5 text-[12.5px] font-bold text-v2-neg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('mov.delete')}
          </button>
          <button type="button" onClick={onClose} className={primaryButtonClass}>
            {t('common.close')}
          </button>
        </>
      }
    />
  )
}
