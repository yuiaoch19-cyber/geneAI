import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

const toneStyles = {
  blue: 'bg-chart-2/10 text-chart-2 ring-chart-2/20',
  teal: 'bg-chart-1/10 text-chart-1 ring-chart-1/20',
  violet: 'bg-chart-3/10 text-chart-3 ring-chart-3/20',
  amber: 'bg-chart-4/10 text-chart-4 ring-chart-4/20',
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
        'gap-0 rounded-xl border-border/80 py-0 shadow-card',
        className
      )}
    >
      <div className='flex items-start justify-between gap-3 p-5 pb-3'>
        <p className='text-sm font-medium text-muted-foreground'>{label}</p>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
            toneStyles[tone]
          )}
        >
          <Icon className='size-4.5' strokeWidth={1.9} />
        </span>
      </div>
      <div className='px-5 pb-5'>
        <div className='flex items-baseline gap-1.5'>
          <span className='text-[1.75rem] leading-none font-semibold tracking-tight text-foreground tabular-nums'>
            {value}
          </span>
          {unit ? (
            <span className='text-xs font-medium text-muted-foreground'>
              {unit}
            </span>
          ) : null}
        </div>
        {hint ? (
          <p className='mt-2 line-clamp-1 text-xs text-muted-foreground'>
            {hint}
          </p>
        ) : null}
      </div>
    </Card>
  )
}
