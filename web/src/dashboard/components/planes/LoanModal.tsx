import { useState } from 'react'
import { CancelButton, ConfirmDialog, DangerLink, ErrorBox, Flat, Label, ModalFooter, ModalTitle, V2Modal } from '@/components/v2/Kit'
import { todayISO } from '@/lib/date'
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
  'box-border h-11 w-full min-w-0 rounded-[12px] border border-v2-line bg-v2-sidebar px-3.5 font-[inherit] text-[13px] text-v2-text outline-none [color-scheme:dark] placeholder:text-v2-dim focus:border-v2-accent'

export function LoanModal({ loan, side, wallets, onClose, onSaved }: { loan: Transaction | null; side: LoanKind; wallets: Wallet[]; onClose: () => void; onSaved: (side: LoanKind) => void }) {
  const { addTransaction } = useAppData()
  const { format } = useCurrency()
  const { showToast } = useToast()
  const [kind, setKind] = useState<LoanKind>(loan?.loanKind ?? side)
  const [person, setPerson] = useState(loan?.counterpartyName ?? '')
  const [amount, setAmount] = useState(loan ? String(loan.amount) : '')
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
      setErr(e instanceof Error ? e.message : 'No se pudo guardar. Intenta de nuevo.')
      setBusy(false)
    }
  }

  const save = () => {
    const value = Number(amount)
    const name = person.trim()
    if (!name) return setErr('Escribe el nombre de la contraparte.')
    if (!value) return setErr('Escribe el monto.')
    if (!walletId) return setErr('Elige una billetera.')
    const toast = lent ? 'Préstamo registrado' : 'Deuda registrada'
    if (loan) {
      return run(() => transactionService.updateLoan(loan.id, { amount: value, accountId: walletId, loanKind: kind, counterpartyName: name, dueDate: due || null }), toast)
    }
    return run(
      () =>
        addTransaction({
          accountId: walletId,
          type: lent ? 'expense' : 'income',
          amount: value,
          description: `${lent ? 'Préstamo a' : 'Deuda con'} ${name}`,
          category: lent ? 'exp.other' : 'inc.other',
          date: todayISO(),
          loanKind: kind,
          counterpartyName: name,
          dueDate: due || undefined,
        }),
      toast,
    )
  }

  const title = loan ? 'Editar préstamo' : lent ? 'Registrar préstamo' : 'Registrar deuda'
  const walletOf = (id: string) => shortWallet(wallets.find((w) => w.id === id)?.name ?? '')

  return (
    <V2Modal width={460} onClose={onClose} label={title}>
      <div>
        <ModalTitle>{title}</ModalTitle>
        <div className="mt-0.5 text-[11.5px] leading-[1.45] text-v2-dim">Queda fuera de los saldos hasta que se salde.</div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>DIRECCIÓN</Label>
        <div className="flex gap-1.5">
          {(['lent', 'borrowed'] as const).map((k) => (
            <Flat key={k} on={kind === k} onClick={() => clear(setKind)(k)} className="flex-1 text-center">
              {k === 'lent' ? 'Prestado' : 'Recibido'}
            </Flat>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{lent ? 'A QUIÉN LE PRESTASTE' : 'QUIÉN TE PRESTÓ'}</Label>
        <input value={person} onChange={(e) => clear(setPerson)(e.target.value)} placeholder="Nombre de la contraparte" className={loanInput} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>MONTO</Label>
        <div className="box-border flex h-11 w-full items-center gap-1.5 rounded-[12px] border border-v2-line bg-v2-sidebar px-3.5">
          <span className="font-numeric text-[14px] font-extrabold text-v2-muted">$</span>
          <input
            value={amount ? Number(amount).toLocaleString('es-CO') : ''}
            onChange={(e) => clear(setAmount)(e.target.value.replace(/\D/g, '').slice(0, 12))}
            inputMode="numeric"
            placeholder="0"
            aria-label="Monto"
            className="font-numeric min-w-0 flex-1 border-none bg-transparent px-0.5 py-px font-[inherit] text-[14px] font-extrabold text-v2-text outline-none"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>{lent ? 'SALE DE' : 'ENTRA A'}</Label>
        <div className="flex flex-wrap gap-1.5">
          {wallets.map((w) => (
            <Flat key={w.id} on={walletId === w.id} onClick={() => clear(setWalletId)(w.id)}>
              {shortWallet(w.name)}
            </Flat>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>VENCIMIENTO (OPCIONAL)</Label>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Vencimiento" className={loanInput} />
      </div>
      {err && <ErrorBox>{err}</ErrorBox>}
      <ModalFooter left={loan && <DangerLink onClick={() => setConfirming(true)}>Eliminar registro</DangerLink>}>
        <CancelButton onClick={onClose} />
        <button type="button" onClick={save} disabled={busy} className="cursor-pointer self-stretch whitespace-nowrap rounded-[10px] bg-v2-accent px-4 py-2.5 text-[12.5px] font-bold text-white">
          Guardar registro
        </button>
      </ModalFooter>
      {confirming && loan && (
        <ConfirmDialog
          title={`Eliminar “${loan.counterpartyName ?? loan.description}”`}
          lines={[
            `${loan.loanKind === 'lent' ? '−' : '+'}${format(loan.amount)} · ${shortDate(loan.date, 'es')} · ${walletOf(loan.accountId)}`,
            'Sus abonos quedan como movimientos normales',
            `El saldo de ${walletOf(loan.accountId)} se recalcula`,
          ]}
          ack="Entiendo que el registro se elimina para siempre."
          cta="Eliminar registro"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false)
            void run(() => transactionService.deleteTransaction(loan.id), 'Registro eliminado')
          }}
        />
      )}
    </V2Modal>
  )
}
