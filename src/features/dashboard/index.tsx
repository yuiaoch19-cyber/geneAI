import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Link } from '@tanstack/react-router'
import { zhCN } from 'date-fns/locale'
import {
  Activity,
  ArrowRight,
  ChartBar,
  ChartSpline,
  Clock3,
  Database,
  FlaskConical,
  Layers,
  Percent,
  Sparkles,
} from 'lucide-react'
import { formatNumber, type BaseCounts } from '@/lib/dna'
import { useStatsOverview } from '@/hooks/use-stats-overview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChartCard } from '@/components/geneai/chart-card'
import { EmptyState } from '@/components/geneai/empty-state'
import { ErrorState } from '@/components/geneai/error-state'
import { LoadingState } from '@/components/geneai/loading-state'
import { StatCard } from '@/components/geneai/stat-card'
import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'
import { BaseBar } from './components/base-bar'
import { BaseDonut } from './components/base-donut'
import { GcTrendChart } from './components/gc-trend-chart'
import { QuickActions } from './components/quick-actions'
import { RecentRecords } from './components/recent-records'
import {
  DEMO_AVERAGE_GC,
  DEMO_BASE_COUNTS,
  DEMO_LAST_ANALYZED_AT,
  DEMO_RECORDS,
  DEMO_TREND,
} from './demo-data'

const EMPTY_COUNTS: BaseCounts = { a: 0, t: 0, g: 0, c: 0, n: 0 }

function relativeShort(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`
  const hours = Math.floor(diffMinutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return format(date, 'MM-dd')
}

export function Dashboard() {
  const [demo, setDemo] = useState(false)
  const { data, isLoading, isError, refetch } = useStatsOverview()

  const hasRealData = !!data && data.totalSequences > 0
  const showDemo = demo && !hasRealData && !isLoading

  const counts = showDemo
    ? DEMO_BASE_COUNTS
    : (data?.baseCounts ?? EMPTY_COUNTS)
  const trend = showDemo ? DEMO_TREND : (data?.gcTrend ?? [])
  const recent = showDemo ? DEMO_RECORDS : (data?.recent ?? [])
  const totalAnalyses = showDemo
    ? DEMO_RECORDS.length
    : (data?.totalAnalyses ?? 0)
  const totalSequences = showDemo
    ? DEMO_RECORDS.length
    : (data?.totalSequences ?? 0)
  const averageGc = showDemo ? DEMO_AVERAGE_GC : (data?.averageGc ?? null)
  const lastAnalyzedAt = showDemo
    ? DEMO_LAST_ANALYZED_AT
    : (data?.lastAnalyzedAt ?? null)

  const totalBases = counts.a + counts.t + counts.g + counts.c + counts.n
  const hasBases = totalBases > 0
  const hasTrend = trend.length > 0

  const today = useMemo(
    () => format(new Date(), 'yyyy 年 M 月 d 日 EEEE', { locale: zhCN }),
    []
  )

  const demoHint = showDemo ? '演示 · ' : ''
  const empty = !isLoading && !hasRealData && !showDemo

  return (
    <>
      <AppHeader />
      <Main className='flex flex-col gap-4 sm:gap-5'>
        <section className='rounded-xl border border-border/80 bg-card p-5 shadow-card sm:p-6'>
          <div className='flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between'>
            <div className='min-w-0 space-y-2.5'>
              <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                <span className='font-medium text-primary'>{today}</span>
                <span className='hidden size-1 rounded-full bg-border sm:block' />
                <span className='flex items-center gap-1.5'>
                  <Database className='size-3.5' />
                  本地计算 · SQLite 存储
                </span>
              </div>
              <h1 className='text-2xl font-semibold tracking-tight sm:text-[1.65rem]'>
                欢迎使用 GeneAI
              </h1>
              <p className='max-w-2xl text-sm leading-relaxed text-muted-foreground'>
                面向课程展示的 DNA
                智能序列分析平台。输入或上传序列，即可完成碱基统计、GC
                含量分析、链转换与序列差异概览，所有计算都在本机完成。
              </p>
            </div>
            <div className='flex shrink-0 flex-wrap items-center gap-2'>
              {empty ? (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setDemo(true)}
                  className='gap-1.5'
                >
                  <Sparkles className='size-4 text-chart-3' />
                  查看演示数据
                </Button>
              ) : null}
              <Button asChild variant='outline' size='sm'>
                <Link to='/history'>历史记录</Link>
              </Button>
              <Button asChild size='sm'>
                <Link to='/analysis'>
                  <FlaskConical className='size-4' />
                  开始 DNA 分析
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {showDemo ? (
          <div className='flex flex-col gap-3 rounded-xl border border-chart-4/30 bg-chart-4/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-start gap-2.5'>
              <FlaskConical className='mt-0.5 size-4 shrink-0 text-chart-4' />
              <div className='space-y-0.5'>
                <p className='text-sm font-medium text-chart-4'>
                  当前展示的是演示数据
                </p>
                <p className='text-xs leading-relaxed text-muted-foreground'>
                  以下数字、图表与记录仅用于预览界面，不会写入数据库，也不会计入真实统计。
                </p>
              </div>
            </div>
            <div className='flex shrink-0 items-center gap-2 ps-6 sm:ps-0'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setDemo(false)}
              >
                退出演示
              </Button>
              <Button asChild size='sm'>
                <Link to='/analysis'>开始真实分析</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {isError && !data ? (
          <ErrorState
            title='统计数据暂时无法加载'
            message='请确认后端服务已在 8000 端口启动，然后重试。'
            onRetry={() => void refetch()}
          />
        ) : null}

        <div className='grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4'>
          <StatCard
            label='总分析次数'
            value={isLoading ? '—' : formatNumber(totalAnalyses)}
            hint={`${demoHint}含序列分析与差异比较`}
            icon={Activity}
            tone='blue'
          />
          <StatCard
            label='已分析序列数'
            value={isLoading ? '—' : formatNumber(totalSequences)}
            hint={`${demoHint}差异比较按两条序列计入`}
            icon={Layers}
            tone='teal'
          />
          <StatCard
            label='平均 GC 含量'
            value={isLoading || averageGc === null ? '—' : averageGc.toFixed(1)}
            unit={averageGc === null ? undefined : '%'}
            hint={`${demoHint}基于全部序列分析记录`}
            icon={Percent}
            tone='violet'
          />
          <StatCard
            label='最近分析时间'
            value={
              isLoading || !lastAnalyzedAt ? '—' : relativeShort(lastAnalyzedAt)
            }
            hint={
              lastAnalyzedAt
                ? `${demoHint}${format(new Date(lastAnalyzedAt), 'yyyy-MM-dd HH:mm')}`
                : '完成一次分析后自动更新'
            }
            icon={Clock3}
            tone='amber'
          />
        </div>

        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-12'>
          <ChartCard
            className='md:col-span-1 lg:col-span-4'
            title='碱基分布'
            description='A / T / G / C 在全部序列中的占比'
            action={
              <Badge
                variant='outline'
                className='text-[10px] font-normal text-muted-foreground'
              >
                {showDemo ? '演示数据' : hasBases ? '实时数据' : '尚无数据'}
              </Badge>
            }
            bodyClassName='flex items-center px-4 py-4'
          >
            {isLoading ? (
              <LoadingState rows={4} label='正在统计碱基…' />
            ) : hasBases ? (
              <BaseDonut counts={counts} />
            ) : (
              <EmptyState
                compact
                className='w-full border-0'
                icon={ChartBar}
                title='还没有碱基分布'
                description='完成并保存一次序列分析后自动生成。'
              />
            )}
          </ChartCard>

          <ChartCard
            className='md:col-span-1 lg:col-span-4'
            title='碱基数量统计'
            description='四种碱基与 N 的出现次数'
            action={
              <Badge
                variant='outline'
                className='text-[10px] font-normal text-muted-foreground'
              >
                {showDemo ? '演示数据' : hasBases ? '实时数据' : '尚无数据'}
              </Badge>
            }
            bodyClassName='flex items-center px-4 py-4'
          >
            {isLoading ? (
              <LoadingState rows={4} label='正在统计数量…' />
            ) : hasBases ? (
              <BaseBar counts={counts} />
            ) : (
              <EmptyState
                compact
                className='w-full border-0'
                icon={ChartBar}
                title='还没有碱基数量'
                description='保存分析后，这里会显示 A / T / G / C / N 的数量。'
              />
            )}
          </ChartCard>

          <ChartCard
            className='md:col-span-2 lg:col-span-4'
            title='GC 含量趋势'
            description='按分析时间查看 GC 含量变化'
            action={
              <Badge
                variant='outline'
                className='text-[10px] font-normal text-muted-foreground'
              >
                {showDemo ? '演示数据' : hasTrend ? '最近 20 次' : '尚无数据'}
              </Badge>
            }
            bodyClassName='flex items-center px-4 py-4'
          >
            {isLoading ? (
              <LoadingState rows={4} label='正在生成趋势…' />
            ) : hasTrend ? (
              <GcTrendChart points={trend} />
            ) : (
              <EmptyState
                compact
                className='w-full border-0'
                icon={ChartSpline}
                title='还没有趋势数据'
                description='至少保存两次分析后，曲线会比较有意义。'
              />
            )}
          </ChartCard>
        </div>

        <div className='grid gap-4 xl:grid-cols-12'>
          <div className='min-w-0 xl:col-span-8'>
            <RecentRecords
              records={recent}
              isDemo={showDemo}
              isLoading={isLoading}
            />
          </div>
          <div className='min-w-0 xl:col-span-4'>
            <QuickActions />
          </div>
        </div>

        <div className='flex flex-col gap-2 rounded-xl border border-dashed border-border/80 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between'>
          <span>
            统计口径：差异比较记录按两条序列计入「已分析序列数」；平均 GC
            只基于单序列分析记录。
          </span>
          <span className='flex items-center gap-1.5'>
            <ArrowRight className='size-3.5' />
            数据保存在本机 SQLite
          </span>
        </div>
      </Main>
    </>
  )
}
