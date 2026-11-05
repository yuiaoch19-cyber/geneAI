import type { ComparisonResult, SequenceDifference } from '@/types/api'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const BLOCK_SIZE = 60

type CellKind = 'match' | 'substitution' | 'insertion' | 'deletion' | 'gap'

function classify(refBase: string, queryBase: string): CellKind {
  if (refBase === '-' && queryBase === '-') return 'gap'
  if (refBase === '-') return 'insertion'
  if (queryBase === '-') return 'deletion'
  return refBase === queryBase ? 'match' : 'substitution'
}

const CELL_CLASS: Record<CellKind, string> = {
  match: 'text-muted-foreground',
  substitution: 'rounded-[2px] bg-chart-4/25 text-chart-4',
  insertion: 'rounded-[2px] bg-chart-1/25 text-chart-1',
  deletion: 'rounded-[2px] bg-destructive/15 text-destructive',
  gap: 'text-border',
}

function LegendItem({
  className,
  label,
}: {
  className: string
  label: string
}) {
  return (
    <span className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
      <span className={cn('size-2.5 rounded-[2px]', className)} />
      {label}
    </span>
  )
}

export function AlignmentLegend() {
  return (
    <div className='flex flex-wrap items-center gap-x-4 gap-y-1.5'>
      <LegendItem className='bg-muted-foreground/30' label='相同' />
      <LegendItem className='bg-chart-4/40' label='替换' />
      <LegendItem className='bg-chart-1/40' label='插入（查询多出）' />
      <LegendItem className='bg-destructive/40' label='缺失（参考多出）' />
      <LegendItem className='bg-border' label='空位' />
    </div>
  )
}

function AlignmentRows({ result }: { result: ComparisonResult }) {
  const blocks: number[] = []
  for (let start = 0; start < result.alignmentLength; start += BLOCK_SIZE) {
    blocks.push(start)
  }

  let refCursor = 0

  return (
    <div className='space-y-5'>
      {blocks.map((start) => {
        const refSlice = result.alignedReference.slice(
          start,
          start + BLOCK_SIZE
        )
        const querySlice = result.alignedQuery.slice(start, start + BLOCK_SIZE)
        const refStart = refCursor + 1
        refCursor += refSlice.replace(/-/g, '').length

        return (
          <div key={start} className='space-y-1.5'>
            <p className='font-mono text-[10px] text-muted-foreground/80'>
              参考位置 {refStart}–{refCursor}
            </p>
            <div className='overflow-x-auto rounded-md border border-border/60 bg-background/70'>
              <div className='min-w-max space-y-0.5 p-2'>
                {[
                  {
                    label: '参考',
                    value: refSlice,
                    tone: 'border-chart-2/30 bg-chart-2/5 text-chart-2',
                  },
                  {
                    label: '查询',
                    value: querySlice,
                    tone: 'border-chart-1/30 bg-chart-1/5 text-chart-1',
                  },
                ].map((row, rowIndex) => {
                  const other = rowIndex === 0 ? querySlice : refSlice
                  return (
                    <div key={row.label} className='flex items-start gap-2'>
                      <span
                        className={cn(
                          'mt-0.5 w-9 shrink-0 rounded border px-1 py-0.5 text-center text-[10px]',
                          row.tone
                        )}
                      >
                        {row.label}
                      </span>
                      <code className='font-mono text-xs leading-5 whitespace-pre'>
                        {[...row.value].map((base, index) => {
                          const kind =
                            rowIndex === 0
                              ? classify(base, other[index])
                              : classify(other[index], base)
                          const display = base === '-' ? '·' : base
                          return (
                            <span
                              key={`${row.label}-${index}`}
                              className={cn(
                                'inline-block w-[1.05em] text-center',
                                CELL_CLASS[kind]
                              )}
                            >
                              {display}
                            </span>
                          )
                        })}
                      </code>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
      <p className='text-[11px] text-muted-foreground sm:hidden'>
        对齐区域可左右滑动，查看每一列碱基。
      </p>
    </div>
  )
}

const TYPE_META: Record<
  SequenceDifference['type'],
  { label: string; className: string }
> = {
  substitution: {
    label: '替换',
    className: 'border-chart-4/40 bg-chart-4/10 text-chart-4',
  },
  insertion: {
    label: '插入',
    className: 'border-chart-1/40 bg-chart-1/10 text-chart-1',
  },
  deletion: {
    label: '缺失',
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
}

export function DifferenceTable({
  differences,
}: {
  differences: SequenceDifference[]
}) {
  if (differences.length === 0) {
    return (
      <p className='rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground'>
        两条序列完全一致，没有检测到替换、插入或缺失。
      </p>
    )
  }

  return (
    <div className='max-h-80 overflow-auto rounded-lg border border-border/70'>
      <table className='w-full caption-bottom text-xs whitespace-nowrap'>
        <thead className='sticky top-0 bg-muted/80 backdrop-blur'>
          <tr className='border-b border-border/70 text-muted-foreground'>
            <th className='px-2 py-2 text-start font-medium sm:px-3'>序号</th>
            <th className='px-2 py-2 text-start font-medium sm:px-3'>类型</th>
            <th className='px-2 py-2 text-start font-medium sm:px-3'>
              参考位置
            </th>
            <th className='px-2 py-2 text-start font-medium sm:px-3'>
              参考碱基
            </th>
            <th className='px-2 py-2 text-start font-medium sm:px-3'>
              查询碱基
            </th>
          </tr>
        </thead>
        <tbody>
          {differences.map((item, index) => {
            const meta = TYPE_META[item.type]
            return (
              <tr
                key={`${item.type}-${item.refPosition}-${index}`}
                className='border-b border-border/50 last:border-0'
              >
                <td className='px-2 py-1.5 text-muted-foreground sm:px-3'>
                  {index + 1}
                </td>
                <td className='px-2 py-1.5 sm:px-3'>
                  <Badge
                    variant='outline'
                    className={cn('h-5 px-1.5 text-[10px]', meta.className)}
                  >
                    {meta.label}
                  </Badge>
                </td>
                <td className='px-2 py-1.5 font-mono tabular-nums sm:px-3'>
                  {item.type === 'insertion'
                    ? `第 ${item.refPosition} 位后`
                    : item.refPosition}
                </td>
                <td className='px-2 py-1.5 font-mono sm:px-3'>
                  {item.refBase ?? '—'}
                </td>
                <td className='px-2 py-1.5 font-mono sm:px-3'>
                  {item.queryBase ?? '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function AlignmentView({ result }: { result: ComparisonResult }) {
  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <AlignmentLegend />
        <span className='text-[11px] text-muted-foreground'>
          共 {result.alignmentLength.toLocaleString('zh-CN')} 个对齐列
        </span>
      </div>
      <div className='rounded-lg border border-border/70 bg-muted/20 p-3'>
        <AlignmentRows result={result} />
      </div>
    </div>
  )
}
