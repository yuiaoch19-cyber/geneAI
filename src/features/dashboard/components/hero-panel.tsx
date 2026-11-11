import { Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DnaHero } from '@/components/geneai/dna/dna-hero'

type HeroPanelProps = {
  onViewDemo: () => void
}

export function HeroPanel({ onViewDemo }: HeroPanelProps) {
  return (
    <section className='relative min-h-[320px] overflow-hidden rounded-2xl border border-sky-100/80 bg-[linear-gradient(118deg,#f6faff_0%,#edf6ff_46%,#e4f1ff_100%)] px-6 py-7 shadow-card sm:px-9 sm:py-9 dark:border-sky-500/15 dark:bg-[linear-gradient(118deg,#0e1829_0%,#112139_55%,#0d1d33_100%)]'>
      <DnaHero className='absolute inset-y-0 end-0 h-full w-[66%] min-w-[340px] opacity-40 sm:opacity-95 dark:opacity-35 dark:sm:opacity-65' />
      <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(246,250,255,0.98)_0%,rgba(246,250,255,0.86)_38%,rgba(246,250,255,0)_64%)] dark:bg-[linear-gradient(90deg,rgba(14,24,41,0.98)_0%,rgba(14,24,41,0.82)_40%,rgba(14,24,41,0)_68%)]' />

      <div className='relative max-w-[36rem]'>
        <p className='text-[10px] font-semibold tracking-[0.24em] text-sky-700/75 uppercase dark:text-sky-300/75'>
          Bioinformatics Platform
        </p>
        <h1 className='mt-2.5 text-[2.35rem] leading-[0.95] font-semibold tracking-[-0.04em] text-slate-900 sm:text-[2.9rem] dark:text-white'>
          Gene<span className='text-primary'>AI</span>
        </h1>
        <p className='mt-3 text-base font-medium text-slate-800 sm:text-lg dark:text-slate-100'>
          专业的 DNA 序列分析与可视化平台
        </p>
        <p className='mt-2 max-w-md text-[13px] leading-relaxed text-slate-500 dark:text-slate-400'>
          从一次粘贴开始，完成碱基统计、GC / AT 含量、互补链、RNA
          转录与可复现的分析记录。所有计算均在本机完成。
        </p>
        <div className='mt-6 flex flex-wrap items-center gap-3'>
          <Button
            asChild
            size='lg'
            className='h-10 gap-2 rounded-xl px-5 shadow-[0_14px_30px_-14px_rgba(37,99,235,0.85)] transition-transform hover:-translate-y-0.5'
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
            className='h-10 gap-2 rounded-xl border-white/80 bg-white/75 px-5 text-slate-700 shadow-sm backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
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
