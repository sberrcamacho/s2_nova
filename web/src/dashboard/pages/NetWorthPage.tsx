import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet as WalletIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { KPICard } from '@/components/ui/KPICard'
import { accountService } from '@/services/accountService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { walletTypeTranslationKey } from '@/lib/i18n/translations'
import type { Wallet } from '@/types'

// Net worth = wallet balances + money owed to you (outstanding "lent") -
// money you owe (outstanding "borrowed"). A historical trend isn't shown
// here since the mock data has no time-series wallet-balance history to
// derive one from honestly — matches the product direction's "when
// sufficient data exists" qualifier rather than fabricating a chart.
export default function NetWorthPage() {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { t } = useTranslation()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    accountService
      .getWallets()
      .then(setWallets)
      .finally(() => setIsLoading(false))
  }, [])

  const walletsTotal = wallets.reduce((sum, w) => sum + w.currentBalance, 0)
  const outstandingLent = transactions.filter((t) => t.loanKind === 'lent' && !t.loanSettled).reduce((sum, t) => sum + t.amount, 0)
  const outstandingBorrowed = transactions.filter((t) => t.loanKind === 'borrowed' && !t.loanSettled).reduce((sum, t) => sum + t.amount, 0)
  const netWorth = walletsTotal + outstandingLent - outstandingBorrowed

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard label={t('netWorth.total')} value={format(netWorth)} icon={<Landmark className="h-4 w-4" />} tone="primary" />
        <KPICard label={t('netWorth.lent')} value={format(outstandingLent)} icon={<ArrowUpRight className="h-4 w-4" />} />
        <KPICard label={t('netWorth.borrowed')} value={format(outstandingBorrowed)} icon={<ArrowDownLeft className="h-4 w-4" />} />
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-ink">
          <WalletIcon className="h-4 w-4 text-primary" /> {t('netWorth.wallets')}
        </h3>
        {!isLoading && wallets.length === 0 && <p className="text-sm text-ink-tertiary">{t('wallets.emptyTitle')}</p>}
        <div className="flex flex-col divide-y divide-border">
          {wallets.map((wallet) => (
            <div key={wallet.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-[13.5px] font-semibold text-ink">{wallet.name}</p>
                <p className="text-xs text-ink-tertiary">{t(walletTypeTranslationKey(wallet.type))}</p>
              </div>
              <p className="font-numeric text-sm font-bold text-ink">{format(wallet.currentBalance)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
