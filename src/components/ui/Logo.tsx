import { Sparkle } from '@/components/ui/Sparkle'
import { cn } from '@/lib/cn'

interface LogoProps {
  variant?: 'full' | 'mark'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const MARK_SIZES = { sm: 32, md: 40, lg: 56 }
const S2_SIZES = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' }
const NOVA_SIZES = { sm: 'text-[9px]', md: 'text-[10px]', lg: 'text-xs' }

// The S2 Nova mark: a rounded square with "S2" as the dominant glyph and a
// small sparkle riding its corner. Used standalone (app icon, favicon,
// avatar fallback) or paired with the wordmark in headers/sidebars.
export function LogoMark({ size = 'md', className }: { size?: LogoProps['size']; className?: string }) {
  const px = MARK_SIZES[size ?? 'md']
  return (
    <div
      className={cn('relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-secondary text-on-primary shadow-primary', className)}
      style={{ width: px, height: px, boxShadow: 'var(--shadow-primary)' }}
      aria-hidden="true"
    >
      <span className={cn('font-sans font-extrabold tracking-tight', S2_SIZES[size ?? 'md'])}>S2</span>
      <Sparkle size={px * 0.3} className="absolute -right-1 -top-1 text-highlight animate-sparkle" />
    </div>
  )
}

export function Logo({ variant = 'full', size = 'md', className }: LogoProps) {
  if (variant === 'mark') return <LogoMark size={size} className={className} />

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <div className="flex flex-col leading-none">
        <span className={cn('font-extrabold tracking-tight text-ink', S2_SIZES[size])} style={{ fontSize: size === 'lg' ? 20 : size === 'md' ? 16 : 14 }}>
          S2 <span className="font-bold text-ink-secondary" style={{ fontWeight: 600 }}>Nova</span>
        </span>
        <span className={cn('font-semibold uppercase tracking-[0.18em] text-ink-tertiary', NOVA_SIZES[size])}>
          Finanzas personales
        </span>
      </div>
    </div>
  )
}
