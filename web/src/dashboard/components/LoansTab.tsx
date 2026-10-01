import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CategoryMark } from '@/components/v2/CategoryMark'
import { Money } from '@/components/v2/Money'
import { AmountField, CancelButton, ErrorBox, Label, flatClass } from '@/components/v2/Kit'
import { ICON_PATHS, StrokeIcon } from '@/components/v2/icons'
import { cn } from '@/lib/cn'
import { LoanModal } from '@/dashboard/components/planes/LoanModal'
import { accountService } from '@/services/accountService'
import { transactionService } from '@/services/transactionService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useHideAmounts } from '@/state/useHideAmounts'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import { todayISO } from '@/lib/date'
import { evalExpr, numStr } from '@/lib/nuevoMovimiento'
import { fill, shortDate } from '@/lib/inicio'
import { shortWallet } from '@/lib/movimientos'
import type { LoanKind, Transaction, Wallet } from '@/types'

// Planes › Préstamos (Web v2 mockup `isLoans`). A loan is a LENT/BORROWED
// transaction; its pending balance is the server's `outstanding`, and each
// abono is a transaction whose parentLoanId points back at it. "Editar" and
// the header's "Registrar préstamo/deuda" (PlanesPage) open LoanModal.
export function LoansTab({ side, onSide, adding, onAddingDone }: { side: LoanKind; onSide: (side: LoanKind) => void; adding: boolean; onAddingDone: () => void }) {
  const { t, language } = useTranslation()
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const { transactions, refresh: refreshAppData, notifyChanged } = useAppData()
  const [loans, setLoans] = useState<Transaction[] | null>(null)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [paying, setPaying] = useState<Transaction | null>(null)
  const [editing, setEditing] = useState<Transaction | 'new' | null>(null)

  const load = useCallback(async () => {
    const [list, walletList] = await Promise.all([transactionService.getLoans(), accountService.getWallets()])
    setLoans(list.filter((l) => (l.status ?? 'completed') === 'completed'))
    setWallets(walletList)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const walletName = (id: string) => shortWallet(wallets.find((w) => w.id === id)?.name ?? '')
  const isLent = side === 'lent'
  const sideLoans = (loans ?? []).filter((l) => l.loanKind === side)
  const outOf = (l: Transaction) => l.outstanding ?? 0
  const paidOf = (l: Transaction) => l.amount - outOf(l)
  const nextSide = sideLoans.filter((l) => outOf(l) > 0 && l.dueDate).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))[0]

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {(['lent', 'borrowed'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={side === s} onClick={() => onSide(s)} className={flatClass(side === s)}>
              {t(s === 'lent' ? 'loans.lent' : 'loans.borrowed')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[760px]:grid-cols-3">
        <SummaryCard label={t(isLent ? 'loans.pendingLent' : 'loans.pendingBorrowed')}>
          <Money hidden={hidden} className="mt-1 block text-headline font-bold tabular-nums">
            {format(sideLoans.reduce((s, l) => s + outOf(l), 0))}
          </Money>
        </SummaryCard>
        <SummaryCard label={t(isLent ? 'loans.paidLent' : 'loans.paidBorrowed')}>
          <Money hidden={hidden} className="mt-1 block text-headline font-bold tabular-nums">
            {format(sideLoans.reduce((s, l) => s + paidOf(l), 0))}
          </Money>
        </SummaryCard>
        <SummaryCard label={t('loans.nextDue')}>
          <div className="mt-2 text-title-sm font-semibold">
            {nextSide ? `${nextSide.counterpartyName ?? t('loans.unknownPerson')} · ${shortDate(nextSide.dueDate!, language)}` : t('loans.noDue')}
          </div>
        </SummaryCard>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-2">
        {sideLoans.map((l) => {
          const out = outOf(l)
          const paid = paidOf(l)
          const done = out === 0
          const pct = l.amount > 0 ? Math.round((paid / l.amount) * 100) : 0
          const payments = transactions.filter((x) => x.parentLoanId === l.id).sort((a, b) => (a.date < b.date ? -1 : 1))
          const meta =
            fill(t(isLent ? 'loans.metaLent' : 'loans.metaBorrowed'), walletName(l.accountId), shortDate(l.date, language)) +
            (l.dueDate ? fill(t('loans.metaDue'), shortDate(l.dueDate, language)) : '')
          return (
            <div key={l.id} className="flex flex-col gap-3.5 rounded-[16px] border border-border bg-surface p-5 text-ink">
              <div className="flex items-center gap-3">
                <CategoryMark category="other" box={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-title-sm font-semibold" title={l.counterpartyName ?? undefined}>{l.counterpartyName ?? t('loans.unknownPerson')}</div>
                  <div className="text-body-sm text-ink-secondary">{meta}</div>
                </div>
                {/* The state carries an icon, not just the tone. */}
                <span className={cn('flex flex-none items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-caption font-semibold', done ? 'bg-positive-soft text-positive' : 'bg-warning-soft text-warning')}>
                  <StrokeIcon paths={done ? ICON_PATHS.check : ICON_PATHS.clock} size={14} />
                  {done ? t('loans.settled') : t('loans.pending')}
                </span>
              </div>
              {/* Each figure stays on one line; on a narrow card the progress note moves below. */}
              <div className="flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-1">
                <Money hidden={hidden} className="whitespace-nowrap text-title font-semibold tabular-nums">
                  {done ? format(l.amount) : fill(t('loans.pendingAmount'), format(out))}
                </Money>
                <Money hidden={hidden} className="whitespace-nowrap text-body-sm tabular-nums text-ink-secondary">
                  {fill(t('loans.progress'), format(paid), format(l.amount), pct)}
                </Money>
              </div>
              <div role="progressbar" aria-label={l.counterpartyName ?? t('loans.unknownPerson')} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: done ? 'var(--color-positive)' : 'var(--color-primary-border)' }} />
              </div>
              <div className="flex flex-col border-t border-divider pt-2">
                <div className="py-1 text-overline font-semibold uppercase text-ink-tertiary">{t('loans.history')}</div>
                <HistoryRow
                  label={fill(t(isLent ? 'loans.historyLent' : 'loans.historyBorrowed'), shortDate(l.date, language), walletName(l.accountId))}
                  amount={`${isLent ? '−' : '+'}${format(l.amount)}`}
                  color={isLent ? 'var(--color-negative)' : 'var(--color-positive)'}
                  hidden={hidden}
                />
                {payments.map((p) => (
                  <HistoryRow
                    key={p.id}
                    label={fill(t('loans.historyPayment'), shortDate(p.date, language), walletName(p.accountId))}
                    amount={`${isLent ? '+' : '−'}${format(p.amount)}`}
                    color={isLent ? 'var(--color-positive)' : 'var(--color-negative)'}
                    hidden={hidden}
                  />
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(l)} className="h-10 cursor-pointer whitespace-nowrap rounded-[12px] border border-border-input bg-surface px-4 text-label font-semibold text-ink hover:bg-surface-sunken">
                  {t('loans.edit')}
                </button>
                {!done && (
                  <button type="button" onClick={() => setPaying(l)} className="h-10 cursor-pointer whitespace-nowrap rounded-[12px] bg-accent-soft px-4 text-label font-semibold text-on-primary-soft hover:brightness-95">
                    {t('loans.pay')}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {loans && sideLoans.length === 0 && (
        <div className="p-5 text-center text-body-sm text-ink-secondary">{t(isLent ? 'loans.emptyLent' : 'loans.emptyBorrowed')}</div>
      )}

      {(editing || adding) && (
        <LoanModal
          loan={editing === 'new' ? null : editing}
          side={side}
          wallets={wallets}
          onClose={() => {
            setEditing(null)
            onAddingDone()
          }}
          onSaved={(saved) => {
            setEditing(null)
            onAddingDone()
            if (saved !== side) onSide(saved)
            void load()
            void refreshAppData()
            notifyChanged()
          }}
        />
      )}

      {paying && (
        <PayDialog
          loan={paying}
          wallets={wallets}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setPaying(null)
            void load()
            void refreshAppData()
            notifyChanged()
          }}
        />
      )}
    </>
  )
}

function SummaryCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] border border-border bg-surface p-5 text-ink">
      <div className="text-overline font-semibold uppercase text-ink-tertiary">{label}</div>
      {children}
    </div>
  )
}

function HistoryRow({ label, amount, color, hidden }: { label: string; amount: string; color: string; hidden: boolean }) {
  return (
    <div className="flex justify-between gap-2.5 py-1.5 text-body-sm">
      <span className="min-w-0 text-ink-secondary">{label}</span>
      <Money hidden={hidden} className="flex-none whitespace-nowrap font-semibold tabular-nums" style={{ color }}>
        {amount}
      </Money>
    </div>
  )
}

// "Registrar abono": defaults to the full pending balance, can't exceed it,
// and the user picks the wallet it's received into / paid from.
function PayDialog({ loan, wallets, onClose, onSaved }: { loan: Transaction; wallets: Wallet[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation()
  const { format } = useCurrency()
  const { showToast } = useToast()
  const out = loan.outstanding ?? 0
  const [amount, setAmount] = useState(numStr(out))
  const [walletId, setWalletId] = useState(loan.accountId)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const value = evalExpr(amount)
    if (!value || value > out) return setError(fill(t('loans.payError'), format(out)))
    setBusy(true)
    try {
      await transactionService.settleLoan(loan.id, { amount: value, accountId: walletId, date: todayISO() })
      showToast(t(value === out ? 'loans.settledToast' : 'loans.paidToast'), 'success')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inicio.syncError'))
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,6,12,.62)] p-6 [line-height:normal]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('loans.pay')}
        onClick={(e) => e.stopPropagation()}
        className="flex w-[466px] max-w-full flex-col gap-4 rounded-[18px] border border-v2-line2 bg-v2-surface p-[22px] text-v2-text shadow-[0_24px_60px_rgba(0,0,0,.45)]"
      >
        <div>
          <div className="text-[15px] font-extrabold">{t('loans.pay')}</div>
          <div className="mt-0.5 text-caption text-v2-dim">{fill(t('loans.paySub'), loan.counterpartyName ?? t('loans.unknownPerson'), format(out))}</div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-caption font-bold tracking-[.06em] text-v2-muted">
            {t('loans.payAmount')}
          </label>
          <AmountField
            expr={amount}
            onExpr={(v) => {
              setAmount(v)
              setError('')
            }}
            height={44}
            fontSize={13}
            radius={12}
            label={t('loans.payAmount')}
          />
          <div className="text-caption text-v2-dim">{t('loans.payHint')}</div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>{t(loan.loanKind === 'lent' ? 'loans.receiveIn' : 'loans.payFrom')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {wallets.map((w) => (
              <button key={w.id} type="button" aria-pressed={walletId === w.id} onClick={() => setWalletId(w.id)} className={flatClass(walletId === w.id)}>
                {shortWallet(w.name)}
              </button>
            ))}
          </div>
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="flex justify-end gap-2">
          <CancelButton onClick={onClose}>{t('common.cancel')}</CancelButton>
          <button type="button" onClick={save} disabled={busy} className="cursor-pointer whitespace-nowrap rounded-[10px] bg-v2-accent px-4 py-2.5 text-[12.5px] font-bold text-white">
            {t('loans.paySave')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
