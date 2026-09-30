import { tr } from '@/lib/i18n/translations'
import { LogoMark } from '@/components/ui/Logo'

export function SplashScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-bg">
      <LogoMark size="lg" className="animate-fade-in" />
      <div>
        <p className="text-center text-base font-extrabold tracking-tight text-ink">
          S2 <span className="text-ink-secondary">Nova</span>
        </p>
        <p className="text-center text-caption font-semibold uppercase tracking-[.04em] text-ink-tertiary">
          {tr('brand.tagline')}
        </p>
      </div>
    </div>
  )
}
