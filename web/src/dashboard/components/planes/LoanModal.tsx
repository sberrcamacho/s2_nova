import { currentLanguage, fill, tr } from '@/lib/i18n/translations'
import { useState } from 'react'
import { AmountField, CancelButton, ConfirmDialog, DangerLink, ErrorBox, Flat, Label, ModalFooter, ModalTitle, V2Modal } from '@/components/v2/Kit'
import { todayISO } from '@/lib/date'
import { evalExpr, numStr } from '@/lib/nuevoMovimiento'
import { shortDate } from '@/lib/inicio'
import { shortWallet } from '@/lib/movimientos'
import { transactionService } from '@/services/transactionService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useToast } from '@/state/ToastContext'
import type { LoanKind, Transaction, Wallet } from '@/types'

// The planDraft modal's loan variant: Dirección, the counterparty, Monto,
// the wallet the money left or entered, and an optional due date. The
// mockup only creates loans; editing reuses the same modal (Android's loan
// sheet edits too), with "Eliminar registro" behind the askConfirm steps.
const loanInput =
  'box-border h-11 w-full min-w-0 rounded-[12px] border border-border bg-surface px-3.5 font-[inherit] text-body-sm text-ink outline-none [color-scheme:dark] placeholder:text-ink-secondary focus:border-primary-border'

export function LoanModal({ loan, side, wallets, onClose, onSaved }: { loan: Transaction | null; side: LoanKind; wallets: Wallet[]; onClose: () => void; onSaved: (side: LoanKind) => void }) {
  const { addTransaction } = useAppData()
  const { format } = useCurrency()
  const { showToast } = useToast()
  const [kind, setKind] = useState<LoanKind>(loan?.loanKind ?? side)
  const [person, setPerson] = useState(loan?.counterpartyName ?? '')
  const [amount, setAmount] = useState(loan ? numStr(loan.amount) : '')
  const [walletId, setWalletId] = useState<string | null>(loan?.accountId ?? wallets[0]?.id ?? null)
  const [due, setDue] = useState(loan?.dueDate?.slice(0, 10) ?? '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const lent = kind === 'lent'
  const clear = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setErr('')
  }

  const run = async (action: () => Promise<unknown>, toast: string) => {
    setBusy(true)
    try {
      await action()
      showToast(toast, 'success')
      onSaved(kind)
    } catch (e) {
      setErr(e instanceof Error ? e.message : tr('loan.err.save'))
      setBusy(false)
    }
  }

  const save = () => {
    const value = evalExpr(amount)
    const name = person.trim()
    if (!name) return setErr(tr('loan.err.person'))
    if (!value) return setErr(tr('nm.err.amount'))
    if (!walletId) return setErr(tr('nm.err.wallet'))
    const toast = tr(lent ? 'loan.toast.lent' : 'loan.toast.borrowed')
    if (loan) {
      return run(() => transactionService.updateLoan(loan.id, { amount: value, accountId: walletId, loanKind: kind, counterpartyName: name, dueDate: due || null }), toast)
    }
    return run(
      () =>
        addTransaction({
          accountId: walletId,
          type: lent ? 'expense' : 'income',
          amount: value,
          description: fill(tr(lent ? 'loan.desc.lent' : 'loan.desc.borrowed'), name),
          category: lent ? 'exp.other' : 'inc.other',
          date: todayISO(),
          loanKind: kind,
          counterpartyName: name,
          dueDate: due || undefined,
        }),
      toast,
    )
  }

  const title = tr(loan ? 'loan.edit' : lent ? 'loan.newLent' : 'loan.newBorrowed')
  const walletOf = (id: string) => shortWallet(wallets.find((w) => w.id === id)?.name ?? '')

  return (
    <V2Modal width={460} onClose={onClose} label={title}>
      <div>
        <ModalTitle>{title}</ModalTitle>
        <div className="mt-0.5 text-caption leading-[1.45] text-ink-secondary">{tr('loan.hint')}</div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>{tr('loan.direction')}</Label>
        <div className="flex gap-1.5">
          {(['lent', 'borrowed'] as const).map((k) => (
            <Flat key={k} on={kind === k} onClick={() => clear(setKind)(k)} className="flex-1 text-center">
              {tr(k === 'lent' ? 'loan.dir.lent' : 'loan.dir.borrowed')}
            </Flat>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{tr(lent ? 'loan.person.lent' : 'loan.person.borrowed')}</Label>
        <input value={person} onChange={(e) => clear(setPerson)(e.target.value)} placeholder={tr('loan.personPh')} className={loanInput} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{tr('nm.amount')}</Label>
        <AmountField expr={amount} onExpr={clear(setAmount)} height={44} radius={12} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{tr(lent ? 'loan.walletOut' : 'loan.walletIn')}</Label>
        <div className="flex flex-wrap gap-1.5">
          {wallets.map((w) => (
            <Flat key={w.id} on={walletId === w.id} onClick={() => clear(setWalletId)(w.id)}>
              {shortWallet(w.name)}
            </Flat>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{tr('loan.due')}</Label>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label={tr('loan.dueLabel')} className={loanInput} />
      </div>
      {err && <ErrorBox>{err}</ErrorBox>}
      <ModalFooter left={loan && <DangerLink onClick={() => setConfirming(true)}>{tr('loan.delete')}</DangerLink>}>
        <CancelButton onClick={onClose} />
        <button type="button" onClick={save} disabled={busy} className="cursor-pointer self-stretch whitespace-nowrap rounded-[10px] bg-primary px-4 py-2.5 text-body-sm font-semibold text-white">
          {tr('loan.save')}
        </button>
      </ModalFooter>
      {confirming && loan && (
        <ConfirmDialog
          title={fill(tr('loan.delete.title'), loan.counterpartyName ?? loan.description)}
          lines={[
            `${loan.loanKind === 'lent' ? '−' : '+'}${format(loan.amount)} · ${shortDate(loan.date, currentLanguage())} · ${walletOf(loan.accountId)}`,
            tr('loan.delete.payments'),
            fill(tr('loan.delete.balance'), walletOf(loan.accountId)),
          ]}
          ack={tr('loan.delete.ack')}
          cta={tr('loan.delete')}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false)
            void run(() => transactionService.deleteTransaction(loan.id), tr('loan.toast.deleted'))
          }}
        />
      )}
    </V2Modal>
  )
}
