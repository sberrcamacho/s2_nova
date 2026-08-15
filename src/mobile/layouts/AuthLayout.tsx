import type { ReactNode } from 'react'
import { Logo } from '@/components/ui/Logo'
import { Sparkle } from '@/components/ui/Sparkle'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex h-full flex-col overflow-y-auto">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-70"
        style={{
          background:
            'radial-gradient(120% 100% at 50% 0%, var(--color-accent-soft) 0%, transparent 65%)',
        }}
        aria-hidden="true"
      />
      <Sparkle size={14} className="pointer-events-none absolute right-10 top-16 text-highlight opacity-60 animate-sparkle" />
      <Sparkle size={9} className="pointer-events-none absolute left-8 top-28 text-primary-secondary opacity-50 animate-sparkle" />

      <div className="relative flex flex-1 flex-col px-6 pb-8 pt-12">
        <Logo size="md" className="mb-10" />
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink">{title}</h1>
        <p className="mt-1.5 text-[13.5px] font-medium text-ink-secondary">{subtitle}</p>
        <div className="mt-8 flex-1">{children}</div>
      </div>
    </div>
  )
}
