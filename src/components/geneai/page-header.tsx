import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className='min-w-0 space-y-2'>
        {eyebrow ? (
          <p className='text-[11px] font-semibold tracking-[0.18em] text-primary uppercase'>
            {eyebrow}
          </p>
        ) : null}
        <h1 className='text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]'>
          {title}
        </h1>
        {description ? (
          <p className='max-w-2xl text-sm leading-relaxed text-muted-foreground'>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className='flex flex-wrap items-center gap-2 sm:pt-1'>
          {actions}
        </div>
      ) : null}
    </div>
  )
}
