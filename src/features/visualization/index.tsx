import { ChartColumn, ChartPie, ChartSpline, Table2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChartCard } from '@/components/geneai/chart-card'
import { EmptyState } from '@/components/geneai/empty-state'
import { PageHeader } from '@/components/geneai/page-header'
import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'

const chartNotes = [
  {
    title: 'GC 口径',
    body: 'GC 含量 = (G + C) / (A + T + G + C)，N 不计入分母。',
  },
  {
    title: '滑动窗口',
    body: '默认窗口 50 bp、步长 10 bp；窗口不足 50 bp 的尾段不计算。',
  },
  {
    title: '数据来源',
    body: '图表只读取已保存的分析记录，不使用随机数据填充。',
  },
]

export function DataVisualizationPage() {
  return (
    <>
      <AppHeader />
      <Main>
        <PageHeader
          eyebrow='Visualization'
          title='数据可视化'
          description='以图表方式查看碱基分布、GC / AT 比例与滑动窗口 GC 曲线。选择一个已保存的分析记录后即可生成图表。'
          actions={
            <Badge
              variant='outline'
              className='text-xs font-normal text-muted-foreground'
            >
              图表阶段
            </Badge>
          }
        />

        <Card className='mt-6 gap-0 py-0 shadow-card'>
          <div className='flex flex-wrap items-end gap-3 p-4'>
            <div className='min-w-0 flex-1 space-y-1.5 sm:max-w-64'>
              <Label className='text-xs text-muted-foreground'>数据来源</Label>
              <Select disabled>
                <SelectTrigger className='h-9 w-full'>
                  <SelectValue placeholder='选择一条分析记录' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>暂无可选记录</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1.5'>
              <Label
                htmlFor='window-size'
                className='text-xs text-muted-foreground'
              >
                窗口大小
              </Label>
              <div className='flex items-center gap-1.5'>
                <Input
                  id='window-size'
                  value='50'
                  disabled
                  className='h-9 w-20 font-mono text-xs'
                />
                <span className='text-xs text-muted-foreground'>bp</span>
              </div>
            </div>
            <div className='space-y-1.5'>
              <Label
                htmlFor='window-step'
                className='text-xs text-muted-foreground'
              >
                步长
              </Label>
              <div className='flex items-center gap-1.5'>
                <Input
                  id='window-step'
                  value='10'
                  disabled
                  className='h-9 w-20 font-mono text-xs'
                />
                <span className='text-xs text-muted-foreground'>bp</span>
              </div>
            </div>
            <div className='ms-auto pb-1'>
              <Badge
                variant='secondary'
                className='text-[11px] font-normal text-muted-foreground'
              >
                等待第一条分析记录
              </Badge>
            </div>
          </div>
        </Card>

        <div className='mt-4 grid gap-4 lg:grid-cols-2'>
          <ChartCard
            title='碱基组成'
            description='A / T / G / C 的环形占比'
            bodyClassName='flex min-h-64 items-center'
          >
            <EmptyState
              className='w-full'
              icon={ChartPie}
              title='暂无碱基分布'
              description='保存一条 DNA 序列分析后，环形图会展示四种碱基的占比。'
            />
          </ChartCard>

          <ChartCard
            title='GC / AT 含量对比'
            description='两种含量之和为 100%（不含 N）'
            bodyClassName='flex min-h-64 items-center'
          >
            <EmptyState
              className='w-full'
              icon={ChartColumn}
              title='暂无含量数据'
              description='GC 与 AT 的柱状对比会在分析记录加载后生成。'
            />
          </ChartCard>

          <ChartCard
            title='滑动窗口 GC 曲线'
            description='窗口 50 bp，步长 10 bp，展示局部 GC 波动'
            bodyClassName='flex min-h-64 items-center'
          >
            <EmptyState
              className='w-full'
              icon={ChartSpline}
              title='暂无曲线数据'
              description='序列长度超过一个窗口后，才能计算滑动窗口 GC 含量。'
            />
          </ChartCard>

          <ChartCard
            title='碱基数量明细'
            description='每种碱基的出现次数与比例'
            bodyClassName='flex min-h-64 items-center'
          >
            <EmptyState
              className='w-full'
              icon={Table2}
              title='暂无明细'
              description='明细表会列出 A / T / G / C / N 的数量与百分比。'
            />
          </ChartCard>
        </div>

        <div className='mt-4'>
          <ChartCard title='图表口径' description='保证图表与算法结果一致'>
            <div className='grid gap-4 sm:grid-cols-3'>
              {chartNotes.map((note) => (
                <div key={note.title} className='space-y-1'>
                  <p className='text-sm font-medium'>{note.title}</p>
                  <p className='text-xs leading-relaxed text-muted-foreground'>
                    {note.body}
                  </p>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </Main>
    </>
  )
}
