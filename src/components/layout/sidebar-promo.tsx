import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'

export function SidebarPromo() {
  return (
    <Link
      to='/analysis'
      aria-label='开始一次 DNA 序列分析'
      className='group relative mx-2 mb-2 block overflow-hidden rounded-2xl bg-[linear-gradient(150deg,#0b1e3d_0%,#123a73_62%,#0e2a55_100%)] p-4 text-white ring-1 ring-white/10 transition-transform duration-200 group-data-[collapsible=icon]:hidden hover:-translate-y-0.5'
    >
      <svg
        aria-hidden='true'
        viewBox='0 0 200 120'
        className='pointer-events-none absolute -end-6 -bottom-6 h-28 w-40 opacity-40'
      >
        <defs>
          <linearGradient id='promo-dna' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stopColor='#7dd3fc' stopOpacity='0.9' />
            <stop offset='100%' stopColor='#2563eb' stopOpacity='0.2' />
          </linearGradient>
        </defs>
        <path
          d='M20 110 C60 80, 60 40, 100 10 M60 110 C100 80, 100 40, 140 10'
          fill='none'
          stroke='url(#promo-dna)'
          strokeWidth='1.5'
        />
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1={30 + i * 12}
            y1={96 - i * 18}
            x2={70 + i * 12}
            y2={88 - i * 18}
            stroke='#93c5fd'
            strokeOpacity='0.45'
            strokeWidth='1'
          />
        ))}
      </svg>
      <span className='relative block text-[10px] font-medium tracking-[0.16em] text-sky-300/80 uppercase'>
        GeneAI Lab
      </span>
      <span className='relative mt-1 block text-[13px] leading-snug font-semibold'>
        探索基因奥秘
        <br />
        从这里开始
      </span>
      <span className='relative mt-3 inline-flex items-center gap-1 text-[10px] text-sky-200/70 transition-colors group-hover:text-sky-100'>
        进入分析工作台
        <ArrowUpRight className='size-3' />
      </span>
      <span className='absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent' />
    </Link>
  )
}
