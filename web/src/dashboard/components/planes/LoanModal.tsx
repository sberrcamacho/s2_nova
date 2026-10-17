import { currentLanguage, fill, tr } from '@/lib/i18n/translations'
import { useEffect, useState } from 'react'
import { CancelButton, ChipStrip, ConfirmDialog, DangerLink, ErrorBox, Flat, IC, Icon, Label, ModalFooter, ModalTitle, V2Modal } from '@/components/v2/Kit'
import { AmountHero, ChoiceCard, SegmentedChoice, StepOptionGroup, StepOptionRow, StepQuestion, WalletPicker } from '@/components/v2/Steps'
import { todayISO } from '@/lib/date'
import { evalExpr, numStr, overdraftAfter } from '@/lib/nuevoMovimiento'
import { OverdraftWarning } from '@/components/v2/OverdraftWarning'
import { shortDate } from '@/lib/inicio'
import { shortWallet } from '@/lib/movimientos'
import { transactionService } from '@/services/transactionService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useToast } from '@/state/ToastContext'
import { cn } from '@/lib/cn'
import type { LoanInterestPeriod, LoanInterestTerms, LoanKind, Transaction, Wallet } from '@/types'

// The loan form, one modal: the direction, the amount on the hero surface,
// the counterparty, the wallet the money left or entered, an optional due
// date and the interest (none, fixed once, or on the balance per month or
// year from an optional date — backend lib/loans.ts). Editing reuses it,
// with "Eliminar registro" behind the two-step confirmation.
const loanInput =
  'box-border h-11 w-full min-w-0 rounded-[12px] border border-border-input bg-surface px-3.5 font-[inherit] text-body text-ink outline-none [color-scheme:dark] min-[760px]:text-body-sm placeholder:text-ink-secondary focus:border-primary-border'

// Arrows for the direction: money going out (lent) or coming in (borrowed).
const LOAN_OUT_ICON = ['M7 17 17 7', 'M8 7h9v9']
const LOAN_IN_ICON = ['M17 7 7 17', 'M16 17H7V8']

export function LoanModal({ loan, side, wallets, onClose, onSaved, initialAmount, initialWalletId }: { loan: Transaction | null; side: LoanKind; wallets: Wallet[]; onClose: () => void; onSaved: (side: LoanKind) => void; initialAmount?: string; initialWalletId?: string | null }) {
  const { addTransaction } = useAppData()
  const { format, currency: principal } = useCurrency()
  const { showToast } = useToast()
  const [kind, setKind] = useState<LoanKind>(loan?.loanKind ?? side)
  const [person, setPerson] = useState(loan?.counterpartyName ?? '')
  const [amount, setAmount] = useState(loan ? numStr(loan.amount) : (initialAmount ?? ''))
  const [walletId, setWalletId] = useState<string | null>(loan?.accountId ?? initialWalletId ?? wallets[0]?.id ?? null)
  // Opened before the wallets arrive (from Nuevo movimiento): default to the
  // first one once they do, unless one was already chosen.
  useEffect(() => {
    if (!walletId && wallets[0]) setWalletId(wallets[0].id)
  }, [walletId, wallets])
  const [due, setDue] = useState(loan?.dueDate?.slice(0, 10) ?? '')
  const [interestMode, setInterestMode] = useState<'none' | LoanInterestTerms['mode']>(loan?.interest?.mode ?? 'none')
  const [rate, setRate] = useState(loan?.interest ? String(loan.interest.rate).replace('.', currentLanguage() === 'es' ? ',' : '.') : '')
  const [period, setPeriod] = useState<LoanInterestPeriod>(loan?.interest?.period ?? 'monthly')
  const [interestFrom, setInterestFrom] = useState(loan?.interest?.from ?? '')
  // The interest opens on its own pages (the kind, then its terms) so the
  // form never grows under a choice.
  const [interestPage, setInterestPage] = useState<'mode' | 'terms' | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [overdraftAsk, setOverdraftAsk] = useState<number | null>(null)
  const lent = kind === 'lent'
  // Lending takes the money out of the wallet (in its own currency); when
  // that leaves it below zero, Guardar asks first. Editing gives back what
  // the loan had already taken from this same wallet.
  const wallet = wallets.find((w) => w.id === walletId)
  const refund = loan && loan.loanKind === 'lent' && loan.accountId === walletId ? (loan.walletAmount ?? loan.amount) : 0
  const overdraft = lent && wallet ? overdraftAfter({ balance: wallet.currentBalance, spend: evalExpr(amount), refund, credit: wallet.accountType === 'BANK_CREDIT', future: false }) : null
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

  // The rate as typed ("2,5" or "2.5"); NaN until it's a number.
  const rateValue = Number(rate.trim().replace(',', '.'))
  const interestTerms = (): LoanInterestTerms | null =>
    interestMode === 'none'
      ? null
      : { mode: interestMode, rate: rateValue, ...(interestMode === 'on_balance' ? { period, from: interestFrom || undefined } : {}) }
  const interestSummary = (() => {
    if (interestMode === 'none' || !(rateValue > 0)) return tr('loan.interest.none')
    const rateText = `${rate.trim()}`
    if (interestMode === 'fixed') return fill(tr('loans.interestFixed'), rateText)
    // Short, so the row's value rarely needs truncating.
    return `${rateText} % ${tr(period === 'annual' ? 'loans.interestAnnual' : 'loans.interestMonthly')}` + (interestFrom ? ` · ${fill(tr('loan.summaryFrom'), shortDate(interestFrom, currentLanguage()))}` : '')
  })()
  const interestHint = (() => {
    const value = evalExpr(amount)
    if (interestMode === 'none' || !(rateValue > 0) || !value) return null
    if (interestMode === 'fixed') return fill(tr(lent ? 'loan.hint.fixedLent' : 'loan.hint.fixedBorrowed'), format(value * (1 + rateValue / 100)))
    return fill(tr('loan.hint.onBalance'), format((value * rateValue) / 100), tr(period === 'annual' ? 'loan.per.year' : 'loan.per.month'))
  })()

  const save = (anyway = false) => {
    const value = evalExpr(amount)
    const name = person.trim()
    if (!name) return setErr(tr('loan.err.person'))
    if (!value) return setErr(tr('nm.err.amount'))
    if (!walletId) return setErr(tr('nm.err.wallet'))
    if (interestMode !== 'none' && !(rateValue > 0 && rateValue <= 1000)) return setErr(tr('loan.err.rate'))
    if (overdraft !== null && !anyway) return setOverdraftAsk(overdraft)
    setOverdraftAsk(null)
    const toast = tr(lent ? 'loan.toast.lent' : 'loan.toast.borrowed')
    if (loan) {
      return run(() => transactionService.updateLoan(loan.id, { amount: value, accountId: walletId, loanKind: kind, counterpartyName: name, dueDate: due || null, interest: interestTerms() }), toast)
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
          interest: interestTerms() ?? undefined,
        }),
      toast,
    )
  }

  const title = tr(loan ? 'loan.edit' : lent ? 'loan.newLent' : 'loan.newBorrowed')

  if (interestPage) {
    const termsOk = interestMode === 'none' || (rateValue > 0 && rateValue <= 1000)
    const back = () => (interestPage === 'terms' ? setInterestPage('mode') : setInterestPage(null))
    const done = () => {
      if (!termsOk) return setErr(tr('loan.err.rate'))
      setErr('')
      setInterestPage(null)
    }
    return (
      <V2Modal width={460} onClose={onClose} label={title}>
        <div className="flex items-center gap-1">
          <button type="button" onClick={back} aria-label={tr('step.back')} className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-[10px] text-ink hover:bg-surface-sunken">
            <Icon paths={['M19 12H5', 'M12 19l-7-7 7-7']} size={20} color="currentColor" />
          </button>
          <div className="min-w-0 flex-1 truncate text-title-sm font-semibold">{title}</div>
        </div>
        {interestPage === 'mode' ? (
          <>
            <StepQuestion text={tr(lent ? 'loan.interestQuestion.lent' : 'loan.interestQuestion.borrowed')} />
            <div role="radiogroup" aria-label={tr('loan.interestRow')} className="-mt-3 flex flex-col gap-2.5">
              <ChoiceCard icon={[...IC.check]} title={tr('loan.interest.none')} detail={tr(lent ? 'loan.mode.none.lent' : 'loan.mode.none.borrowed')} on={interestMode === 'none'} onClick={() => { setInterestMode('none'); setErr(''); setInterestPage(null) }} />
              <ChoiceCard icon={[...IC.percent]} title={tr('loan.interest.fixed')} detail={tr('loan.mode.fixed.detail')} on={interestMode === 'fixed'} onClick={() => { setInterestMode('fixed'); setInterestPage('terms') }} />
              <ChoiceCard icon={[...IC.repeat]} title={tr('loan.interest.on_balance')} detail={tr('loan.mode.onBalance.detail')} on={interestMode === 'on_balance'} onClick={() => { setInterestMode('on_balance'); setInterestPage('terms') }} />
            </div>
          </>
        ) : (
          <>
            <StepQuestion text={tr(interestMode === 'fixed' ? 'loan.terms.fixed' : 'loan.terms.onBalance')} />
            <div className="-mt-3 flex flex-col gap-1.5">
              <Label>{tr(interestMode === 'fixed' ? 'loan.rate.fixed' : 'loan.rate.onBalance')}</Label>
              <div className="flex items-center gap-2.5">
                <div className="relative w-[120px] flex-none">
                  <input
                    inputMode="decimal"
                    autoFocus
                    value={rate}
                    onChange={(e) => clear(setRate)(e.target.value.replace(/[^\d.,]/g, '').slice(0, 8))}
                    onKeyDown={(e) => e.key === 'Enter' && done()}
                    placeholder="2"
                    aria-label={tr('loan.rateAria')}
                    className={cn(loanInput, 'pr-9 font-numeric tabular-nums')}
                  />
                  <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-body text-ink-secondary">%</span>
                </div>
                {interestMode === 'on_balance' && (
                  <ChipStrip role="radiogroup" label={tr('loan.period')}>
                    {(['monthly', 'annual'] as const).map((p) => (
                      <Flat key={p} role="radio" on={period === p} onClick={() => setPeriod(p)}>
                        {tr(`loan.period.${p}`)}
                      </Flat>
                    ))}
                  </ChipStrip>
                )}
              </div>
              <div className="min-h-[18px] font-numeric text-caption leading-[1.45] text-ink-secondary">{interestHint}</div>
            </div>
            {interestMode === 'on_balance' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>{tr('loan.interestFrom')}</Label>
                  {due && interestFrom !== due && (
                    <button type="button" onClick={() => setInterestFrom(due)} className="inline-flex min-h-6 cursor-pointer items-center whitespace-nowrap text-caption font-semibold text-link">
                      {tr('loan.useDue')}
                    </button>
                  )}
                </div>
                <input type="date" value={interestFrom} onChange={(e) => setInterestFrom(e.target.value)} aria-label={tr('loan.interestFromLabel')} className={loanInput} />
                <div className="text-caption leading-[1.45] text-ink-secondary">{tr('loan.interestFromHint')}</div>
              </div>
            )}
            {err && <ErrorBox>{err}</ErrorBox>}
            <button type="button" onClick={done} className="btn-cta h-11 w-full cursor-pointer whitespace-nowrap rounded-[12px] text-label font-semibold">
              {tr('step.done')}
            </button>
          </>
        )}
      </V2Modal>
    )
  }
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
          <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-v2-accent/16">
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
      <WalletPicker label={tr('nm.row.wallet')} listLabel={tr(lent ? 'loan.walletOut' : 'loan.walletIn')} wallets={wallets} value={walletId} onChange={(id) => clear(setWalletId)(id)} principal={principal} />
      <div className="flex flex-col gap-1.5">
        <Label>{tr('loan.due')}</Label>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label={tr('loan.dueLabel')} className={loanInput} />
      </div>
      <StepOptionGroup>
        <StepOptionRow icon={[...IC.percent]} label={tr('loan.interestRow')} value={interestSummary} onClick={() => setInterestPage('mode')} />
      </StepOptionGroup>
      {err && <ErrorBox>{err}</ErrorBox>}
      <ModalFooter left={loan && <DangerLink onClick={() => setConfirming(true)}>{tr('loan.delete')}</DangerLink>}>
        <CancelButton onClick={onClose} />
        <button type="button" onClick={() => save()} disabled={busy} className="cursor-pointer self-stretch whitespace-nowrap rounded-[10px] bg-primary px-4 py-2.5 text-body-sm font-semibold text-white">
          {tr('loan.save')}
        </button>
      </ModalFooter>
      {overdraftAsk !== null && wallet && (
        <OverdraftWarning
          walletName={shortWallet(wallet.name)}
          currency={wallet.currency}
          available={wallet.currentBalance + refund}
          after={overdraftAsk}
          body="loan.overdraft.body"
          spendLabel="loan.overdraft.spend"
          onReview={() => setOverdraftAsk(null)}
          onConfirm={() => save(true)}
        />
      )}
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
