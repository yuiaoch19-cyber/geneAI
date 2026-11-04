import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Dna,
  FileText,
  GitCompareArrows,
  History as HistoryIcon,
  Plus,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/components/geneai/data-table'
import { PageHeader } from '@/components/geneai/page-header'
import { StatCard } from '@/components/geneai/stat-card'
import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'

type HistoryRecord = {
  id: string
  name: string
  kind: 'analysis' | 'compare'
  length: number
  metric: string
  createdAt: string
}

type HistoryFilter = 'all' | 'analysis' | 'compare'

const records: HistoryRecord[] = []

const columns: ColumnDef<HistoryRecord>[] = [
  {
    accessorKey: 'name',
    header: '名称',
    cell: ({ row }) => (
      <div className='flex items-center gap-2.5'>
        <span className='flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground'>
          {row.original.kind === 'analysis' ? (
            <Dna className='size-4' />
          ) : (
            <GitCompareArrows className='size-4' />
          )}
        </span>
        <div className='min-w-0'>
          <p className='truncate text-sm font-medium'>{row.original.name}</p>
          <p className='font-mono text-[11px] text-muted-foreground'>
            {row.original.id}
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'kind',
    header: '类型',
    cell: ({ row }) => (
      <Badge variant='outline' className='text-[11px] font-normal'>
        {row.original.kind === 'analysis' ? '序列分析' : '差异比较'}
      </Badge>
    ),
  },
  {
    accessorKey: 'length',
    header: '长度',
    cell: ({ row }) => (
      <span className='font-mono text-xs tabular-nums'>
        {row.original.length} bp
      </span>
    ),
  },
  {
    accessorKey: 'metric',
    header: '关键指标',
    cell: ({ row }) => (
      <span className='font-mono text-xs text-muted-foreground tabular-nums'>
        {row.original.metric}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: '创建时间',
    cell: ({ row }) => (
      <span className='text-xs text-muted-foreground'>
        {row.original.createdAt}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: () => (
      <div className='flex justify-end gap-1'>
        <Button variant='ghost' size='sm' className='h-8 px-2 text-xs' disabled>
          详情
        </Button>
        <Button
          variant='ghost'
          size='sm'
          className='h-8 px-2 text-xs text-muted-foreground'
          disabled
        >
          删除
        </Button>
      </div>
    ),
  },
]

export function AnalysisHistoryPage() {
  const [filter, setFilter] = useState<HistoryFilter>('all')

  const data =
    filter === 'all' ? records : records.filter((item) => item.kind === filter)

  const emptyCopy =
    filter === 'analysis'
      ? {
          title: '还没有序列分析记录',
          description:
            '在 DNA 序列分析页完成一次分析并保存后，记录会出现在这里。',
        }
      : filter === 'compare'
        ? {
            title: '还没有差异比较记录',
            description: '完成两条序列的比对并保存后，这里会保留差异摘要。',
          }
        : {
            title: '还没有历史记录',
            description:
              '完成一次序列分析或差异比较后，记录会自动保存在本地数据库中。',
          }

  return (
    <>
      <AppHeader />
      <Main>
        <PageHeader
          eyebrow='History'
          title='历史记录'
          description='浏览已保存的序列分析与差异比较，支持搜索、筛选、查看详情与导出 PDF 报告。'
          actions={
            <Button asChild size='sm'>
              <Link to='/analysis'>
                <Plus className='size-4' />
                新建分析
              </Link>
            </Button>
          }
        />

        <div className='mt-6 grid gap-4 sm:grid-cols-3'>
          <StatCard
            label='全部记录'
            value={records.length}
            hint='序列分析与差异比较的总和'
            icon={HistoryIcon}
            tone='blue'
          />
          <StatCard
            label='序列分析'
            value={records.filter((item) => item.kind === 'analysis').length}
            hint='单条序列的碱基与 GC 统计'
            icon={Dna}
            tone='teal'
          />
          <StatCard
            label='差异比较'
            value={records.filter((item) => item.kind === 'compare').length}
            hint='两条序列的突变摘要'
            icon={GitCompareArrows}
            tone='violet'
          />
        </div>

        <div className='mt-4 rounded-xl border border-border/80 bg-card p-4 shadow-card'>
          <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
            <Tabs
              value={filter}
              onValueChange={(value) => setFilter(value as HistoryFilter)}
            >
              <TabsList>
                <TabsTrigger value='all'>全部</TabsTrigger>
                <TabsTrigger value='analysis'>序列分析</TabsTrigger>
                <TabsTrigger value='compare'>差异比较</TabsTrigger>
              </TabsList>
            </Tabs>
            <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
              <FileText className='size-3.5' />
              报告导出将在 PDF 阶段接入
            </span>
          </div>

          <DataTable
            columns={columns}
            data={data}
            searchable
            searchPlaceholder='按名称或编号搜索…'
            emptyIcon={HistoryIcon}
            emptyTitle={emptyCopy.title}
            emptyDescription={emptyCopy.description}
            emptyAction={
              <Button asChild variant='outline' size='sm'>
                <Link to='/analysis'>开始第一次分析</Link>
              </Button>
            }
          />
        </div>
      </Main>
    </>
  )
}
