import { currentLanguage, fill, tr } from '@/lib/i18n/translations'
import { useState } from 'react'
import { CancelButton, ConfirmDialog, DangerLink, ErrorBox, Flat, IC, Icon, Label, ModalFooter, ModalTitle, V2Modal } from '@/components/v2/Kit'
import { AmountHero, SegmentedChoice } from '@/components/v2/Steps'
import { todayISO } from '@/lib/date'
import { evalExpr, numStr } from '@/lib/nuevoMovimiento'
import { shortDate } from '@/lib/inicio'
import { shortWallet } from '@/lib/movimientos'
import { transactionService } from '@/services/transactionService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useToast } from '@/state/ToastContext'
import type { LoanKind, Transaction, Wallet } from '@/types'

// The loan form, one modal: the direction, the amount on the hero surface,
// the counterparty, the wallet the money left or entered, and an optional
// due date. Editing reuses it, with "Eliminar registro" behind the
// two-step confirmation.
const loanInput =
  'box-border h-11 w-full min-w-0 rounded-[12px] border border-border-input bg-surface px-3.5 font-[inherit] text-body-sm text-ink outline-none [color-scheme:dark] placeholder:text-ink-secondary focus:border-primary-border'

// Arrows for the direction: money going out (lent) or coming in (borrowed).
const LOAN_OUT_ICON = ['M7 17 17 7', 'M8 7h9v9']
const LOAN_IN_ICON = ['M17 7 7 17', 'M16 17H7V8']

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
      <SegmentedChoice
        label={tr('loan.dirLabel')}
        value={kind}
        onChange={clear(setKind)}
        options={[
          { value: 'lent', label: tr('loan.dir.lent'), icon: LOAN_OUT_ICON },
          { value: 'borrowed', label: tr('loan.dir.borrowed'), icon: LOAN_IN_ICON },
        ]}
      />
      <AmountHero label={tr('nm.amount')} expr={amount} onExpr={clear(setAmount)} />
      <div className="flex flex-col gap-1.5">
        <Label>{tr(lent ? 'loan.person.lent' : 'loan.person.borrowed')}</Label>
        <div className="flex h-14 items-center gap-2.5 rounded-[10px] border border-border-input bg-surface pr-3 pl-2 focus-within:border-primary-border">
          <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-v2-accent/16">
            <Icon paths={IC.person} size={18} color="var(--color-link)" />
          </span>
          <input
            value={person}
            onChange={(e) => clear(setPerson)(e.target.value)}
            placeholder={tr('loan.personPh')}
            aria-label={tr(lent ? 'loan.person.lent' : 'loan.person.borrowed')}
            className="min-w-0 flex-1 border-none bg-transparent text-body font-semibold text-ink outline-none placeholder:text-ink-tertiary"
          />
        </div>
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
