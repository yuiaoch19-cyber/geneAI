import { Link } from '@tanstack/react-router'
import {
  ChartSpline,
  Dna,
  FileText,
  GitCompareArrows,
  History,
  Settings,
} from 'lucide-react'

const MODULES = [
  {
    title: 'DNA 序列分析',
    description: '输入或上传 FASTA',
    to: '/analysis',
    icon: Dna,
    className: 'bg-chart-1/10 text-chart-1',
  },
  {
    title: '序列比对',
    description: '替换、插入与缺失',
    to: '/compare',
    icon: GitCompareArrows,
    className: 'bg-chart-2/10 text-chart-2',
  },
  {
    title: '数据可视化',
    description: 'GC 曲线与碱基分布',
    to: '/visualization',
    icon: ChartSpline,
    className: 'bg-chart-3/10 text-chart-3',
  },
  {
    title: '历史记录',
    description: '搜索与查看详情',
    to: '/history',
    icon: History,
    className: 'bg-chart-4/10 text-chart-4',
  },
  {
    title: 'PDF 报告',
    description: '从历史记录导出',
    to: '/history',
    icon: FileText,
    className: 'bg-chart-5/10 text-chart-5',
  },
  {
    title: '系统设置',
    description: '外观与本地工作区',
    to: '/settings/appearance',
    icon: Settings,
    className: 'bg-muted text-muted-foreground',
  },
] as const

export function ModuleGrid() {
  return (
    <section className='rounded-2xl border border-border/60 bg-card p-4 shadow-card sm:p-5'>
      <div className='mb-3 flex items-end justify-between gap-2'>
        <div>
          <h2 className='text-sm font-semibold tracking-tight'>功能入口</h2>
          <p className='mt-0.5 text-xs text-muted-foreground'>
            六个真实可用的分析模块
          </p>
        </div>
      </div>
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6'>
        {MODULES.map((module) => {
          const Icon = module.icon
          return (
            <Link
              key={module.title}
              to={module.to}
              className='group flex flex-col gap-2.5 rounded-xl border border-transparent bg-muted/35 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
            >
              <span
                className={`flex size-9 items-center justify-center rounded-lg ${module.className} transition-transform duration-200 group-hover:scale-105`}
              >
                <Icon className='size-4.5' strokeWidth={1.9} />
              </span>
              <span>
                <span className='block text-[13px] font-medium'>
                  {module.title}
                </span>
                <span className='mt-0.5 block text-[10px] text-muted-foreground'>
                  {module.description}
                </span>
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
