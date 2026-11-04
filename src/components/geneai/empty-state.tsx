import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type EmptyStateIcon = ElementType<{
  className?: string
  strokeWidth?: number
}>

type EmptyStateProps = {
  icon: EmptyStateIcon
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 text-center',
        compact ? 'px-4 py-7' : 'px-6 py-12',
        className
      )}
    >
      <span className='flex size-11 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-xs ring-1 ring-border'>
        <Icon className='size-5' strokeWidth={1.75} />
      </span>
      <div className='space-y-1'>
        <p className='text-sm font-medium text-foreground'>{title}</p>
        {description ? (
          <p className='mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground'>
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className='pt-1'>{action}</div> : null}
    </div>
  )
}
