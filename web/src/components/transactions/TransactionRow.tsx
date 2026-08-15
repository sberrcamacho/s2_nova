import { categoryMap } from '@/data/categories'
import { AmountText } from '@/components/ui/AmountText'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { formatShortDate } from '@/lib/date'
import type { Transaction } from '@/types'
import { cn } from '@/lib/cn'

interface TransactionRowProps {
  transaction: Transaction
  onClick?: () => void
  showDate?: boolean
  className?: string
}

export function TransactionRow({ transaction, onClick, showDate = true, className }: TransactionRowProps) {
  const category = categoryMap[transaction.category]
  const Comp = onClick ? 'button' : 'div'

  return (
    <Comp
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5 text-left transition-colors',
        onClick && 'hover:bg-bg-secondary active:scale-[0.995]',
        className,
      )}
    >
      <CategoryIcon category={transaction.category} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-ink">{transaction.description}</p>
        <p className="truncate text-xs text-ink-tertiary">
          {transaction.merchant ?? category?.label}
          {showDate && ` · ${formatShortDate(transaction.date)}`}
        </p>
      </div>
      <AmountText amount={transaction.amount} type={transaction.type} className="shrink-0 text-[13.5px]" />
    </Comp>
  )
}
