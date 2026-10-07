import { WarnDialog } from '@/components/v2/Kit'
import { formatMoney } from '@/lib/currency'
import { fill, tr, type TranslationKey } from '@/lib/i18n/translations'

// "Saldo insuficiente": asked before money leaves a wallet and takes it below
// zero (Nuevo movimiento, a goal's Abonar, Yo presté). It shows what the
// wallet has, what this takes and where it lands, all in the wallet's
// currency; saving anyway is allowed. `available` includes anything an
// edited record gives back to the same wallet.
export function OverdraftWarning({
  walletName,
  currency,
  available,
  after,
  body = 'nm.overdraft.body',
  spendLabel = 'nm.overdraft.spend',
  confirm = 'nm.overdraft.confirm',
  onReview,
  onConfirm,
}: {
  walletName: string
  currency: string
  available: number
  after: number
  body?: TranslationKey
  spendLabel?: TranslationKey
  confirm?: TranslationKey
  onReview: () => void
  onConfirm: () => void
}) {
  // The sign and the figure never wrap apart; the amount keeps its width.
  const line = (label: string, value: number, strong = false) => (
    <div className="flex items-center gap-3">
      <span className={`min-w-0 flex-1 truncate ${strong ? 'text-body-sm font-semibold text-ink' : 'text-body-sm text-ink-secondary'}`}>{label}</span>
      <span className={`font-numeric shrink-0 whitespace-nowrap text-amount tabular-nums ${strong ? 'font-semibold text-negative' : 'font-medium text-ink'}`}>{formatMoney(value, currency)}</span>
    </div>
  )
  return (
    <WarnDialog
      title={tr('nm.overdraft.title')}
      body={fill(tr(body), walletName)}
      details={
        <div className="flex flex-col gap-2.5">
          {line(tr('nm.overdraft.available'), available)}
          {line(tr(spendLabel), after - available)}
          <hr className="border-0 border-t border-border" />
          {line(tr('nm.overdraft.left'), after, true)}
        </div>
      }
      cancel={tr('nm.overdraft.review')}
      cta={tr(confirm)}
      onCancel={onReview}
      onConfirm={onConfirm}
    />
  )
}
