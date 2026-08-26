import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>
        <Card className="p-6 sm:p-8">
          <h1 className="text-xl font-extrabold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-ink-tertiary">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </Card>
        {footer && <div className="mt-5 text-center text-sm text-ink-tertiary">{footer}</div>}
      </div>
    </div>
  )
}
