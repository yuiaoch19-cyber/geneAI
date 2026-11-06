import { useEffect, useRef } from 'react'
import type { CodonResult, TranslationResult } from '@/types/api'
import { ArrowRight, CircleDot } from 'lucide-react'
import { AA_COLORS, AA_NAMES, anticodonFor, baseColor } from '../colors'

type TranslationStageProps = {
  translation: TranslationResult
  codonCount: number
  currentCodon: CodonResult | null
}

export function TranslationStage({
  translation,
  codonCount,
  currentCodon,
}: TranslationStageProps) {
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [currentCodon?.index])

  const translated = translation.codons.slice(0, codonCount)
  const aminoAcids = translated.filter((codon) => !codon.isStop)
  const current = currentCodon
  const color = current
    ? AA_COLORS[current.index % AA_COLORS.length]
    : '#94a3b8'

  return (
    <div className='space-y-5'>
      <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]'>
        <div className='relative flex min-h-52 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-gradient-to-b from-emerald-50/70 to-white px-4 py-8 dark:from-emerald-950/20 dark:to-slate-950'>
          <div className='absolute bottom-4 h-24 w-[72%] rounded-[50%] bg-gradient-to-b from-sky-200/80 to-sky-300/40 blur-[1px] dark:from-sky-900/40 dark:to-sky-800/20' />
          <div className='absolute bottom-0 h-14 w-[58%] rounded-[50%] bg-gradient-to-b from-sky-300/70 to-sky-400/30 dark:from-sky-800/40 dark:to-sky-700/20' />

          <div
            key={current?.index ?? 'idle'}
            className='relative z-10 flex animate-in flex-col items-center gap-2 duration-300 fade-in-0 slide-in-from-top-3'
          >
            {current ? (
              <>
                <div
                  className='flex size-12 items-center justify-center rounded-full text-sm font-bold text-white shadow-lg'
                  style={{ backgroundColor: color }}
                >
                  {current.isStop
                    ? 'Stop'
                    : (AA_NAMES[current.threeLetter] ?? current.threeLetter)}
                </div>
                <span className='text-[10px] font-medium text-muted-foreground'>
                  {current.threeLetter}
                </span>
                <div className='h-9 w-1.5 rounded-full bg-amber-300 dark:bg-amber-500/70' />
                <div className='rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-[0.18em] text-amber-700 dark:border-amber-600/50 dark:bg-amber-500/10 dark:text-amber-300'>
                  {anticodonFor(current.rna)}
                </div>
                <span className='text-[10px] text-muted-foreground'>
                  tRNA 反密码子
                </span>
              </>
            ) : (
              <div className='flex h-32 flex-col items-center justify-center text-xs text-muted-foreground'>
                <CircleDot className='mb-2 size-8 opacity-40' />
                等待 mRNA 进入核糖体
              </div>
            )}

            {current ? (
              <div className='mt-1 flex items-center gap-1 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 shadow-sm'>
                {current.rna.split('').map((base, index) => (
                  <span
                    key={index}
                    className='font-mono text-base font-bold'
                    style={{ color: baseColor(base) }}
                  >
                    {base}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className='flex flex-col justify-between rounded-xl border border-border/70 bg-muted/20 p-4'>
          <div>
            <p className='text-[11px] text-muted-foreground'>当前密码子</p>
            <p className='mt-1 font-mono text-xl font-bold tracking-[0.16em]'>
              {current?.rna ?? '—'}
            </p>
            <p className='mt-1 text-sm font-medium'>
              {current
                ? current.isStop
                  ? '终止密码子'
                  : `${current.threeLetter} · ${AA_NAMES[current.threeLetter] ?? ''}`
                : '尚未开始翻译'}
            </p>
            <p className='mt-1 text-xs text-muted-foreground'>
              {current
                ? `第 ${current.index + 1} 个密码子 · mRNA ${current.start}–${current.end}`
                : `共 ${translation.codons.length} 个密码子`}
            </p>
          </div>
          <div className='mt-4 flex items-end justify-between'>
            <div>
              <p className='text-[11px] text-muted-foreground'>已合成多肽</p>
              <p className='text-2xl font-semibold tabular-nums'>
                {aminoAcids.length}
                <span className='ml-1 text-xs font-normal text-muted-foreground'>
                  aa
                </span>
              </p>
            </div>
            <div className='flex items-center gap-1 text-[11px] text-muted-foreground'>
              <span>5′</span>
              <ArrowRight className='size-3' />
              <span>3′</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className='mb-2 flex items-center justify-between'>
          <span className='text-xs font-medium text-muted-foreground'>
            mRNA 密码子 · 当前第 {Math.max(codonCount, 0)} /{' '}
            {translation.codons.length} 个
          </span>
          <span className='text-[11px] text-muted-foreground'>
            阅读框 +{translation.frame}
          </span>
        </div>
        <div className='flex gap-2 overflow-x-auto pb-2'>
          {translation.codons.map((codon) => {
            const active = current?.index === codon.index
            const done = codon.index < codonCount
            return (
              <div
                key={codon.index}
                ref={active ? activeRef : undefined}
                className={[
                  'shrink-0 rounded-lg border px-2.5 py-1.5 text-center transition-all',
                  active
                    ? 'border-blue-400 bg-blue-50 shadow-sm dark:border-blue-500 dark:bg-blue-950/40'
                    : done
                      ? 'border-border/80 bg-card'
                      : 'border-border/50 bg-muted/20 opacity-60',
                ].join(' ')}
              >
                <div className='flex gap-0.5 font-mono text-sm font-semibold'>
                  {codon.rna.split('').map((base, index) => (
                    <span key={index} style={{ color: baseColor(base) }}>
                      {base}
                    </span>
                  ))}
                </div>
                <div
                  className={[
                    'mt-1 text-[10px]',
                    codon.isStop
                      ? 'font-medium text-destructive'
                      : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {codon.isStop
                    ? 'Stop'
                    : (AA_NAMES[codon.threeLetter] ?? codon.threeLetter)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div className='mb-2 flex items-center justify-between'>
          <span className='text-xs font-medium text-muted-foreground'>
            多肽链 · {aminoAcids.length} 个氨基酸
          </span>
          {translation.stopCodon ? (
            <span className='text-[11px] text-muted-foreground'>
              终止密码子 {translation.stopCodon}
            </span>
          ) : null}
        </div>
        <div className='flex flex-wrap items-center gap-1.5 rounded-xl border border-border/70 bg-muted/15 p-3'>
          {aminoAcids.length ? (
            aminoAcids.map((codon, index) => (
              <span
                key={`${codon.index}-${index}`}
                className='rounded-md px-2 py-1 text-[11px] font-medium text-white shadow-sm'
                style={{
                  backgroundColor: AA_COLORS[index % AA_COLORS.length],
                }}
                title={`${codon.threeLetter} · ${AA_NAMES[codon.threeLetter] ?? ''}`}
              >
                {codon.threeLetter}
              </span>
            ))
          ) : (
            <span className='text-xs text-muted-foreground'>
              目前还没有氨基酸进入多肽链。
            </span>
          )}
          {translation.protein.endsWith('*') ? (
            <span className='rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive'>
              终止
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
