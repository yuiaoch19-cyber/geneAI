import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DnaMark } from './dna/dna-mark'

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
        'relative flex flex-col items-center justify-center gap-3.5 overflow-hidden rounded-2xl border border-dashed border-border/80 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(37,99,235,0.05),transparent_60%)] text-center',
        compact ? 'px-4 py-7' : 'px-6 py-12',
        className
      )}
    >
      <DnaMark className='pointer-events-none absolute -end-2 -bottom-5 size-28 rotate-12 text-primary/[0.06]' />
      <span className='relative flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-card text-primary/80 shadow-sm'>
        <Icon className='size-5' strokeWidth={1.65} />
      </span>
      <div className='relative space-y-1'>
        <p className='text-sm font-medium text-foreground'>{title}</p>
        {description ? (
          <p className='mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground'>
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className='relative pt-1'>{action}</div> : null}
    </div>
  )
}
