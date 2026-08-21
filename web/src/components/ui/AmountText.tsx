import { useCurrency } from '@/state/useCurrency'
import { cn } from '@/lib/cn'

interface AmountTextProps {
  amount: number
  type: 'income' | 'expense' | 'transfer'
  className?: string
  signed?: boolean
}

// Financial sign is always paired with color AND a +/- glyph, never color
// alone, so the value stays legible without relying on color perception.
// A transfer between the user's own wallets changes neither net worth nor
// carries an inherent sign, so it renders neutral and unsigned.
export function AmountText({ amount, type, className, signed = true }: AmountTextProps) {
  const { format } = useCurrency()
  const isTransfer = type === 'transfer'
  const signedAmount = isTransfer ? Math.abs(amount) : type === 'expense' ? -Math.abs(amount) : Math.abs(amount)
  return (
    <span
      className={cn(
        'font-numeric font-bold',
        isTransfer ? 'text-ink-secondary' : type === 'income' ? 'text-positive' : 'text-negative',
        className,
      )}
    >
      {format(signedAmount, { signed: isTransfer ? false : signed })}
    </span>
  )
}
