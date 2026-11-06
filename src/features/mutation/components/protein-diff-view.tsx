import type { MutationAnalysis, ProteinChange } from '@/types/api'
import { cn } from '@/lib/utils'

type ProteinDiffViewProps = {
  analysis: MutationAnalysis
}

function AminoAcid({ char, tone }: { char: string; tone: string }) {
  if (!char) {
    return <span className='text-muted-foreground/40'>·</span>
  }
  return (
    <span
      title={char === '*' ? '终止密码子' : char}
      className={cn(
        'rounded-[3px] px-[1px]',
        char === '*' && 'bg-destructive/15 font-bold text-destructive',
        tone
      )}
    >
      {char}
    </span>
  )
}

function Row({
  label,
  changes,
  side,
}: {
  label: string
  changes: ProteinChange[]
  side: 'original' | 'mutated'
}) {
  return (
    <div className='flex items-start gap-3'>
      <span className='mt-1 w-12 shrink-0 text-[11px] font-medium text-muted-foreground'>
        {label}
      </span>
      <div className='min-w-0 flex-1 font-mono text-sm leading-7 break-all'>
        {changes.map((change, index) => {
          const text = side === 'original' ? change.original : change.mutated
          const isInsertion = change.type === 'insertion'
          const isDeletion = change.type === 'deletion'
          if (
            (side === 'original' && isInsertion) ||
            (side === 'mutated' && isDeletion)
          ) {
            return (
              <span key={index} className='px-0.5 text-muted-foreground/40'>
                ·
              </span>
            )
          }
          const tone =
            change.type === 'equal'
              ? 'text-foreground/80'
              : change.type === 'substitution'
                ? 'bg-chart-4/20 font-semibold text-chart-4'
                : side === 'mutated'
                  ? 'bg-chart-3/20 font-semibold text-chart-3'
                  : 'bg-destructive/15 font-semibold text-destructive line-through decoration-destructive/40'
          return (
            <span key={index}>
              {text.split('').map((char, charIndex) => (
                <AminoAcid key={charIndex} char={char} tone={tone} />
              ))}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function ProteinDiffView({ analysis }: ProteinDiffViewProps) {
  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {[
          ['原始蛋白', `${analysis.originalProteinLength} aa`],
          ['突变后蛋白', `${analysis.mutatedProteinLength} aa`],
          [
            '长度变化',
            `${analysis.proteinLengthDelta >= 0 ? '+' : ''}${analysis.proteinLengthDelta} aa`,
          ],
          ['提前终止', analysis.isPrematureStop ? '是' : '否'],
        ].map(([label, value]) => (
          <div
            key={label}
            className='rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5'
          >
            <p className='text-[11px] text-muted-foreground'>{label}</p>
            <p className='mt-1 text-sm font-semibold tabular-nums'>{value}</p>
          </div>
        ))}
      </div>

      <div className='space-y-2 rounded-lg border border-border/70 bg-muted/25 p-3'>
        <Row label='原始' changes={analysis.proteinChanges} side='original' />
        <div className='h-px bg-border/70' />
        <Row label='突变后' changes={analysis.proteinChanges} side='mutated' />
      </div>

      <div className='flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground'>
        <span className='inline-flex items-center gap-1.5'>
          <span className='size-2.5 rounded-sm bg-chart-4/40' /> 氨基酸替换
        </span>
        <span className='inline-flex items-center gap-1.5'>
          <span className='size-2.5 rounded-sm bg-chart-3/40' /> 新增氨基酸
        </span>
        <span className='inline-flex items-center gap-1.5'>
          <span className='size-2.5 rounded-sm bg-destructive/30' /> 缺失氨基酸
        </span>
        <span className='inline-flex items-center gap-1.5'>
          <span className='rounded bg-destructive/15 px-1 font-bold text-destructive'>
            *
          </span>
          终止密码子
        </span>
      </div>
    </div>
  )
}
