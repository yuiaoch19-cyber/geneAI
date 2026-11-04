import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

type ChartCardProps = {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: ChartCardProps) {
  return (
    <Card
      className={cn(
        'gap-0 overflow-hidden rounded-xl border-border/80 py-0 shadow-card',
        className
      )}
    >
      <div className='flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4'>
        <div className='min-w-0 space-y-1'>
          <h2 className='text-sm font-semibold tracking-tight text-foreground'>
            {title}
          </h2>
          {description ? (
            <p className='text-xs leading-relaxed text-muted-foreground'>
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className='shrink-0'>{action}</div> : null}
      </div>
      <div className={cn('flex-1 px-5 py-5', bodyClassName)}>{children}</div>
    </Card>
  )
}
