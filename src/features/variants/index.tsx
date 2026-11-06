import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type {
  SignificanceClass,
  VariantQueryType,
  VariantRecord,
} from '@/types/api'
import {
  ArrowUpRight,
  CircleAlert,
  Database,
  ExternalLink,
  Search,
  ShieldQuestion,
} from 'lucide-react'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api/client'
import { searchVariants } from '@/lib/api/geneai'
import { formatNumber } from '@/lib/dna'
import { cn } from '@/lib/utils'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/geneai/empty-state'
import { ErrorState } from '@/components/geneai/error-state'
import { LoadingState } from '@/components/geneai/loading-state'
import { PageHeader } from '@/components/geneai/page-header'
import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'

const SIGNIFICANCE: Record<
  SignificanceClass,
  { label: string; className: string }
> = {
  pathogenic: {
    label: '致病',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  likely_pathogenic: {
    label: '可能致病',
    className: 'border-chart-4/40 bg-chart-4/10 text-chart-4',
  },
  vus: {
    label: '意义未明（VUS）',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-600',
  },
  likely_benign: {
    label: '可能良性',
    className: 'border-chart-3/40 bg-chart-3/10 text-chart-3',
  },
  benign: {
    label: '良性',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600',
  },
  conflicting: {
    label: '分类冲突',
    className: 'border-border bg-muted text-muted-foreground',
  },
  drug_response: {
    label: '药物反应',
    className: 'border-chart-2/40 bg-chart-2/10 text-chart-2',
  },
  risk_factor: {
    label: '风险因素',
    className: 'border-chart-4/40 bg-chart-4/10 text-chart-4',
  },
  other: {
    label: '其他注释',
    className: 'border-border bg-muted text-muted-foreground',
  },
  unknown: {
    label: '未提供',
    className: 'border-border bg-muted text-muted-foreground',
  },
}

const EXAMPLES: { label: string; q: string; type: VariantQueryType }[] = [
  { label: 'BRCA1', q: 'BRCA1', type: 'gene' },
  { label: 'rs80357906', q: 'rs80357906', type: 'variant' },
  { label: 'VCV000012345', q: 'VCV000012345', type: 'variant' },
]

function SignificanceBadge({ value }: { value: SignificanceClass }) {
  const config = SIGNIFICANCE[value] ?? SIGNIFICANCE.other
  return (
    <Badge variant='outline' className={cn('text-[10px]', config.className)}>
      {config.label}
    </Badge>
  )
}

function locationText(record: VariantRecord): string {
  if (!record.location) return '坐标未提供'
  const { chromosome, start, stop, ref, alt } = record.location
  const span = start === stop ? `${start}` : `${start}–${stop}`
  const alleles = ref && alt ? ` · ${ref}>${alt}` : ''
  return `chr${chromosome}:${span}${alleles}`
}

function displayPhenotypes(phenotypes: string[]): string {
  return phenotypes
    .map((item) =>
      ['not provided', 'not specified', 'unknown', 'none'].includes(
        item.toLowerCase()
      )
        ? '未提供'
        : item
    )
    .join('；')
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className='grid gap-1 border-b border-border/60 py-2 text-sm sm:grid-cols-[9rem_1fr] sm:gap-3'>
      <span className='text-xs text-muted-foreground'>{label}</span>
      <span className='min-w-0 break-words'>{children}</span>
    </div>
  )
}

function DetailDialog({
  record,
  onClose,
}: {
  record: VariantRecord | null
  onClose: () => void
}) {
  return (
    <Dialog open={record !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[88vh] overflow-y-auto sm:max-w-2xl'>
        {record ? (
          <>
            <DialogHeader>
              <DialogTitle className='pr-6 text-base'>
                {record.gene || '未知基因'} · {record.title}
              </DialogTitle>
              <DialogDescription>
                ClinVar {record.accession || record.id} · 查询于{' '}
                {record.retrievedAt.replace('T', ' ').slice(0, 19)} UTC
              </DialogDescription>
            </DialogHeader>

            <div className='flex flex-wrap items-center gap-2'>
              <SignificanceBadge value={record.significanceClass} />
              <Badge variant='outline' className='text-[10px]'>
                {record.reviewStatusLabel}
              </Badge>
              {record.missingFields.length > 0 ? (
                <Badge
                  variant='outline'
                  className='border-amber-500/40 text-[10px] text-amber-600'
                >
                  缺失字段：{record.missingFields.join('、')}
                </Badge>
              ) : null}
            </div>

            <div>
              <DetailRow label='基因名称'>{record.gene || '—'}</DetailRow>
              <DetailRow label='变异标识'>
                {record.accession || record.id}
              </DetailRow>
              <DetailRow label='参考 / 替代（正链）'>
                {record.refAllele || '—'} → {record.altAllele || '—'}
              </DetailRow>
              <DetailRow label='基因组位置'>
                {locationText(record)}
                {record.location?.band ? ` · ${record.location.band}` : ''}
              </DetailRow>
              <DetailRow label='基因组版本'>
                {record.genomeBuild || '—'}
              </DetailRow>
              <DetailRow label='转录本 / 参考序列'>
                {record.transcript || '—'}
                {record.referenceSequence
                  ? ` · ${record.referenceSequence}`
                  : ''}
              </DetailRow>
              <DetailRow label='临床意义'>
                {record.clinicalSignificance || '未提供'}（数据库注释）
              </DetailRow>
              <DetailRow label='审查状态'>
                {record.reviewStatusLabel}
                {record.reviewStatus ? (
                  <span className='text-muted-foreground'>
                    {' '}
                    · {record.reviewStatus}
                  </span>
                ) : null}
              </DetailRow>
              <DetailRow label='最后评估'>
                {record.lastEvaluated || '—'}
              </DetailRow>
              <DetailRow label='相关表型'>
                {record.phenotypes.length > 0
                  ? displayPhenotypes(record.phenotypes)
                  : '未提供'}
              </DetailRow>
              <DetailRow label='数据库来源'>{record.source}</DetailRow>
              <DetailRow label='查询时间'>
                {record.retrievedAt.replace('T', ' ').slice(0, 19)} UTC
              </DetailRow>
            </div>

            <div className='flex flex-wrap gap-2'>
              <Button asChild size='sm'>
                <a href={record.url} target='_blank' rel='noreferrer'>
                  打开 ClinVar 原始记录
                  <ArrowUpRight className='size-3.5' />
                </a>
              </Button>
              <Button variant='outline' size='sm' onClick={onClose}>
                关闭
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function VariantDatabasePage() {
  const [input, setInput] = useState('BRCA1')
  const [type, setType] = useState<VariantQueryType>('gene')
  const [limit, setLimit] = useState(10)
  const [submitted, setSubmitted] = useState<{
    q: string
    type: VariantQueryType
    limit: number
  }>({
    q: 'BRCA1',
    type: 'gene',
    limit: 10,
  })
  const [selected, setSelected] = useState<VariantRecord | null>(null)

  const query = useQuery({
    queryKey: ['variants', submitted.q, submitted.type, submitted.limit],
    queryFn: () =>
      searchVariants({
        q: submitted.q,
        type: submitted.type,
        limit: submitted.limit,
      }),
    enabled: submitted.q.trim().length > 0,
    staleTime: 5 * 60_000,
    retry: 0,
  })

  function runSearch(q: string, nextType: VariantQueryType, nextLimit = limit) {
    const text = q.trim()
    if (!text) {
      toast.error('请输入基因名、变异标识或 ClinVar ID')
      return
    }
    setInput(text)
    setType(nextType)
    setLimit(nextLimit)
    setSubmitted({ q: text, type: nextType, limit: nextLimit })
  }

  const error = query.error
  const errorMessage =
    error instanceof ApiError ? error.message : '查询失败，请稍后重试。'

  return (
    <>
      <AppHeader />
      <Main className='flex flex-col gap-4 sm:gap-5'>
        <PageHeader
          eyebrow='CLINVAR'
          title='变异数据库'
          description='查询 NCBI ClinVar 的已知变异注释，用于课程资料探索。数据库注释不等于诊断结论，也不等同于本站算法模拟结果。'
          actions={
            <Badge variant='outline' className='gap-1.5'>
              <Database className='size-3.5' />
              数据来源：NCBI ClinVar
            </Badge>
          }
        />

        <div className='flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400'>
          <ShieldQuestion className='mt-0.5 size-4 shrink-0' />
          <div className='space-y-0.5'>
            <p className='font-medium'>
              仅用于科研教学与资料探索，不用于临床诊断。
            </p>
            <p className='text-muted-foreground'>
              VUS（意义未明）不会被显示为致病；提交者的单条记录也不代表权威医学结论。
              需要参考基因组、染色体位置和转录本才能可靠匹配，单段 DNA
              序列无法直接查询疾病。
            </p>
          </div>
        </div>

        <Card className='gap-0 overflow-hidden py-0 shadow-card'>
          <div className='flex flex-col gap-3 p-4 sm:p-5'>
            <div className='grid gap-3 sm:grid-cols-2 lg:flex lg:items-end'>
              <div className='space-y-1.5 sm:col-span-2 lg:flex-1'>
                <Label htmlFor='variant-query' className='text-xs'>
                  搜索基因、变异标识或 ClinVar Variation ID
                </Label>
                <div className='relative'>
                  <Search className='pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    id='variant-query'
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') runSearch(input, type)
                    }}
                    placeholder='例如 BRCA1、rs80357906、VCV000012345'
                    className='h-10 ps-9'
                  />
                </div>
              </div>
              <div className='space-y-1.5 lg:w-40'>
                <Label className='text-xs'>查询类型</Label>
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as VariantQueryType)}
                >
                  <SelectTrigger className='h-10 w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='auto'>自动识别</SelectItem>
                    <SelectItem value='gene'>基因名</SelectItem>
                    <SelectItem value='variant'>变异标识</SelectItem>
                    <SelectItem value='id'>ClinVar ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5 lg:w-28'>
                <Label className='text-xs'>显示条数</Label>
                <Select
                  value={String(limit)}
                  onValueChange={(value) => {
                    const next = Number(value)
                    setLimit(next)
                    runSearch(input, type, next)
                  }}
                >
                  <SelectTrigger className='h-10 w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='10'>10 条</SelectItem>
                    <SelectItem value='20'>20 条</SelectItem>
                    <SelectItem value='50'>50 条</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className='h-10 sm:col-span-2 lg:w-28'
                onClick={() => runSearch(input, type)}
                disabled={query.isFetching}
              >
                查询
              </Button>
            </div>

            <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
              <span>示例：</span>
              {EXAMPLES.map((example) => (
                <Button
                  key={example.q}
                  variant='outline'
                  size='sm'
                  className='h-7 px-2 text-[11px]'
                  onClick={() => runSearch(example.q, example.type)}
                >
                  {example.label}
                </Button>
              ))}
              <span className='ms-auto flex items-center gap-1.5'>
                <CircleAlert className='size-3.5' />
                请求已做频率控制与短时缓存
              </span>
            </div>
          </div>
        </Card>

        {query.isFetching ? (
          <LoadingState rows={4} label='正在查询 ClinVar…' />
        ) : error ? (
          <ErrorState
            title='无法完成 ClinVar 查询'
            message={errorMessage}
            onRetry={
              error instanceof ApiError && error.code === 'UNSUPPORTED_QUERY'
                ? undefined
                : () => void query.refetch()
            }
          />
        ) : query.data ? (
          <div className='space-y-3'>
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
              <span className='font-medium text-foreground'>
                {query.data.query}
              </span>
              <span>共 {formatNumber(query.data.total)} 条匹配</span>
              <span>显示前 {query.data.returned} 条</span>
              <span>来源 {query.data.source}</span>
              <span>
                查询时间 {query.data.retrievedAt.replace('T', ' ').slice(0, 19)}{' '}
                UTC
              </span>
              {query.data.cached ? (
                <Badge variant='outline' className='text-[10px]'>
                  缓存结果
                </Badge>
              ) : null}
            </div>

            {query.data.warnings.length > 0 ? (
              <div className='rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground'>
                {query.data.warnings.join(' ')}
              </div>
            ) : null}

            {query.data.items.length === 0 ? (
              <EmptyState
                icon={Database}
                title='没有匹配的 ClinVar 记录'
                description='尝试使用标准基因符号（如 BRCA1）、rs 编号（rs80357906）或 ClinVar Variation ID。'
                action={
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => runSearch('BRCA1', 'gene')}
                  >
                    查询 BRCA1 示例
                  </Button>
                }
              />
            ) : (
              <div className='grid gap-3 xl:grid-cols-2'>
                {query.data.items.map((record) => (
                  <Card
                    key={record.id}
                    className='gap-0 overflow-hidden py-0 shadow-card transition-colors hover:border-primary/30'
                  >
                    <div className='flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between'>
                      <div className='min-w-0 space-y-2'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <span className='text-sm font-semibold'>
                            {record.gene || '未知基因'}
                          </span>
                          <SignificanceBadge value={record.significanceClass} />
                          <Badge
                            variant='outline'
                            className='text-[10px] font-normal text-muted-foreground'
                          >
                            {record.reviewStatusLabel}
                          </Badge>
                        </div>
                        <p className='line-clamp-2 text-sm text-foreground/90'>
                          {record.title || '未提供变异标题'}
                        </p>
                        <p className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
                          <span className='font-mono'>
                            {locationText(record)}
                          </span>
                          <span>{record.genomeBuild || '版本未提供'}</span>
                          <span>{record.transcript || '转录本未提供'}</span>
                          <span>
                            {record.refAllele || '—'} →{' '}
                            {record.altAllele || '—'}
                          </span>
                        </p>
                        {record.phenotypes.length > 0 ? (
                          <p className='line-clamp-1 text-xs text-muted-foreground'>
                            相关表型：{displayPhenotypes(record.phenotypes)}
                          </p>
                        ) : null}
                      </div>
                      <div className='flex shrink-0 items-center gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => setSelected(record)}
                        >
                          查看详情
                        </Button>
                        <Button asChild variant='ghost' size='sm'>
                          <a
                            href={record.url}
                            target='_blank'
                            rel='noreferrer'
                            aria-label='打开 ClinVar 原始记录'
                          >
                            <ExternalLink className='size-4' />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon={Database}
            title='开始查询已知变异'
            description='输入基因名、rs 编号或 ClinVar ID。ClinVar 返回的是数据库注释，不是本站算法预测的疾病结论。'
          />
        )}

        <div className='rounded-xl border border-dashed border-border/80 px-4 py-3 text-xs leading-relaxed text-muted-foreground'>
          数据来源：NCBI ClinVar（E-utilities）。ClinVar
          的临床意义与审查状态由提交者提供，
          本站不做二次医学解释；结果会显示查询时间与原始记录链接。若记录缺少基因组版本、
          染色体位置或转录本，页面会明确标注缺失字段，不进行推测。
        </div>
      </Main>

      <DetailDialog record={selected} onClose={() => setSelected(null)} />
    </>
  )
}
