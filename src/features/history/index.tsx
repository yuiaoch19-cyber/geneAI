import { useState } from 'react'
import { format } from 'date-fns'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { AnalysisRecord, AnalysisSource } from '@/types/api'
import { zhCN } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Dna,
  Download,
  Eye,
  History as HistoryIcon,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  deleteAnalysis,
  downloadAnalysisReport,
  getAnalysis,
  listAnalyses,
} from '@/lib/api/geneai'
import { formatNumber, formatPercent } from '@/lib/dna'
import { statsKeys } from '@/hooks/use-stats-overview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/geneai/empty-state'
import { ErrorState } from '@/components/geneai/error-state'
import { LoadingState } from '@/components/geneai/loading-state'
import { PageHeader } from '@/components/geneai/page-header'
import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'

const SOURCE_LABELS: Record<AnalysisSource, string> = {
  manual: '手动输入',
  fasta: 'FASTA 文件',
  demo: '演示数据',
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return format(date, 'yyyy-MM-dd HH:mm', { locale: zhCN })
}

function safeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '_').trim()
  return cleaned.slice(0, 40) || '分析记录'
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5'>
      <p className='text-[11px] text-muted-foreground'>{label}</p>
      <p className='mt-1 text-sm font-semibold tabular-nums'>{value}</p>
    </div>
  )
}

function ChainBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className='space-y-1.5'>
      <p className='text-xs font-medium text-muted-foreground'>{label}</p>
      <div className='max-h-32 overflow-auto rounded-lg border border-border/70 bg-muted/25 p-3 font-mono text-xs leading-relaxed break-all'>
        {value}
      </div>
    </div>
  )
}

export function AnalysisHistoryPage() {
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [detailId, setDetailId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AnalysisRecord | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const hasFilters = Boolean(keyword.trim() || dateFrom || dateTo)

  const historyQuery = useQuery({
    queryKey: ['history', { page, pageSize, keyword, dateFrom, dateTo }],
    queryFn: () =>
      listAnalyses({
        q: keyword.trim() || undefined,
        page,
        pageSize,
        includeSequence: false,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    placeholderData: keepPreviousData,
  })

  const detailQuery = useQuery({
    queryKey: ['analysis', detailId],
    queryFn: () => getAnalysis(detailId as number),
    enabled: detailId !== null,
    retry: 1,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAnalysis(id),
    onSuccess: () => {
      toast.success('记录已删除')
      setDeleteTarget(null)
      if (page > 1 && (historyQuery.data?.items.length ?? 0) === 1) {
        setPage(page - 1)
      }
      void queryClient.invalidateQueries({ queryKey: ['history'] })
      void queryClient.invalidateQueries({ queryKey: statsKeys.overview })
    },
    onError: (error: Error) => toast.error(error.message || '删除失败'),
  })

  async function handleDownload(record: AnalysisRecord) {
    setDownloadingId(record.id)
    try {
      const blob = await downloadAnalysisReport(record.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `GeneAI-${safeFileName(record.name)}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success(`已导出「${record.name}」的 PDF 报告`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '报告导出失败')
    } finally {
      setDownloadingId(null)
    }
  }

  function resetFilters() {
    setKeyword('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const data = historyQuery.data
  const records = data?.items ?? []
  const pages = data?.pages ?? 0
  const total = data?.total ?? 0
  const detail = detailQuery.data

  return (
    <>
      <AppHeader />
      <Main className='flex flex-col gap-4'>
        <PageHeader
          eyebrow='History'
          title='历史记录'
          description='浏览保存在本机的序列分析记录，支持搜索、按日期筛选、查看详情、导出 PDF 报告与删除。'
          actions={
            <Button asChild size='sm'>
              <Link to='/analysis'>
                <Plus className='size-4' />
                新建分析
              </Link>
            </Button>
          }
        />

        <div className='overflow-hidden rounded-xl border border-border/80 bg-card shadow-card'>
          <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3.5'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-sm font-semibold'>分析记录</span>
              <Badge variant='outline' className='text-[11px] font-normal'>
                共 {formatNumber(total)} 条
              </Badge>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                className='h-8 gap-1.5'
                onClick={() => void historyQuery.refetch()}
                disabled={historyQuery.isFetching}
              >
                <RefreshCw
                  className={`size-3.5 ${historyQuery.isFetching ? 'animate-spin' : ''}`}
                />
                刷新
              </Button>
            </div>
          </div>

          <div className='grid gap-2.5 border-b border-border/70 px-4 py-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_164px_164px_auto]'>
            <div className='relative'>
              <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value)
                  setPage(1)
                }}
                placeholder='搜索序列名称…'
                className='h-9 ps-9'
                aria-label='搜索序列名称'
              />
            </div>
            <div className='flex items-center gap-1.5'>
              <span className='w-7 shrink-0 text-[11px] text-muted-foreground'>
                开始
              </span>
              <Input
                type='date'
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => {
                  setDateFrom(event.target.value)
                  setPage(1)
                }}
                className='h-9 min-w-0 flex-1 text-xs'
                aria-label='开始日期'
              />
            </div>
            <div className='flex items-center gap-1.5'>
              <span className='w-7 shrink-0 text-[11px] text-muted-foreground'>
                结束
              </span>
              <Input
                type='date'
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => {
                  setDateTo(event.target.value)
                  setPage(1)
                }}
                className='h-9 min-w-0 flex-1 text-xs'
                aria-label='结束日期'
              />
            </div>
            <Button
              variant='ghost'
              size='sm'
              className='h-9 justify-self-start text-xs text-muted-foreground lg:justify-self-auto'
              onClick={resetFilters}
              disabled={!hasFilters}
            >
              清除筛选
            </Button>
          </div>

          {historyQuery.isLoading ? (
            <div className='p-5'>
              <LoadingState rows={5} label='正在读取历史记录…' />
            </div>
          ) : historyQuery.isError ? (
            <div className='p-5'>
              <ErrorState
                title='历史记录加载失败'
                message={historyQuery.error.message}
                onRetry={() => void historyQuery.refetch()}
              />
            </div>
          ) : records.length === 0 ? (
            <div className='p-5'>
              <EmptyState
                icon={HistoryIcon}
                title={hasFilters ? '没有匹配的记录' : '还没有历史记录'}
                description={
                  hasFilters
                    ? '尝试调整搜索关键词或日期范围，也可以清除筛选查看全部记录。'
                    : '完成一次序列分析并保存后，记录会自动出现在这里，并可导出 PDF 报告。'
                }
                action={
                  hasFilters ? (
                    <Button variant='outline' size='sm' onClick={resetFilters}>
                      清除筛选
                    </Button>
                  ) : (
                    <Button asChild variant='outline' size='sm'>
                      <Link to='/analysis'>开始第一次分析</Link>
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/40 hover:bg-muted/40'>
                    <TableHead className='ps-4'>序列名称</TableHead>
                    <TableHead className='hidden text-right sm:table-cell'>
                      长度
                    </TableHead>
                    <TableHead className='text-right'>GC 含量</TableHead>
                    <TableHead className='hidden text-right md:table-cell'>
                      AT 含量
                    </TableHead>
                    <TableHead className='hidden md:table-cell'>
                      分析时间
                    </TableHead>
                    <TableHead className='pe-4 text-right'>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className='max-w-[220px] ps-4'>
                        <div className='flex items-center gap-2.5'>
                          <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1'>
                            <Dna className='size-4' />
                          </span>
                          <div className='min-w-0'>
                            <p className='truncate text-sm font-medium'>
                              {record.name}
                            </p>
                            <p className='text-[11px] text-muted-foreground'>
                              #{record.id} · {SOURCE_LABELS[record.source]}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className='hidden text-right font-mono text-xs tabular-nums sm:table-cell'>
                        {formatNumber(record.length)} bp
                      </TableCell>
                      <TableCell className='text-right'>
                        <span className='inline-flex items-center gap-2'>
                          <span className='hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted lg:block'>
                            <span
                              className='block h-full rounded-full bg-chart-1'
                              style={{
                                width: `${Math.min(record.gcContent, 100)}%`,
                              }}
                            />
                          </span>
                          <span className='font-mono text-xs tabular-nums'>
                            {formatPercent(record.gcContent)}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className='hidden text-right font-mono text-xs tabular-nums md:table-cell'>
                        {formatPercent(record.atContent)}
                      </TableCell>
                      <TableCell className='hidden text-xs text-muted-foreground md:table-cell'>
                        {formatTime(record.createdAt)}
                      </TableCell>
                      <TableCell className='pe-4'>
                        <div className='flex justify-end gap-0.5'>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='size-8'
                            title='查看详情'
                            aria-label={`查看 ${record.name} 的详情`}
                            onClick={() => setDetailId(record.id)}
                          >
                            <Eye className='size-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='size-8'
                            title='导出 PDF 报告'
                            aria-label={`导出 ${record.name} 的 PDF 报告`}
                            disabled={downloadingId === record.id}
                            onClick={() => void handleDownload(record)}
                          >
                            {downloadingId === record.id ? (
                              <Loader2 className='size-4 animate-spin' />
                            ) : (
                              <Download className='size-4' />
                            )}
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='size-8 text-muted-foreground hover:text-destructive'
                            title='删除记录'
                            aria-label={`删除 ${record.name}`}
                            onClick={() => setDeleteTarget(record)}
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className='flex flex-col gap-2 border-t border-border/70 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between'>
                <span>
                  共 {formatNumber(total)} 条 · 第 {page}/{Math.max(pages, 1)}{' '}
                  页
                </span>
                <div className='flex items-center gap-2'>
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value))
                      setPage(1)
                    }}
                    className='h-8 rounded-md border border-input bg-background px-2 text-xs'
                    aria-label='每页条数'
                  >
                    <option value={10}>10 条/页</option>
                    <option value={20}>20 条/页</option>
                    <option value={50}>50 条/页</option>
                  </select>
                  <Button
                    variant='outline'
                    size='icon'
                    className='size-8'
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1 || historyQuery.isFetching}
                    aria-label='上一页'
                  >
                    <ChevronLeft className='size-4' />
                  </Button>
                  <Button
                    variant='outline'
                    size='icon'
                    className='size-8'
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pages || historyQuery.isFetching}
                    aria-label='下一页'
                  >
                    <ChevronRight className='size-4' />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Main>

      <Dialog
        open={detailId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null)
        }}
      >
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle className='flex flex-wrap items-center gap-2'>
              {detail?.name ?? '分析详情'}
              {detail ? (
                <Badge variant='outline' className='text-[10px] font-normal'>
                  {SOURCE_LABELS[detail.source]}
                </Badge>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              {detail
                ? `${formatTime(detail.createdAt)} · 记录 #${detail.id}`
                : '正在读取记录…'}
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <LoadingState rows={5} label='正在读取详情…' />
          ) : detailQuery.isError ? (
            <ErrorState
              title='详情加载失败'
              message={detailQuery.error.message}
              onRetry={() => void detailQuery.refetch()}
            />
          ) : detail ? (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                <DetailMetric
                  label='序列长度'
                  value={`${formatNumber(detail.length)} bp`}
                />
                <DetailMetric
                  label='GC 含量'
                  value={formatPercent(detail.gcContent)}
                />
                <DetailMetric
                  label='AT 含量'
                  value={formatPercent(detail.atContent)}
                />
                <DetailMetric
                  label='N 碱基'
                  value={`${formatNumber(detail.counts.n)} 个`}
                />
              </div>

              <div className='flex flex-wrap gap-2 text-xs'>
                {(
                  [
                    ['A', detail.counts.a, 'bg-chart-1/12 text-chart-1'],
                    ['T', detail.counts.t, 'bg-chart-2/12 text-chart-2'],
                    ['G', detail.counts.g, 'bg-chart-4/12 text-chart-4'],
                    ['C', detail.counts.c, 'bg-chart-3/12 text-chart-3'],
                    ['N', detail.counts.n, 'bg-chart-5/12 text-chart-5'],
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

              <ChainBlock label='原始序列（5′ → 3′）' value={detail.sequence} />
              <ChainBlock label='互补链（3′ → 5′）' value={detail.complement} />
              <ChainBlock
                label='反向互补链（5′ → 3′）'
                value={detail.reverseComplement}
              />
              <ChainBlock label='RNA 转录（5′ → 3′）' value={detail.rna} />

              <div className='flex justify-end'>
                <Button
                  size='sm'
                  className='gap-1.5'
                  disabled={downloadingId === detail.id}
                  onClick={() => void handleDownload(detail)}
                >
                  {downloadingId === detail.id ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : (
                    <Download className='size-4' />
                  )}
                  导出 PDF 报告
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title='删除这条分析记录？'
        desc={
          <span>
            记录「{deleteTarget?.name}
            」及其统计结果将从本机数据库中永久删除，此操作无法撤销。
          </span>
        }
        cancelBtnText='取消'
        confirmText='删除记录'
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
      />
    </>
  )
}
