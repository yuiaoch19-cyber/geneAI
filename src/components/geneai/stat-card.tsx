import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

const toneStyles = {
  blue: 'bg-chart-1/10 text-chart-1 ring-chart-1/15',
  teal: 'bg-chart-3/10 text-chart-3 ring-chart-3/15',
  violet: 'bg-chart-2/10 text-chart-2 ring-chart-2/15',
  amber: 'bg-chart-4/10 text-chart-4 ring-chart-4/15',
} as const

export type StatTone = keyof typeof toneStyles

type StatCardProps = {
  label: string
  value: React.ReactNode
  unit?: string
  hint?: string
  icon: LucideIcon
  tone?: StatTone
  className?: string
}

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = 'blue',
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'gap-0 rounded-2xl border-border/60 py-0 shadow-card transition-shadow hover:shadow-[0_18px_40px_-28px_rgba(30,58,138,0.5)]',
        className
      )}
    >
      <div className='flex items-start justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-2'>
        <p className='text-[13px] font-medium text-muted-foreground'>{label}</p>
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full ring-1 ring-inset',
            toneStyles[tone]
          )}
        >
          <Icon className='size-4.5' strokeWidth={1.9} />
        </span>
      </div>
      <div className='px-4 pb-4 sm:px-5 sm:pb-5'>
        <div className='flex items-baseline gap-1.5'>
          <span className='text-3xl leading-none font-semibold tracking-tight text-foreground tabular-nums'>
            {value}
          </span>
          {unit ? (
            <span className='text-xs font-medium text-muted-foreground'>
              {unit}
            </span>
          ) : null}
        </div>
        {hint ? (
          <p className='mt-2 line-clamp-2 text-[11px] text-muted-foreground sm:line-clamp-1'>
            {hint}
          </p>
        ) : null}
      </div>
    </Card>
  )
}
