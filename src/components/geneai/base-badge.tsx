import type { DnaBase } from '@/lib/dna'
import { cn } from '@/lib/utils'

const baseStyles: Record<DnaBase, string> = {
  A: 'border-chart-1/30 bg-chart-1/10 text-chart-1',
  T: 'border-chart-2/30 bg-chart-2/10 text-chart-2',
  G: 'border-chart-4/30 bg-chart-4/10 text-chart-4',
  C: 'border-chart-3/30 bg-chart-3/10 text-chart-3',
  N: 'border-chart-5/30 bg-chart-5/10 text-chart-5',
}

const baseNames: Record<DnaBase, string> = {
  A: '腺嘌呤',
  T: '胸腺嘧啶',
  G: '鸟嘌呤',
  C: '胞嘧啶',
  N: '未知碱基',
}

type BaseBadgeProps = {
  base: string
  count?: number
  className?: string
}

export function BaseBadge({ base, count, className }: BaseBadgeProps) {
  const key =
    (base.toUpperCase() as DnaBase) in baseStyles
      ? (base.toUpperCase() as DnaBase)
      : 'N'
  return (
    <span
      title={baseNames[key]}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] leading-none font-semibold',
        baseStyles[key],
        className
      )}
    >
      {key}
      {count !== undefined ? (
        <span className='font-sans text-[10px] font-medium tabular-nums opacity-80'>
          {count}
        </span>
      ) : null}
    </span>
  )
}

export function BaseLegend({ className }: { className?: string }) {
  const bases: DnaBase[] = ['A', 'T', 'G', 'C', 'N']
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {bases.map((base) => (
        <BaseBadge key={base} base={base} />
      ))}
    </div>
  )
}
