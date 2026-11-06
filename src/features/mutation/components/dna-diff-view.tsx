import type { MutationAnalysis } from '@/types/api'
import { cn } from '@/lib/utils'

type DnaDiffViewProps = {
  analysis: MutationAnalysis
}

const TYPE_LABEL: Record<MutationAnalysis['mutation']['type'], string> = {
  substitution: '替换',
  insertion: '插入',
  deletion: '缺失',
}

function clampWindow(start: number, end: number, length: number) {
  const from = Math.max(0, Math.min(start, end) - 24)
  const to = Math.min(length, Math.max(start, end) + 24)
  return { from, to }
}

function SequenceRow({
  label,
  sequence,
  start,
  from,
  to,
  highlightFrom,
  highlightTo,
  tone,
}: {
  label: string
  sequence: string
  start: number
  from: number
  to: number
  highlightFrom: number
  highlightTo: number
  tone: 'original' | 'mutated'
}) {
  const visible = sequence.slice(from, to)
  return (
    <div className='flex items-start gap-3'>
      <span className='mt-1 w-10 shrink-0 text-[11px] font-medium text-muted-foreground'>
        {label}
      </span>
      <div className='min-w-0 flex-1 font-mono text-[13px] leading-7 break-all'>
        {from > 0 ? <span className='text-muted-foreground'>…</span> : null}
        {visible.split('').map((char, index) => {
          const absolute = from + index
          const highlighted =
            absolute >= highlightFrom && absolute < highlightTo
          return (
            <span
              key={absolute}
              title={`第 ${absolute + 1} 位 · ${char}`}
              className={cn(
                'rounded-[3px] px-[1px]',
                highlighted
                  ? tone === 'original'
                    ? 'bg-destructive/15 font-semibold text-destructive'
                    : 'bg-chart-3/20 font-semibold text-chart-3'
                  : 'text-foreground/85'
              )}
            >
              {char}
            </span>
          )
        })}
        {to < sequence.length ? (
          <span className='text-muted-foreground'>…</span>
        ) : null}
        <span className='ms-2 text-[11px] text-muted-foreground'>
          (显示第 {start + 1} 位起)
        </span>
      </div>
    </div>
  )
}

export function DnaDiffView({ analysis }: DnaDiffViewProps) {
  const { mutation, originalSequence, mutatedSequence } = analysis
  const isInsertion = mutation.type === 'insertion'
  const refFrom = isInsertion ? mutation.position : mutation.position - 1
  const refLength =
    mutation.type === 'deletion'
      ? Math.max(1, mutation.ref.length)
      : mutation.type === 'substitution'
        ? Math.max(1, mutation.ref.length)
        : 0
  const mutFrom = isInsertion ? mutation.position : mutation.position - 1
  const mutLength =
    mutation.type === 'deletion' ? 0 : Math.max(mutation.alt.length, 0)

  const originalWindow = clampWindow(
    refFrom,
    refFrom + refLength,
    originalSequence.length
  )
  const mutatedWindow = clampWindow(
    mutFrom,
    mutFrom + mutLength,
    mutatedSequence.length
  )

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground'>
        <span className='rounded-md bg-muted px-2 py-1'>
          {TYPE_LABEL[mutation.type]} · {mutation.position} 位
        </span>
        <span>
          {isInsertion
            ? `在第 ${mutation.position} 位之后插入`
            : mutation.type === 'deletion'
              ? `删除第 ${mutation.position} 位起的 ${refLength} 个碱基`
              : `第 ${mutation.position} 位 ${mutation.ref || '—'} → ${mutation.alt}`}
        </span>
        <span className='ms-auto'>坐标均为 1-based</span>
      </div>

      <div className='space-y-3 rounded-lg border border-border/70 bg-muted/25 p-3'>
        <SequenceRow
          label='原始'
          sequence={originalSequence}
          start={originalWindow.from}
          from={originalWindow.from}
          to={originalWindow.to}
          highlightFrom={refFrom}
          highlightTo={refFrom + refLength}
          tone='original'
        />
        <div className='flex items-center gap-2 ps-[3.25rem] text-[11px] text-muted-foreground'>
          <span className='h-px flex-1 bg-border' />
          <span>
            {mutation.type === 'deletion'
              ? `缺失 ${mutation.deletedSequence}`
              : mutation.type === 'insertion'
                ? `插入 ${mutation.insertedSequence}`
                : `${mutation.ref} → ${mutation.alt}`}
          </span>
          <span className='h-px flex-1 bg-border' />
        </div>
        <SequenceRow
          label='突变后'
          sequence={mutatedSequence}
          start={0}
          from={mutatedWindow.from}
          to={mutatedWindow.to}
          highlightFrom={mutFrom}
          highlightTo={mutFrom + mutLength}
          tone='mutated'
        />
      </div>

      <div className='flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground'>
        <span className='inline-flex items-center gap-1.5'>
          <span className='size-2.5 rounded-sm bg-destructive/30' />
          原始序列中被替换/缺失的碱基
        </span>
        <span className='inline-flex items-center gap-1.5'>
          <span className='size-2.5 rounded-sm bg-chart-3/40' />
          突变后新增/替换的碱基
        </span>
        <span>序列过长时仅显示变异位点附近窗口。</span>
      </div>
    </div>
  )
}
