import { useState } from 'react'
import { SidePanel, chipClass, errorBoxClass, primaryButtonClass, secondaryButtonClass } from '@/components/panels/SidePanel'
import { AmountInput, PanelField, WalletChips, dangerButtonClass, panelInputClass } from '@/components/panels/PanelFields'
import { todayISO } from '@/lib/date'
import { fill } from '@/lib/inicio'
import { transactionService } from '@/services/transactionService'
import { useAppData } from '@/state/AppDataContext'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import type { LoanKind, Transaction, Wallet } from '@/types'

// Create / edit a loan — Android's Préstamos sheet as a Web side panel:
// Dirección, the counterparty, Monto, the wallet the money left or entered,
// and an optional due date. A loan is a transaction with loanKind; the
// backend moves the wallet balance (and re-applies it on edit).
export function LoanPanel({ loan, side, wallets, onClose, onSaved }: { loan: Transaction | null; side: LoanKind; wallets: Wallet[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation()
  const { addTransaction } = useAppData()
  const { showToast } = useToast()
  const isEdit = loan !== null
  const [kind, setKind] = useState<LoanKind>(loan?.loanKind ?? side)
  const [person, setPerson] = useState(loan?.counterpartyName ?? '')
  const [amount, setAmount] = useState(loan ? String(loan.amount) : '')
  const [walletId, setWalletId] = useState<string | null>(loan?.accountId ?? wallets[0]?.id ?? null)
  const [due, setDue] = useState(loan?.dueDate?.slice(0, 10) ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lent = kind === 'lent'

  const run = async (action: () => Promise<unknown>, toastKey: 'loans.saved' | 'loans.deleted') => {
    setBusy(true)
    try {
      await action()
      showToast(t(toastKey), 'success')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inicio.syncError'))
      setBusy(false)
    }
  }

  const save = () => {
    const value = Number(amount)
    const name = person.trim()
    if (!name) return setError(t('loans.errPerson'))
    if (!value) return setError(t('plans.errAmount'))
    if (!walletId) return setError(t('newTx.errWallet'))
    if (loan) {
      return run(() => transactionService.updateLoan(loan.id, { amount: value, accountId: walletId, loanKind: kind, counterpartyName: name, dueDate: due || null }), 'loans.saved')
    }
    return run(
      () =>
        addTransaction({
          accountId: walletId,
          type: lent ? 'expense' : 'income',
          amount: value,
          description: fill(t(lent ? 'loans.descLent' : 'loans.descBorrowed'), name),
          category: 'other',
          date: todayISO(),
          loanKind: kind,
          counterpartyName: name,
          dueDate: due || undefined,
        }),
      'loans.saved',
    )
  }

  return (
    <SidePanel
      title={t(isEdit ? 'loans.editTitle' : lent ? 'loans.newLent' : 'loans.newBorrowed')}
      onClose={onClose}
      footer={
        <>
          {loan && (
            <button type="button" onClick={() => run(() => transactionService.deleteTransaction(loan.id), 'loans.deleted')} disabled={busy} className={dangerButtonClass}>
              {t('loans.delete')}
            </button>
          )}
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={save} disabled={busy} className={primaryButtonClass}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <PanelField label={t('loans.direction')}>
        <div role="radiogroup" aria-label={t('loans.direction')} className="flex gap-1.5">
          {(['lent', 'borrowed'] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={chipClass(kind === k)}>
              {t(k === 'lent' ? 'loans.lent' : 'loans.borrowed')}
            </button>
          ))}
        </div>
      </PanelField>
      <PanelField label={t(lent ? 'loans.personLent' : 'loans.personBorrowed')} htmlFor="lp-person">
        <input id="lp-person" value={person} onChange={(e) => { setPerson(e.target.value); setError('') }} placeholder={t('loans.personPlaceholder')} className={panelInputClass} />
      </PanelField>
      <PanelField label={t('loans.amount')} htmlFor="lp-amount">
        <AmountInput id="lp-amount" value={amount} onChange={(v) => { setAmount(v); setError('') }} />
      </PanelField>
      <PanelField label={t(lent ? 'loans.walletLent' : 'loans.walletBorrowed')}>
        {wallets.length === 0 ? <div className="text-[12px] text-v2-dim">{t('newTx.noWallets')}</div> : <WalletChips wallets={wallets} selected={walletId} onSelect={setWalletId} />}
      </PanelField>
      <PanelField label={t('loans.dueOptional')} htmlFor="lp-due">
        <input id="lp-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={panelInputClass} />
      </PanelField>
      {error && (
        <div role="alert" className={errorBoxClass}>
          {error}
        </div>
      )}
    </SidePanel>
  )
}
