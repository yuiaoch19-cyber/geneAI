import { Link } from '@tanstack/react-router'
import {
  Activity,
  ArrowRight,
  ChartBar,
  ChartSpline,
  ChevronRight,
  Clock3,
  Database,
  Dna,
  GitCompareArrows,
  History,
  Layers,
  Percent,
  Plus,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChartCard } from '@/components/geneai/chart-card'
import { EmptyState } from '@/components/geneai/empty-state'
import { PageHeader } from '@/components/geneai/page-header'
import { StatCard } from '@/components/geneai/stat-card'
import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'

const quickActions = [
  {
    to: '/analysis',
    icon: Dna,
    title: 'DNA 序列分析',
    description: '输入或上传序列，计算碱基组成与链转换',
  },
  {
    to: '/compare',
    icon: GitCompareArrows,
    title: '序列差异比较',
    description: '比对两条序列，定位替换、插入与缺失',
  },
  {
    to: '/visualization',
    icon: ChartSpline,
    title: '数据可视化',
    description: '查看碱基分布与滑动窗口 GC 曲线',
  },
  {
    to: '/history',
    icon: History,
    title: '历史记录',
    description: '检索已保存的分析与 PDF 报告',
  },
] as const

export function Dashboard() {
  return (
    <>
      <AppHeader />
      <Main>
        <PageHeader
          eyebrow='Overview'
          title='分析总览'
          description='集中查看序列分析、碱基组成与 GC 含量的整体情况。所有计算均在本地完成。'
          actions={
            <>
              <Badge
                variant='outline'
                className='hidden gap-1.5 text-xs font-normal text-muted-foreground sm:inline-flex'
              >
                <Database className='size-3' />
                本地工作区
              </Badge>
              <Button asChild size='sm'>
                <Link to='/analysis'>
                  <Plus className='size-4' />
                  新建分析
                </Link>
              </Button>
            </>
          }
        />

        <div className='mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <StatCard
            label='总分析次数'
            value='0'
            hint='尚未保存任何分析记录'
            icon={Activity}
            tone='blue'
          />
          <StatCard
            label='序列数量'
            value='0'
            hint='包含差异比较中的两条序列'
            icon={Layers}
            tone='teal'
          />
          <StatCard
            label='平均 GC 含量'
            value='—'
            unit='%'
            hint='完成分析后自动计算'
            icon={Percent}
            tone='violet'
          />
          <StatCard
            label='最近分析'
            value='—'
            hint='还没有记录'
            icon={Clock3}
            tone='amber'
          />
        </div>

        <div className='mt-4 grid gap-4 lg:grid-cols-7'>
          <ChartCard
            className='lg:col-span-4'
            title='碱基组成'
            description='统计工作区内全部序列的 A / T / G / C 数量'
            action={
              <Badge variant='outline' className='text-[10px] font-normal'>
                尚无数据
              </Badge>
            }
            bodyClassName='flex items-center'
          >
            <EmptyState
              className='w-full'
              icon={ChartBar}
              title='还没有可以统计的序列'
              description='完成第一次 DNA 序列分析后，这里会显示四种碱基的分布。'
              action={
                <Button asChild variant='outline' size='sm'>
                  <Link to='/analysis'>开始分析</Link>
                </Button>
              }
            />
          </ChartCard>

          <ChartCard
            className='lg:col-span-3'
            title='GC 含量趋势'
            description='按分析时间展示 GC 含量变化'
            action={
              <Badge variant='outline' className='text-[10px] font-normal'>
                尚无数据
              </Badge>
            }
            bodyClassName='flex items-center'
          >
            <EmptyState
              className='w-full'
              icon={ChartSpline}
              title='暂无趋势数据'
              description='至少完成两次分析后，趋势曲线才会具有比较意义。'
            />
          </ChartCard>
        </div>

        <div className='mt-4 grid gap-4 lg:grid-cols-7'>
          <Card className='gap-0 py-0 shadow-card lg:col-span-4'>
            <div className='flex items-center justify-between gap-2 border-b border-border/70 px-5 py-4'>
              <div className='space-y-1'>
                <h2 className='text-sm font-semibold tracking-tight'>
                  最近记录
                </h2>
                <p className='text-xs text-muted-foreground'>
                  最新保存的序列分析与差异比较
                </p>
              </div>
              <Button
                asChild
                variant='ghost'
                size='sm'
                className='h-8 px-2 text-xs text-muted-foreground'
              >
                <Link to='/history'>
                  查看全部
                  <ArrowRight className='size-3.5' />
                </Link>
              </Button>
            </div>
            <div className='p-5'>
              <EmptyState
                compact
                icon={History}
                title='暂无历史记录'
                description='分析结果保存后会出现在这里，也可以导出为 PDF 报告。'
                action={
                  <Button asChild variant='outline' size='sm'>
                    <Link to='/analysis'>第一次分析</Link>
                  </Button>
                }
              />
            </div>
          </Card>

          <Card className='gap-0 py-0 shadow-card lg:col-span-3'>
            <div className='border-b border-border/70 px-5 py-4'>
              <h2 className='text-sm font-semibold tracking-tight'>快捷入口</h2>
              <p className='mt-1 text-xs text-muted-foreground'>
                常用的分析工作流
              </p>
            </div>
            <div className='divide-y divide-border/70'>
              {quickActions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className='group flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50'
                >
                  <span className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary'>
                    <action.icon className='size-4' strokeWidth={1.9} />
                  </span>
                  <span className='min-w-0 flex-1 space-y-0.5'>
                    <span className='block text-sm font-medium text-foreground'>
                      {action.title}
                    </span>
                    <span className='block text-xs leading-relaxed text-muted-foreground'>
                      {action.description}
                    </span>
                  </span>
                  <ChevronRight className='mt-1 size-4 shrink-0 text-border transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground' />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </Main>
    </>
  )
}
