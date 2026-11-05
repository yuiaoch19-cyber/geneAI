import { Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

function HelixArt() {
  const wave = (sign: number) =>
    Array.from({ length: 95 }, (_, index) => {
      const x = index * 8
      const y = 210 + sign * 100 * Math.sin(x / 105)
      return `${index === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`
    }).join(' ')

  const rungs = Array.from({ length: 27 }, (_, index) => {
    const x = 18 + index * 26
    const y1 = 210 + 100 * Math.sin(x / 105)
    const y2 = 210 - 100 * Math.sin(x / 105)
    return { x, y1, y2, opacity: 0.22 + Math.abs(Math.cos(x / 105)) * 0.38 }
  })

  return (
    <svg
      aria-hidden='true'
      viewBox='0 0 720 420'
      className='pointer-events-none absolute inset-y-0 end-0 h-full w-[64%] min-w-[340px] opacity-50 sm:opacity-95'
      preserveAspectRatio='xMidYMid slice'
    >
      <defs>
        <linearGradient id='helixA' x1='0' y1='1' x2='1' y2='0'>
          <stop offset='0%' stopColor='#93c5fd' stopOpacity='0.15' />
          <stop offset='45%' stopColor='#3b82f6' stopOpacity='0.95' />
          <stop offset='100%' stopColor='#bfdbfe' stopOpacity='0.95' />
        </linearGradient>
        <linearGradient id='helixB' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stopColor='#bfdbfe' stopOpacity='0.95' />
          <stop offset='55%' stopColor='#2563eb' stopOpacity='0.9' />
          <stop offset='100%' stopColor='#1d4ed8' stopOpacity='0.3' />
        </linearGradient>
        <radialGradient id='glow' cx='50%' cy='50%' r='50%'>
          <stop offset='0%' stopColor='#93c5fd' stopOpacity='0.5' />
          <stop offset='100%' stopColor='#93c5fd' stopOpacity='0' />
        </radialGradient>
      </defs>
      <circle cx='430' cy='200' r='210' fill='url(#glow)' />
      <g transform='rotate(-16 360 210)' strokeLinecap='round'>
        <g stroke='#bfdbfe' strokeWidth='2.2'>
          {rungs.map((rung) => (
            <line
              key={rung.x}
              x1={rung.x}
              y1={rung.y1}
              x2={rung.x}
              y2={rung.y2}
              strokeOpacity={rung.opacity}
            />
          ))}
        </g>
        <path
          d={wave(1)}
          fill='none'
          stroke='url(#helixA)'
          strokeWidth='7.5'
          strokeOpacity='0.92'
        />
        <path
          d={wave(-1)}
          fill='none'
          stroke='url(#helixB)'
          strokeWidth='4.5'
          strokeOpacity='0.9'
        />
        {[120, 300, 470, 610].map((x) => (
          <circle
            key={x}
            cx={x}
            cy={210 + 100 * Math.sin(x / 105)}
            r='4'
            fill='#bfdbfe'
            opacity='0.8'
          />
        ))}
      </g>
      <g fill='none' stroke='#93c5fd' strokeOpacity='0.18' strokeWidth='1'>
        <circle cx='520' cy='330' r='46' />
        <circle cx='610' cy='255' r='24' />
        <circle cx='440' cy='64' r='26' />
      </g>
    </svg>
  )
}

type HeroPanelProps = {
  onViewDemo: () => void
}

export function HeroPanel({ onViewDemo }: HeroPanelProps) {
  return (
    <section className='relative overflow-hidden rounded-2xl border border-sky-100/80 bg-[linear-gradient(115deg,#f4f9ff_0%,#eaf4ff_45%,#e3f1ff_100%)] p-6 shadow-card sm:p-8 dark:border-sky-500/15 dark:bg-[linear-gradient(115deg,#101a2d_0%,#12233d_55%,#0f2038_100%)]'>
      <HelixArt />
      <div className='relative max-w-[34rem]'>
        <p className='text-[10px] font-semibold tracking-[0.22em] text-sky-700/70 uppercase dark:text-sky-300/70'>
          Bioinformatics Platform
        </p>
        <h1 className='mt-2 text-[2.35rem] leading-none font-semibold tracking-tight text-slate-900 sm:text-[2.9rem] dark:text-white'>
          Gene<span className='text-primary'>AI</span>
        </h1>
        <p className='mt-3 text-base font-medium text-slate-700 sm:text-lg dark:text-slate-200'>
          专业的 DNA 序列分析与可视化平台
        </p>
        <p className='mt-2 max-w-md text-[13px] leading-relaxed text-slate-500 dark:text-slate-400'>
          探索基因序列，完成碱基统计、GC / AT 含量、互补链与 RNA
          转录，并在本机保存可复现的分析记录。
        </p>
        <div className='mt-6 flex flex-wrap items-center gap-3'>
          <Button
            asChild
            size='lg'
            className='h-10 gap-2 rounded-xl px-5 shadow-[0_12px_24px_-12px_rgba(37,99,235,0.9)] transition-transform hover:-translate-y-0.5'
          >
            <Link to='/analysis'>
              <Play className='size-4 fill-current' />
              开始分析
            </Link>
          </Button>
          <Button
            variant='outline'
            size='lg'
            onClick={onViewDemo}
            className='h-10 gap-2 rounded-xl border-white/70 bg-white/70 px-5 text-slate-700 shadow-sm backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
          >
            <BookOpen className='size-4' />
            查看示例
            <ArrowRight className='size-3.5 opacity-60' />
          </Button>
        </div>
      </div>
    </section>
  )
}
