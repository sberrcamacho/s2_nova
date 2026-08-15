import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'

interface MobileHeaderProps {
  title?: string
  onBack?: boolean | (() => void)
  action?: ReactNode
  className?: string
}

export function MobileHeader({ title, onBack, action, className }: MobileHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className={`flex h-14 shrink-0 items-center justify-between gap-2 px-4 ${className ?? ''}`}>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {onBack && (
          <IconButton
            icon={<ChevronLeft className="h-5 w-5" />}
            label="Volver"
            variant="ghost"
            size="sm"
            onClick={typeof onBack === 'function' ? onBack : () => navigate(-1)}
            className="-ml-1.5"
          />
        )}
        {title && <h1 className="truncate text-[17px] font-bold text-ink">{title}</h1>}
      </div>
      {action}
    </header>
  )
}
