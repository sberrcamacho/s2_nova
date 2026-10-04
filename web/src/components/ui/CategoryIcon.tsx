import {
  Banknote,
  Car,
  CircleEllipsis,
  CreditCard,
  Gift,
  GraduationCap,
  HeartPulse,
  Landmark,
  Laptop,
  Popcorn,
  Receipt,
  RefreshCcw,
  ShoppingBag,
  Smartphone,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { categoryMap } from '@/data/categories'
import type { CategoryId } from '@/types'
import { cn } from '@/lib/cn'

const ICONS: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Car,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  Popcorn,
  Receipt,
  RefreshCcw,
  Wallet,
  Laptop,
  Gift,
  CircleEllipsis,
  Banknote,
  CreditCard,
  Landmark,
  Smartphone,
}

interface CategoryIconProps {
  category: CategoryId
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' }
const ICON_SIZE = { sm: 15, md: 18, lg: 20 }

export function CategoryIcon({ category, size = 'md', className }: CategoryIconProps) {
  const meta = categoryMap[category]
  const Icon = ICONS[meta?.icon ?? 'CircleEllipsis'] ?? CircleEllipsis

  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-[28%]', SIZE[size], className)}
      style={{ backgroundColor: 'var(--color-surface-sunken)', color: `color-mix(in oklab, ${meta?.color ?? '#9C9CAA'} 72%, var(--color-text))` }}
    >
      <Icon size={ICON_SIZE[size]} strokeWidth={2} />
    </div>
  )
}

export function getCategoryIcon(iconName: string): LucideIcon {
  return ICONS[iconName] ?? CircleEllipsis
}
