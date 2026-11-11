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
      <div className='min-w-0 space-y-2.5'>
        {eyebrow ? (
          <p className='text-[10.5px] font-semibold tracking-[0.2em] text-primary/90 uppercase'>
            {eyebrow}
          </p>
        ) : null}
        <h1 className='text-[26px] leading-tight font-semibold tracking-tight text-foreground sm:text-[28px]'>
          {title}
        </h1>
        {description ? (
          <p className='max-w-2xl text-[13.5px] leading-relaxed text-pretty text-muted-foreground'>
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
