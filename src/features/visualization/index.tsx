import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ChartColumn,
  ChartPie,
  ChartSpline,
  FlaskConical,
  History,
  Info,
  Percent,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { getGcWindows, listAnalyses } from '@/lib/api/geneai'
import { DEMO_ANALYSIS } from '@/lib/demo-sequences'
import { analyzeSequence, formatNumber, gcWindows } from '@/lib/dna'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { ErrorState } from '@/components/geneai/error-state'
import { LoadingState } from '@/components/geneai/loading-state'
import { PageHeader } from '@/components/geneai/page-header'
import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'
import { BaseCountBar } from './components/base-count-bar'
import { BaseRatioDonut } from './components/base-ratio-donut'
import { GcAtBar } from './components/gc-at-bar'
import { GcWindowLine } from './components/gc-window-line'
import {
  LengthDistribution,
  type LengthSample,
} from './components/length-distribution'

type WindowParams = { window: number; step: number }

const DEMO_RECORD = (() => {
  const analysis = analyzeSequence(DEMO_ANALYSIS.sequence)
  return {
    id: -1,
    name: `演示 · ${DEMO_ANALYSIS.label}`,
    length: analysis.length,
    counts: analysis.counts,
    gcContent: analysis.gcContent,
    atContent: analysis.atContent,
    sequence: analysis.sequence,
  }
})()

function defaultParams(length: number): WindowParams {
  const window = Math.max(1, Math.min(50, length))
  const step = window >= 10 ? 10 : 1
  return { window, step }
}

function parseParams(
  windowText: string,
  stepText: string,
  length: number
): { ok: true; value: WindowParams } | { ok: false; message: string } {
  if (!windowText.trim() || !stepText.trim()) {
    return { ok: false, message: '请填写窗口大小与步长。' }
  }
  const window = Number(windowText)
  const step = Number(stepText)
  if (!Number.isInteger(window) || !Number.isInteger(step)) {
    return { ok: false, message: '窗口大小与步长必须是整数。' }
  }
  if (window < 1) return { ok: false, message: '窗口大小至少为 1 bp。' }
  if (step < 1) return { ok: false, message: '步长至少为 1 bp。' }
  if (step > window) {
    return { ok: false, message: '步长不能大于窗口大小，否则会跳过碱基。' }
  }
  if (window > length) {
    return {
      ok: false,
      message: `窗口大小不能超过序列长度（当前 ${formatNumber(length)} bp）。`,
    }
  }
  return { ok: true, value: { window, step } }
}

export function DataVisualizationPage() {
  const [demo, setDemo] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [applied, setApplied] = useState<WindowParams | null>(null)
  const [edited, setEdited] = useState(false)
  const [draft, setDraft] = useState({ window: '50', step: '10' })

  const analysesQuery = useQuery({
    queryKey: ['analyses', 'visualization'],
    queryFn: () => listAnalyses({ pageSize: 100, includeSequence: false }),
    staleTime: 10_000,
    retry: 1,
  })

  const records = useMemo(
    () => analysesQuery.data?.items ?? [],
    [analysesQuery.data]
  )
  const active = demo
    ? DEMO_RECORD
    : (records.find((record) => String(record.id) === selectedId) ?? records[0])

  const effective = applied ?? (active ? defaultParams(active.length) : null)
  const display = edited
    ? draft
    : {
        window: String(effective?.window ?? 50),
        step: String(effective?.step ?? 10),
      }

  const validation = active
    ? parseParams(display.window, display.step, active.length)
    : null
  const appliedValid =
    active !== undefined &&
    effective !== null &&
    effective.window <= active.length &&
    effective.step <= effective.window

  const windowsQuery = useQuery({
    queryKey: ['gc-windows', active?.id, effective?.window, effective?.step],
    queryFn: () => getGcWindows(active!.id, effective!.window, effective!.step),
    enabled: !demo && !!active && appliedValid && active.id > 0,
    staleTime: 60_000,
    retry: 1,
  })

  const demoPoints = useMemo(() => {
    if (!demo || !active || !effective) return []
    return gcWindows(active.sequence, effective.window, effective.step)
  }, [demo, active, effective])

  const points = demo ? demoPoints : (windowsQuery.data?.points ?? [])
  const windowParams = effective ?? { window: 50, step: 10 }
  const canonical = active
    ? active.counts.a + active.counts.t + active.counts.g + active.counts.c
    : 0
  const ignoredBases =
    active && points.length > 0
      ? active.length - (points[points.length - 1]?.end ?? 0)
      : 0
  const samples: LengthSample[] = records.map((record) => ({
    id: record.id,
    name: record.name,
    length: record.length,
  }))

  function handleSelect(value: string) {
    setApplied(null)
    setEdited(false)
    if (value === 'demo') {
      setDemo(true)
      setSelectedId('')
      return
    }
    setDemo(false)
    setSelectedId(value)
  }

  function handleApply() {
    if (!active) return
    const parsed = parseParams(display.window, display.step, active.length)
    if (!parsed.ok) {
      toast.error(parsed.message)
      return
    }
    setApplied(parsed.value)
    setEdited(false)
    toast.success(
      `已应用窗口 ${parsed.value.window} bp · 步长 ${parsed.value.step} bp`
    )
  }

  const chartsLoading = demo
    ? false
    : active !== undefined && windowsQuery.isLoading && points.length === 0

  return (
    <>
      <AppHeader />
      <Main className='flex flex-col gap-4 sm:gap-5'>
        <PageHeader
          eyebrow='Visualization'
          title='数据可视化'
          description='选择一条已保存的分析记录，查看碱基组成、GC / AT 比例、可配置参数的滑动窗口 GC 曲线，以及历史序列长度分布。'
          actions={
            <Badge
              variant='outline'
              className='text-xs font-normal text-muted-foreground'
            >
              数据来自本机 SQLite
            </Badge>
          }
        />

        <Card className='gap-0 py-0 shadow-card'>
          <div className='grid gap-3 p-4 sm:grid-cols-2 sm:items-end xl:grid-cols-[minmax(240px,1fr)_112px_112px_auto_1fr]'>
            <div className='col-span-2 min-w-0 space-y-1.5 xl:col-span-1'>
              <Label className='text-xs text-muted-foreground'>数据来源</Label>
              <Select
                value={demo ? 'demo' : active ? String(active.id) : ''}
                onValueChange={handleSelect}
                disabled={analysesQuery.isLoading}
              >
                <SelectTrigger className='h-9 w-full'>
                  <SelectValue placeholder='选择一条分析记录' />
                </SelectTrigger>
                <SelectContent>
                  {records.map((record) => (
                    <SelectItem key={record.id} value={String(record.id)}>
                      {record.name} · {formatNumber(record.length)} bp
                    </SelectItem>
                  ))}
                  <SelectItem value='demo'>
                    演示数据 · HBB 片段（不入库）
                  </SelectItem>
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
                  inputMode='numeric'
                  value={display.window}
                  onChange={(event) => {
                    setEdited(true)
                    setDraft((current) => ({
                      ...current,
                      window: event.target.value,
                    }))
                  }}
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
                  inputMode='numeric'
                  value={display.step}
                  onChange={(event) => {
                    setEdited(true)
                    setDraft((current) => ({
                      ...current,
                      step: event.target.value,
                    }))
                  }}
                  className='h-9 w-20 font-mono text-xs'
                />
                <span className='text-xs text-muted-foreground'>bp</span>
              </div>
            </div>

            <Button
              size='sm'
              className='h-9 w-full justify-self-start sm:w-auto'
              onClick={handleApply}
              disabled={!active || !validation?.ok}
            >
              应用参数
            </Button>

            <div className='flex items-center gap-2 pb-1 sm:justify-self-end'>
              {demo ? (
                <Badge
                  variant='outline'
                  className='border-chart-4/40 bg-chart-4/10 text-[11px] text-chart-4'
                >
                  演示数据 · 不入库
                </Badge>
              ) : (
                <Badge
                  variant='secondary'
                  className='text-[11px] font-normal text-muted-foreground'
                >
                  最近 {records.length} 条分析记录
                </Badge>
              )}
            </div>
          </div>

          {validation && !validation.ok ? (
            <div className='border-t border-border/60 px-4 py-2 text-xs text-destructive'>
              {validation.message}
            </div>
          ) : (
            <div className='border-t border-border/60 px-4 py-2 text-xs text-muted-foreground'>
              仅计算完整窗口：{windowParams.window} bp
              窗口中，序列末尾不足一个窗口的碱基不参与曲线。
            </div>
          )}
        </Card>

        {demo ? (
          <div className='flex flex-col gap-3 rounded-xl border border-chart-4/30 bg-chart-4/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-start gap-2.5'>
              <FlaskConical className='mt-0.5 size-4 shrink-0 text-chart-4' />
              <div className='space-y-0.5'>
                <p className='text-sm font-medium text-chart-4'>
                  当前展示的是演示数据
                </p>
                <p className='text-xs leading-relaxed text-muted-foreground'>
                  序列为课程示例 HBB
                  片段，图表由本地真实算法计算，但不会写入数据库，也不会计入历史统计。
                </p>
              </div>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                setDemo(false)
                setApplied(null)
                setEdited(false)
              }}
            >
              退出演示
            </Button>
          </div>
        ) : null}

        {analysesQuery.isLoading ? (
          <LoadingState rows={6} label='正在读取分析记录…' />
        ) : analysesQuery.isError ? (
          <ErrorState
            title='无法读取分析记录'
            message='请确认后端服务已在 8000 端口启动，然后重试。'
            onRetry={() => void analysesQuery.refetch()}
          />
        ) : !active ? (
          <Card className='py-6 shadow-card'>
            <EmptyState
              icon={ChartPie}
              title='还没有可绘制的数据'
              description='保存一次 DNA 序列分析后，这里会生成碱基比例、GC / AT 与滑动窗口曲线。'
              action={
                <div className='flex flex-wrap items-center justify-center gap-2'>
                  <Button asChild size='sm'>
                    <Link to='/analysis'>
                      <FlaskConical className='size-4' />
                      开始一次分析
                    </Link>
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleSelect('demo')}
                  >
                    <Sparkles className='size-4 text-chart-3' />
                    查看演示数据
                  </Button>
                </div>
              }
            />
          </Card>
        ) : (
          <>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              <ChartCard
                title='碱基比例'
                description='A / T / G / C 在有效碱基中的占比'
                bodyClassName='px-4 py-3'
                action={
                  <Badge
                    variant='outline'
                    className='text-[10px] font-normal text-muted-foreground'
                  >
                    {demo ? '演示数据' : '实时数据'}
                  </Badge>
                }
              >
                {canonical > 0 ? (
                  <>
                    <BaseRatioDonut counts={active.counts} />
                    {active.counts.n > 0 ? (
                      <p className='mt-1 text-center text-[11px] text-muted-foreground'>
                        N {formatNumber(active.counts.n)} bp 未计入环形图与 GC /
                        AT 分母
                      </p>
                    ) : null}
                  </>
                ) : (
                  <EmptyState
                    compact
                    className='border-0'
                    icon={ChartPie}
                    title='没有 A / T / G / C'
                    description='该序列只包含 N，无法计算碱基比例与 GC / AT。'
                  />
                )}
              </ChartCard>

              <ChartCard
                title='碱基数量'
                description='四种碱基的实际计数'
                bodyClassName='px-4 py-3'
                action={
                  <Badge
                    variant='outline'
                    className='text-[10px] font-normal text-muted-foreground'
                  >
                    {demo ? '演示数据' : '实时数据'}
                  </Badge>
                }
              >
                <BaseCountBar counts={active.counts} />
              </ChartCard>

              <ChartCard
                title='GC / AT 含量'
                description='两种含量之和为 100%，N 不参与'
                className='md:col-span-2 xl:col-span-1'
                bodyClassName='px-4 py-3'
                action={
                  <Badge
                    variant='outline'
                    className='text-[10px] font-normal text-muted-foreground'
                  >
                    {active.gcContent.toFixed(1)}% /{' '}
                    {active.atContent.toFixed(1)}%
                  </Badge>
                }
              >
                <GcAtBar gc={active.gcContent} at={active.atContent} />
              </ChartCard>
            </div>

            <ChartCard
              title='滑动窗口 GC 曲线'
              description={`窗口 ${windowParams.window} bp · 步长 ${windowParams.step} bp · 参考坐标 1-based`}
              bodyClassName='px-3 py-3'
              action={
                <div className='flex items-center gap-2'>
                  <Badge
                    variant='outline'
                    className='text-[10px] font-normal text-muted-foreground'
                  >
                    {formatNumber(points.length)} 个窗口
                  </Badge>
                  {ignoredBases > 0 ? (
                    <Badge
                      variant='outline'
                      className='border-chart-4/40 bg-chart-4/8 text-[10px] text-chart-4'
                    >
                      末尾忽略 {ignoredBases} bp
                    </Badge>
                  ) : null}
                </div>
              }
            >
              {chartsLoading ? (
                <LoadingState rows={4} label='正在计算滑动窗口…' />
              ) : !appliedValid ? (
                <EmptyState
                  compact
                  className='border-0'
                  icon={ChartSpline}
                  title='窗口参数不适用于当前序列'
                  description='请调整窗口大小与步长后重新应用。'
                />
              ) : points.length > 0 ? (
                <GcWindowLine
                  points={points}
                  window={windowParams.window}
                  step={windowParams.step}
                  sequenceLength={active.length}
                />
              ) : (
                <EmptyState
                  compact
                  className='border-0'
                  icon={ChartSpline}
                  title='没有可计算的窗口'
                  description={`窗口 ${windowParams.window} bp 超过序列长度 ${formatNumber(active.length)} bp，请调小窗口。`}
                />
              )}
            </ChartCard>

            <ChartCard
              title='序列长度分布'
              description='按已保存分析的序列长度分桶统计'
              bodyClassName='px-3 py-3'
              action={
                <Badge
                  variant='outline'
                  className='text-[10px] font-normal text-muted-foreground'
                >
                  最近 {samples.length} 条
                </Badge>
              }
            >
              {samples.length > 0 ? (
                <>
                  <LengthDistribution samples={samples} />
                  <p className='px-2 pt-1 text-[11px] text-muted-foreground'>
                    长度分布读取全部已保存的序列分析（最多最近 100
                    条），不包含差异比较记录，也不受上方选中记录影响。
                  </p>
                </>
              ) : (
                <EmptyState
                  compact
                  className='border-0'
                  icon={History}
                  title='还没有历史长度数据'
                  description='保存序列分析后，这里会按长度区间统计记录数量。演示数据不计入分布。'
                  action={
                    <Button asChild variant='outline' size='sm'>
                      <Link to='/analysis'>去分析</Link>
                    </Button>
                  }
                />
              )}
            </ChartCard>
          </>
        )}

        <ChartCard title='图表口径' description='保证图表与算法结果一致'>
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            {[
              {
                icon: Percent,
                title: 'GC / AT 口径',
                body: 'GC = (G + C) / (A + T + G + C)，AT = (A + T) / (A + T + G + C)；N 单独计数，不进入分母。',
              },
              {
                icon: ChartSpline,
                title: '滑动窗口',
                body: '窗口从第 1 位开始，按步长向右移动；只输出完整窗口，末尾不足一个窗口的碱基直接忽略，不补零也不缩短窗口。',
              },
              {
                icon: ChartColumn,
                title: '长度分布',
                body: '统计最近 100 条已保存的序列分析，按 ≤50、51–100、101–250 … >10k 分桶，桶内为零时自动截断空桶。',
              },
              {
                icon: Info,
                title: '数据来源',
                body: '真实数据来自本机 SQLite；演示数据由本地算法实时计算并明确标注，不写入数据库、不参与统计。',
              },
            ].map((item) => (
              <div key={item.title} className='flex gap-2.5'>
                <item.icon className='mt-0.5 size-4 shrink-0 text-primary' />
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>{item.title}</p>
                  <p className='text-xs leading-relaxed text-muted-foreground'>
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </Main>
    </>
  )
}
