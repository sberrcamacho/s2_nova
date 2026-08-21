import { useEffect, useState } from 'react'
import { Banknote, Bitcoin, Landmark, PiggyBank, Wallet as WalletIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { accountService } from '@/services/accountService'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { walletTypeTranslationKey } from '@/lib/i18n/translations'
import type { Wallet, WalletType } from '@/types'

const WALLET_ICON: Record<WalletType, typeof WalletIcon> = {
  cash: Banknote,
  bank: Landmark,
  savings: PiggyBank,
  crypto: Bitcoin,
  other: WalletIcon,
}

// Read-only: creating/editing wallets is Android's job (micro-management),
// Web only shows balances for analysis — see root AGENTS.md.
export default function WalletsPage() {
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

  const total = wallets.reduce((sum, w) => sum + w.currentBalance, 0)

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">{t('wallets.totalBalance')}</p>
        <p className="mt-1 font-numeric text-2xl font-extrabold text-ink">{format(total)}</p>
      </Card>

      {!isLoading && wallets.length === 0 && (
        <Card className="p-8 text-center">
          <WalletIcon className="mx-auto h-8 w-8 text-ink-tertiary" />
          <p className="mt-3 text-sm font-bold text-ink">{t('wallets.emptyTitle')}</p>
          <p className="mt-1 text-xs text-ink-tertiary">{t('wallets.emptySubtitleReadOnly')}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {wallets.map((wallet) => {
          const Icon = WALLET_ICON[wallet.type]
          return (
            <Card key={wallet.id} className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-ink">{wallet.name}</p>
                  <p className="text-xs text-ink-tertiary">{t(walletTypeTranslationKey(wallet.type))}</p>
                </div>
              </div>
              <p className="mt-4 font-numeric text-lg font-extrabold text-ink">{format(wallet.currentBalance)}</p>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
