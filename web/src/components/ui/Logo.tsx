import logoMark from '@/assets/logo-mark.png'
import { cn } from '@/lib/cn'

interface LogoProps {
  variant?: 'full' | 'mark'
  size?: 'sm' | 'md' | 'lg'
  /** 'inverted' forces light text — for permanently-dark surfaces like the sidebar, independent of the app's light/dark theme. */
  tone?: 'default' | 'inverted'
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
    <img
      src={logoMark}
      width={px}
      height={px}
      className={cn('shrink-0 select-none', className)}
      style={{ width: px, height: px }}
      alt=""
      aria-hidden="true"
    />
  )
}

export function Logo({ variant = 'full', size = 'md', tone = 'default', className }: LogoProps) {
  if (variant === 'mark') return <LogoMark size={size} className={className} />

  const inverted = tone === 'inverted'

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <div className="flex flex-col leading-none">
        <span
          className={cn('font-extrabold tracking-tight', inverted ? 'text-white' : 'text-ink', S2_SIZES[size])}
          style={{ fontSize: size === 'lg' ? 20 : size === 'md' ? 16 : 14 }}
        >
          S2 <span className={cn('font-bold', inverted ? 'text-white/60' : 'text-ink-secondary')} style={{ fontWeight: 600 }}>Nova</span>
        </span>
        <span className={cn('font-semibold uppercase tracking-[0.18em]', inverted ? 'text-white/35' : 'text-ink-tertiary', NOVA_SIZES[size])}>
          Finanzas personales
        </span>
      </div>
    </div>
  )
}
