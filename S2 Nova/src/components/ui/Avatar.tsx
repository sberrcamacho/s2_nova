import { cn } from '@/lib/cn'

interface AvatarProps {
  initials: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-xl' }

export function Avatar({ initials, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-secondary font-bold text-on-primary',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {initials}
    </div>
  )
}
