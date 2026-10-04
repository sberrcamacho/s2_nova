import { useEffect, useState } from 'react'
import { tr } from '@/lib/i18n/translations'
import { LogoMark } from '@/components/ui/Logo'

// Shown while the session is restored on load. Normally a blink; when the
// backend has been idle it can take up to a minute to answer, so after a
// few seconds the wait says so, with an indeterminate bar.
export function SplashScreen() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), 3000)
    return () => window.clearTimeout(id)
  }, [])
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-4" aria-busy="true">
      <LogoMark size="lg" className="animate-fade-in" />
      <div>
        <p className="text-center text-body font-extrabold tracking-tight text-ink">
          S2 <span className="text-ink-secondary">Nova</span>
        </p>
        <p className="text-center text-caption font-semibold uppercase tracking-[.04em] text-ink-tertiary">
          {tr('brand.tagline')}
        </p>
      </div>
      {slow && (
        <div className="mt-2 flex w-full max-w-[320px] animate-fade-in flex-col items-center gap-3" role="status">
          <div
            role="progressbar"
            aria-label={tr('splash.slowTitle')}
            className="h-1 w-40 animate-shimmer rounded-full"
            style={{ backgroundImage: 'linear-gradient(90deg, var(--color-surface-sunken) 0%, var(--color-primary-border) 50%, var(--color-surface-sunken) 100%)', backgroundSize: '200% 100%' }}
          />
          <p className="text-center text-body-sm font-semibold text-ink">{tr('splash.slowTitle')}</p>
          <p className="text-center text-caption text-ink-secondary">{tr('splash.slowHint')}</p>
        </div>
      )}
    </div>
  )
}
