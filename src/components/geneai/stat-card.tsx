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
        'group relative gap-0 overflow-hidden rounded-2xl border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.72))] py-0 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-float dark:bg-none',
        className
      )}
    >
      <span
        aria-hidden
        className='pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-70 dark:via-white/10'
      />
      <div className='flex items-start justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-2'>
        <p className='text-[12.5px] font-medium tracking-wide text-muted-foreground'>
          {label}
        </p>
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-200 ring-inset group-hover:scale-105',
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
