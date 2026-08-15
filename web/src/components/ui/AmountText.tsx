import { useCurrency } from '@/state/useCurrency'
import { cn } from '@/lib/cn'

interface AmountTextProps {
  amount: number
  type: 'income' | 'expense'
  className?: string
  signed?: boolean
}

// Financial sign is always paired with color AND a +/- glyph, never color
// alone, so the value stays legible without relying on color perception.
export function AmountText({ amount, type, className, signed = true }: AmountTextProps) {
  const { format } = useCurrency()
  const signedAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount)
  return (
    <span
      className={cn('font-numeric font-bold', type === 'income' ? 'text-positive' : 'text-negative', className)}
    >
      {format(signedAmount, { signed })}
    </span>
  )
}
