import logoMarkDark from '@/assets/logo-mark-dark.png'
import logoMarkLight from '@/assets/logo-mark-light.png'
import { cn } from '@/lib/cn'
import { useTheme } from '@/state/ThemeContext'

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

// The S2 Nova mark: a rounded hexagon glyph with a rising bar chart, shipped
// as two theme-specific renders (a dark card for dark surfaces, a light card
// for light surfaces) — same asset pairing as the app icon. `tone="inverted"`
// pins the dark render on surfaces that stay dark regardless of the app
// theme (e.g. the sidebar); otherwise it follows the live theme.
export function LogoMark({ size = 'md', tone = 'default', className }: { size?: LogoProps['size']; tone?: LogoProps['tone']; className?: string }) {
  const { theme } = useTheme()
  const px = MARK_SIZES[size ?? 'md']
  const src = tone === 'inverted' || theme === 'dark' ? logoMarkDark : logoMarkLight
  return (
    <img
      src={src}
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
  if (variant === 'mark') return <LogoMark size={size} tone={tone} className={className} />

  const inverted = tone === 'inverted'

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} tone={tone} />
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
