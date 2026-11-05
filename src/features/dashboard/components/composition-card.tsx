import { formatNumber } from '@/lib/dna'
import { Card } from '@/components/ui/card'

type CompositionCardProps = {
  analysisCount: number
  comparisonCount: number
  totalBases: number
  averageGc: number | null
  isDemo: boolean
}

const ROWS = [
  {
    key: 'analysis',
    label: '单序列分析',
    color: 'bg-chart-1',
    dot: 'bg-chart-1',
  },
  {
    key: 'comparison',
    label: '差异比较',
    color: 'bg-chart-2',
    dot: 'bg-chart-2',
  },
] as const

export function CompositionCard({
  analysisCount,
  comparisonCount,
  totalBases,
  averageGc,
  isDemo,
}: CompositionCardProps) {
  const total = analysisCount + comparisonCount
  const averageLength = analysisCount > 0 ? totalBases / analysisCount : 0

  return (
    <Card className='gap-0 overflow-hidden rounded-2xl border-border/60 py-0 shadow-card'>
      <div className='border-b border-border/60 px-5 py-4'>
        <div className='flex items-center justify-between gap-2'>
          <h2 className='text-sm font-semibold tracking-tight'>分析构成</h2>
          <span className='rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground'>
            {isDemo ? '演示数据' : '本机记录'}
          </span>
        </div>
        <p className='mt-1 text-xs text-muted-foreground'>
          工作区中真实保存的分析与比较记录
        </p>
      </div>

      <div className='space-y-4 px-5 py-4'>
        {ROWS.map((row) => {
          const value = row.key === 'analysis' ? analysisCount : comparisonCount
          const percent = total > 0 ? (value / total) * 100 : 0
          return (
            <div key={row.key} className='space-y-1.5'>
              <div className='flex items-center justify-between text-xs'>
                <span className='flex items-center gap-2 text-muted-foreground'>
                  <span className={`size-1.5 rounded-full ${row.dot}`} />
                  {row.label}
                </span>
                <span className='font-medium tabular-nums'>
                  {formatNumber(value)}
                  <span className='ms-1 text-[10px] font-normal text-muted-foreground'>
                    条
                  </span>
                </span>
              </div>
              <div className='h-1.5 overflow-hidden rounded-full bg-muted'>
                <div
                  className={`h-full rounded-full ${row.color} transition-[width] duration-500`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className='grid grid-cols-3 divide-x divide-border/60 border-t border-border/60'>
        <div className='px-3 py-3 text-center'>
          <p className='font-mono text-sm font-semibold tabular-nums'>
            {formatNumber(totalBases)}
          </p>
          <p className='mt-0.5 text-[10px] text-muted-foreground'>总碱基</p>
        </div>
        <div className='px-3 py-3 text-center'>
          <p className='font-mono text-sm font-semibold tabular-nums'>
            {averageLength > 0 ? Math.round(averageLength) : '—'}
          </p>
          <p className='mt-0.5 text-[10px] text-muted-foreground'>平均长度</p>
        </div>
        <div className='px-3 py-3 text-center'>
          <p className='font-mono text-sm font-semibold tabular-nums'>
            {averageGc === null ? '—' : `${averageGc.toFixed(1)}%`}
          </p>
          <p className='mt-0.5 text-[10px] text-muted-foreground'>平均 GC</p>
        </div>
      </div>
    </Card>
  )
}
