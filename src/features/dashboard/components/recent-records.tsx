import { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { AnalysisRecord, RecentRecord } from '@/types/api'
import { zhCN } from 'date-fns/locale'
import { ArrowRight, Clock3, FlaskConical, History, Info } from 'lucide-react'
import { getAnalysis } from '@/lib/api/geneai'
import { formatNumber, formatPercent } from '@/lib/dna'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/geneai/empty-state'
import { DEMO_RECORDS, toAnalysisRecord } from '../demo-data'

type RecentRecordsProps = {
  records: RecentRecord[]
  isDemo?: boolean
  isLoading?: boolean
}

function formatRelative(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return formatDistanceToNow(date, { addSuffix: true, locale: zhCN })
}

function formatAbsolute(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return format(date, 'yyyy-MM-dd HH:mm', { locale: zhCN })
}

function DetailGrid({ record }: { record: AnalysisRecord }) {
  const items = [
    { label: '序列长度', value: `${formatNumber(record.length)} bp` },
    { label: 'GC 含量', value: formatPercent(record.gcContent) },
    { label: 'AT 含量', value: formatPercent(record.atContent) },
    { label: 'N 碱基', value: `${formatNumber(record.counts.n)} 个` },
  ]

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {items.map((item) => (
          <div
            key={item.label}
            className='rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5'
          >
            <p className='text-[11px] text-muted-foreground'>{item.label}</p>
            <p className='mt-1 text-sm font-semibold tabular-nums'>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className='flex flex-wrap gap-2 text-xs'>
        {(
          [
            ['A', record.counts.a, 'bg-chart-1/12 text-chart-1'],
            ['T', record.counts.t, 'bg-chart-2/12 text-chart-2'],
            ['G', record.counts.g, 'bg-chart-4/12 text-chart-4'],
            ['C', record.counts.c, 'bg-chart-3/12 text-chart-3'],
            ['N', record.counts.n, 'bg-chart-5/12 text-chart-5'],
          ] as const
        ).map(([base, count, className]) => (
          <span
            key={base}
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium tabular-nums ${className}`}
          >
            {base}
            <span className='font-normal opacity-80'>{count}</span>
          </span>
        ))}
      </div>

      <div className='space-y-1.5'>
        <p className='text-xs font-medium text-muted-foreground'>序列预览</p>
        <div className='max-h-32 overflow-auto rounded-lg border border-border/70 bg-muted/30 p-3 font-mono text-xs leading-relaxed break-all'>
          {record.sequence}
        </div>
      </div>

      <div className='space-y-1.5'>
        <p className='text-xs font-medium text-muted-foreground'>RNA 转录</p>
        <div className='max-h-24 overflow-auto rounded-lg border border-border/70 bg-muted/30 p-3 font-mono text-xs leading-relaxed break-all'>
          {record.rna}
        </div>
      </div>
    </div>
  )
}

export function RecentRecords({
  records,
  isDemo = false,
  isLoading = false,
}: RecentRecordsProps) {
  const [selected, setSelected] = useState<RecentRecord | null>(null)
  const isDemoRecord = isDemo && selected !== null

  const detailQuery = useQuery({
    queryKey: ['analysis', selected?.id],
    queryFn: () => getAnalysis(selected!.id),
    enabled: !!selected && !isDemoRecord,
    retry: 1,
  })

  const demoRecord = isDemoRecord
    ? DEMO_RECORDS.find((record) => record.id === selected?.id)
    : undefined

  const detail: AnalysisRecord | undefined = isDemoRecord
    ? demoRecord
      ? toAnalysisRecord(demoRecord)
      : undefined
    : detailQuery.data

  return (
    <Card className='gap-0 overflow-hidden py-0 shadow-card'>
      <div className='flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            <h2 className='text-sm font-semibold tracking-tight'>
              最近分析记录
            </h2>
            {isDemo ? (
              <Badge
                variant='outline'
                className='border-chart-4/40 bg-chart-4/10 text-[10px] text-chart-4'
              >
                演示数据
              </Badge>
            ) : null}
          </div>
          <p className='text-xs text-muted-foreground'>
            最新保存的序列分析，点击「查看」可以预览详情
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

      {isLoading ? (
        <div className='space-y-3 p-5'>
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
        </div>
      ) : records.length === 0 ? (
        <div className='p-5'>
          <EmptyState
            compact
            icon={History}
            title='暂无历史记录'
            description='完成一次序列分析并保存后，记录会出现在这里。'
            action={
              <Button asChild variant='outline' size='sm'>
                <Link to='/analysis'>
                  <FlaskConical className='size-3.5' />
                  开始第一次分析
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/40 hover:bg-muted/40'>
              <TableHead className='ps-5'>序列名称</TableHead>
              <TableHead className='hidden text-right sm:table-cell'>
                序列长度
              </TableHead>
              <TableHead className='text-right'>GC 含量</TableHead>
              <TableHead className='hidden md:table-cell'>分析时间</TableHead>
              <TableHead className='pe-5 text-right'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className='max-w-[160px] ps-5 font-medium sm:max-w-[280px]'>
                  <span className='flex items-center gap-2'>
                    <span className='truncate'>{record.name}</span>
                    {isDemo ? (
                      <span className='shrink-0 rounded bg-chart-4/12 px-1.5 py-0.5 text-[10px] font-normal text-chart-4'>
                        演示
                      </span>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className='hidden text-right tabular-nums sm:table-cell'>
                  {formatNumber(record.length)} bp
                </TableCell>
                <TableCell className='text-right'>
                  <span className='inline-flex items-center gap-2'>
                    <span className='hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block'>
                      <span
                        className='block h-full rounded-full bg-chart-1'
                        style={{ width: `${Math.min(record.gcContent, 100)}%` }}
                      />
                    </span>
                    <span className='tabular-nums'>
                      {formatPercent(record.gcContent)}
                    </span>
                  </span>
                </TableCell>
                <TableCell className='hidden md:table-cell'>
                  <span
                    className='flex items-center gap-1.5 text-muted-foreground'
                    title={formatAbsolute(record.createdAt)}
                  >
                    <Clock3 className='size-3.5' />
                    {formatRelative(record.createdAt)}
                  </span>
                </TableCell>
                <TableCell className='pe-5 text-right'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 px-2 text-xs'
                    onClick={() => setSelected(record)}
                  >
                    查看
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle className='flex flex-wrap items-center gap-2'>
              {selected?.name ?? '分析详情'}
              {isDemo ? (
                <Badge
                  variant='outline'
                  className='border-chart-4/40 bg-chart-4/10 text-[10px] text-chart-4'
                >
                  演示数据
                </Badge>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              {selected ? formatAbsolute(selected.createdAt) : ''} ·{' '}
              {isDemo ? '演示数据（未写入数据库）' : '本机 SQLite 记录'}
            </DialogDescription>
          </DialogHeader>

          {isDemo ? (
            <div className='flex items-start gap-2 rounded-lg border border-chart-4/30 bg-chart-4/8 px-3 py-2 text-xs leading-relaxed text-chart-4'>
              <Info className='mt-0.5 size-3.5 shrink-0' />
              这条记录来自演示数据，只用于展示界面，不会写入历史记录，也不能导出报告。
            </div>
          ) : null}

          {detail ? (
            <DetailGrid record={detail} />
          ) : detailQuery.isLoading ? (
            <div className='space-y-3'>
              <Skeleton className='h-16 w-full' />
              <Skeleton className='h-24 w-full' />
            </div>
          ) : detailQuery.isError ? (
            <p className='text-sm text-destructive'>
              详情加载失败，请稍后重试。
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
