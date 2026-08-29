import { cn } from '@/lib/cn'

// `tone="inverted"` swaps the theme-reactive gray shimmer for a white-based
// one, for permanently-dark surfaces (the balance hero card, the login
// brand panel) — same "inverted" convention `Logo`/`LogoMark` already use.
export function Skeleton({ className, tone = 'default' }: { className?: string; tone?: 'default' | 'inverted' }) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-[var(--radius-sm)] bg-[length:200%_100%]',
        tone === 'default' && 'bg-bg-secondary',
        className,
      )}
      style={{
        backgroundImage:
          tone === 'inverted'
            ? 'linear-gradient(90deg, rgba(255,255,255,.12) 25%, rgba(255,255,255,.24) 50%, rgba(255,255,255,.12) 75%)'
            : 'linear-gradient(90deg, var(--color-bg-secondary) 25%, var(--color-border) 50%, var(--color-bg-secondary) 75%)',
      }}
      aria-hidden="true"
    />
  )
}

export function SkeletonRows({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}
