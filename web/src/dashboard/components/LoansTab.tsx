import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CategoryMark } from '@/components/v2/CategoryMark'
import { Money } from '@/components/v2/Money'
import { CancelButton, ErrorBox, Label, flatClass } from '@/components/v2/Kit'
import { LoanModal } from '@/dashboard/components/planes/LoanModal'
import { accountService } from '@/services/accountService'
import { transactionService } from '@/services/transactionService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useHideAmounts } from '@/state/useHideAmounts'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import { todayISO } from '@/lib/date'
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
        <div className="flex gap-1 rounded-full border border-v2-line bg-v2-surface p-1">
          {(['lent', 'borrowed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={side === s}
              onClick={() => onSide(s)}
              className={
                side === s
                  ? 'cursor-pointer rounded-full bg-v2-accent px-4 py-[7px] text-[12px] font-bold text-white'
                  : 'cursor-pointer rounded-full px-4 py-[7px] text-[12px] font-bold text-v2-dim'
              }
            >
              {t(s === 'lent' ? 'loans.lent' : 'loans.borrowed')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 min-[760px]:grid-cols-3">
        <SummaryCard label={t(isLent ? 'loans.pendingLent' : 'loans.pendingBorrowed')}>
          <Money hidden={hidden} className="mt-1.5 block text-[24px] font-extrabold tracking-[-.02em]">
            {format(sideLoans.reduce((s, l) => s + outOf(l), 0))}
          </Money>
        </SummaryCard>
        <SummaryCard label={t(isLent ? 'loans.paidLent' : 'loans.paidBorrowed')}>
          <Money hidden={hidden} className="mt-1.5 block text-[24px] font-extrabold tracking-[-.02em]">
            {format(sideLoans.reduce((s, l) => s + paidOf(l), 0))}
          </Money>
        </SummaryCard>
        <SummaryCard label={t('loans.nextDue')}>
          <div className="mt-2 text-[15px] font-extrabold">
            {nextSide ? `${nextSide.counterpartyName ?? t('loans.unknownPerson')} · ${shortDate(nextSide.dueDate!, language)}` : t('loans.noDue')}
          </div>
        </SummaryCard>
      </div>

      <div className="grid grid-cols-1 gap-3.5 min-[1100px]:grid-cols-2">
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
            <div key={l.id} className="flex flex-col gap-3.5 rounded-[16px] border border-v2-line bg-v2-surface p-5">
              <div className="flex items-center gap-3">
                <CategoryMark category="other" box={38} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-extrabold">{l.counterpartyName ?? t('loans.unknownPerson')}</div>
                  <div className="mt-0.5 text-[11.5px] text-v2-dim">{meta}</div>
                </div>
                <span
                  className="rounded-full px-[9px] py-[3px] text-[11px] font-extrabold"
                  style={done ? { color: 'var(--v2-pos)', background: 'rgba(50,201,138,.14)' } : { color: 'var(--v2-warn)', background: 'rgba(240,180,41,.14)' }}
                >
                  {done ? t('loans.settled') : t('loans.pending')}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2.5">
                <Money hidden={hidden} className="text-[20px] font-extrabold">
                  {done ? format(l.amount) : fill(t('loans.pendingAmount'), format(out))}
                </Money>
                <Money hidden={hidden} className="text-[11.5px] text-v2-dim">
                  {fill(t('loans.progress'), format(paid), format(l.amount), pct)}
                </Money>
              </div>
              <div className="h-1.5 overflow-hidden rounded-[3px] bg-v2-line">
                <div className="h-full" style={{ width: `${pct}%`, background: done ? 'var(--v2-pos)' : 'var(--v2-accent3)' }} />
              </div>
              <div className="flex flex-col border-t border-v2-subtle pt-2">
                <div className="py-1 text-[10.5px] font-bold tracking-[.08em] text-v2-dim">{t('loans.history')}</div>
                <HistoryRow
                  label={fill(t(isLent ? 'loans.historyLent' : 'loans.historyBorrowed'), shortDate(l.date, language), walletName(l.accountId))}
                  amount={`${isLent ? '−' : '+'}${format(l.amount)}`}
                  color={isLent ? 'var(--v2-neg)' : 'var(--v2-pos)'}
                  hidden={hidden}
                />
                {payments.map((p) => (
                  <HistoryRow
                    key={p.id}
                    label={fill(t('loans.historyPayment'), shortDate(p.date, language), walletName(p.accountId))}
                    amount={`${isLent ? '+' : '−'}${format(p.amount)}`}
                    color={isLent ? 'var(--v2-pos)' : 'var(--v2-neg)'}
                    hidden={hidden}
                  />
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(l)} className="cursor-pointer rounded-[10px] border border-v2-line2 px-3.5 py-[9px] text-[12px] font-bold text-v2-muted">
                  {t('loans.edit')}
                </button>
                {!done && (
                  <button type="button" onClick={() => setPaying(l)} className="cursor-pointer rounded-[10px] bg-v2-accent px-3.5 py-[9px] text-[12px] font-bold text-white">
                    {t('loans.pay')}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {loans && sideLoans.length === 0 && (
        <div className="p-5 text-center text-[12.5px] text-v2-dim">{t(isLent ? 'loans.emptyLent' : 'loans.emptyBorrowed')}</div>
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
    <div className="rounded-[16px] border border-v2-line bg-v2-surface p-5">
      <div className="text-[10.5px] font-bold tracking-[.08em] text-v2-dim">{label}</div>
      {children}
    </div>
  )
}

function HistoryRow({ label, amount, color, hidden }: { label: string; amount: string; color: string; hidden: boolean }) {
  return (
    <div className="flex justify-between gap-2.5 py-1.5 text-[12px]">
      <span className="text-v2-muted">{label}</span>
      <Money hidden={hidden} className="font-extrabold" style={{ color }}>
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
  const [amount, setAmount] = useState(String(out))
  const [walletId, setWalletId] = useState(loan.accountId)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const value = Number(amount)
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
          <div className="mt-0.5 text-[11.5px] text-v2-dim">{fill(t('loans.paySub'), loan.counterpartyName ?? t('loans.unknownPerson'), format(out))}</div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pay-amount" className="text-[11px] font-bold tracking-[.06em] text-v2-muted">
            {t('loans.payAmount')}
          </label>
          <input
            id="pay-amount"
            value={amount ? Number(amount).toLocaleString('es-CO') : ''}
            onChange={(e) => {
              setAmount(e.target.value.replace(/\D/g, '').slice(0, 11))
              setError('')
            }}
            inputMode="numeric"
            className="font-numeric box-border h-11 w-full rounded-[12px] border border-v2-line bg-v2-sidebar px-3.5 text-[13px] text-v2-text outline-none focus:border-v2-accent"
          />
          <div className="text-[11px] text-v2-dim">{t('loans.payHint')}</div>
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
