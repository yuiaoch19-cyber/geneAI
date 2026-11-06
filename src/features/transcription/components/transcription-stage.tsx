import { useEffect, useRef } from 'react'
import type { TranscriptionResult } from '@/types/api'
import { ChevronRight, Dna, Waves } from 'lucide-react'
import { BASE_NAMES, baseColor } from '../colors'

type TranscriptionStageProps = {
  transcription: TranscriptionResult
  rnaCount: number
  currentBase: number | null
}

const WINDOW = 18

export function TranscriptionStage({
  transcription,
  rnaCount,
  currentBase,
}: TranscriptionStageProps) {
  const { templateSequence, rna } = transcription
  const focus = currentBase ?? 0
  const start = Math.max(
    0,
    Math.min(focus - 5, Math.max(0, templateSequence.length - WINDOW))
  )
  const view = templateSequence.slice(start, start + WINDOW).split('')
  const currentInView =
    currentBase !== null &&
    currentBase >= start &&
    currentBase < start + view.length
      ? currentBase - start
      : null
  const currentTemplate =
    currentBase !== null ? templateSequence[currentBase] : null
  const currentRna = currentBase !== null ? rna[currentBase] : null
  const added = rna.slice(0, rnaCount)
  const activeRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [currentBase])

  return (
    <div className='space-y-4'>
      <div className='relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-b from-sky-50/80 to-white p-4 dark:from-slate-900 dark:to-slate-950'>
        <div className='mb-10 flex items-center justify-between text-[11px] text-muted-foreground'>
          <span className='inline-flex items-center gap-1.5 font-medium text-violet-600 dark:text-violet-400'>
            <Dna className='size-3.5' /> 模板链 3′ → 5′
          </span>
          <span>
            {currentBase !== null
              ? `正在读取第 ${currentBase + 1} 位`
              : '等待开始'}
          </span>
        </div>

        <div className='overflow-x-auto pb-1'>
          <div className='flex min-w-max items-end gap-1.5 px-1'>
            {view.map((base, index) => {
              const active = index === currentInView
              return (
                <div
                  key={`${start + index}`}
                  ref={active ? activeRef : undefined}
                  className='relative flex-1'
                >
                  {active ? (
                    <div className='absolute -top-9 left-1/2 z-10 -translate-x-1/2 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-medium whitespace-nowrap text-white shadow-lg shadow-blue-600/30'>
                      RNA 聚合酶
                    </div>
                  ) : null}
                  <div
                    className={[
                      'flex h-9 min-w-7 items-center justify-center rounded-md border font-mono text-sm font-semibold transition-all',
                      active
                        ? 'scale-110 border-blue-500 bg-white shadow-md shadow-blue-500/20 dark:bg-slate-900'
                        : 'border-border/60 bg-white/70 dark:bg-slate-900/60',
                    ].join(' ')}
                    style={{ color: baseColor(base) }}
                  >
                    {base}
                  </div>
                  <div className='mt-1 text-center text-[9px] text-muted-foreground'>
                    {start + index + 1}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className='mt-4 flex items-center gap-3'>
          <div className='h-px flex-1 bg-border/70' />
          <div className='flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs shadow-sm'>
            <span className='text-muted-foreground'>配对</span>
            <span
              className='font-mono text-sm font-bold'
              style={{
                color: currentTemplate ? baseColor(currentTemplate) : undefined,
              }}
            >
              {currentTemplate ?? '—'}
            </span>
            <ChevronRight className='size-3.5 text-muted-foreground' />
            <span className='font-mono text-sm font-bold text-rose-500'>
              {currentRna ?? '—'}
            </span>
          </div>
          <div className='h-px flex-1 bg-border/70' />
        </div>
      </div>

      <div>
        <div className='mb-2 flex items-center justify-between'>
          <span className='inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground'>
            <Waves className='size-3.5' /> 新生 RNA（5′ → 3′）
          </span>
          <span className='text-[11px] text-muted-foreground'>
            {rnaCount} / {rna.length} nt
          </span>
        </div>
        <div className='min-h-14 overflow-x-auto rounded-xl border border-border/70 bg-muted/25 px-3 py-3 font-mono text-sm tracking-[0.12em]'>
          {added ? (
            <span>
              {added
                .slice(0, -1)
                .split('')
                .map((base, index) => (
                  <span key={index} style={{ color: baseColor(base) }}>
                    {base}
                  </span>
                ))}
              <span
                key={`new-${rnaCount}`}
                className='ml-0.5 inline-block rounded-sm bg-rose-500/15 px-0.5 text-rose-500'
                style={{ color: baseColor(added.slice(-1)) }}
              >
                {added.slice(-1)}
              </span>
            </span>
          ) : (
            <span className='text-xs tracking-normal text-muted-foreground'>
              点击播放后，RNA 聚合酶会按模板链逐个加入碱基。
            </span>
          )}
        </div>
        <p className='mt-2 text-[11px] leading-relaxed text-muted-foreground'>
          模板链按 3′→5′ 被读取，RNA 按 5′→3′ 延伸；A 配对 U，T 配对 A，C 配对
          G，G 配对 C。当前模板碱基 {currentTemplate ?? '—'}（
          {currentTemplate ? (BASE_NAMES[currentTemplate] ?? '未知') : '未开始'}
          ）。
        </p>
      </div>
    </div>
  )
}
