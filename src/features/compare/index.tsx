import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ComparisonResult } from '@/types/api'
import {
  ArrowLeftRight,
  FlaskConical,
  Gauge,
  GitCompareArrows,
  Info,
  Loader2,
  Minus,
  Percent,
  Plus,
  Replace,
  Save,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api/client'
import { compareSequences, saveComparison } from '@/lib/api/geneai'
import { DEMO_COMPARISON } from '@/lib/demo-sequences'
import { analyzeSequence, formatPercent } from '@/lib/dna'
import { statsKeys } from '@/hooks/use-stats-overview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ChartCard } from '@/components/geneai/chart-card'
import { EmptyState } from '@/components/geneai/empty-state'
import { ErrorState } from '@/components/geneai/error-state'
import { LoadingState } from '@/components/geneai/loading-state'
import { PageHeader } from '@/components/geneai/page-header'
import { SequenceInput } from '@/components/geneai/sequence-input'
import { StatCard } from '@/components/geneai/stat-card'
import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'
import { AlignmentView, DifferenceTable } from './components/alignment-view'

export function SequenceComparePage() {
  const queryClient = useQueryClient()
  const [reference, setReference] = useState('')
  const [query, setQuery] = useState('')
  const [referenceName, setReferenceName] = useState('')
  const [queryName, setQueryName] = useState('')
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearResult = () => {
    setResult(null)
    setSavedId(null)
    setError(null)
  }

  const updateReference = (value: string) => {
    setReference(value)
    clearResult()
  }

  const updateQuery = (value: string) => {
    setQuery(value)
    clearResult()
  }

  const loadDemo = () => {
    setReference(DEMO_COMPARISON.reference)
    setQuery(DEMO_COMPARISON.query)
    setReferenceName('HBB 参考片段')
    setQueryName('HBB 样本片段')
    clearResult()
    toast.info('已载入演示数据：1 处替换 + 1 处插入，点击「开始比对」查看结果')
  }

  const swap = () => {
    setReference(query)
    setQuery(reference)
    setReferenceName(queryName)
    setQueryName(referenceName)
    clearResult()
  }

  const validate = (): boolean => {
    const ref = analyzeSequence(reference)
    const sample = analyzeSequence(query)

    if (ref.issue) {
      toast.error(`参考序列：${ref.issue.message}`)
      return false
    }
    if (sample.issue) {
      toast.error(`待比较序列：${sample.issue.message}`)
      return false
    }
    if (!ref.length || !sample.length) {
      toast.error('请先输入两条需要比较的序列')
      return false
    }
    return true
  }

  const handleCompare = async () => {
    if (!validate()) return

    setLoading(true)
    setError(null)
    try {
      const data = await compareSequences({
        reference,
        query,
        referenceName: referenceName.trim() || '参考序列',
        queryName: queryName.trim() || '待比较序列',
      })
      setResult(data)
      setSavedId(null)
      toast.success(
        data.differenceCount === 0
          ? '比对完成：两条序列完全一致'
          : `比对完成：共 ${data.differenceCount} 处差异`
      )
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : '比对失败，请稍后重试。'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!result) return
    setSaving(true)
    try {
      const record = await saveComparison({
        reference,
        query,
        referenceName: result.referenceName,
        queryName: result.queryName,
      })
      setSavedId(record.id)
      void queryClient.invalidateQueries({ queryKey: statsKeys.overview })
      toast.success(`已保存比对记录 #${record.id}`)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : '保存失败，请稍后重试。'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AppHeader />
      <Main className='flex flex-col gap-4 sm:gap-5'>
        <PageHeader
          eyebrow='Compare'
          title='序列差异比较'
          description='使用 Biopython PairwiseAligner 做全局比对，识别替换、插入与缺失；差异位置以参考序列的 1-based 坐标标记。'
          actions={
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={swap}
              disabled={!reference && !query}
            >
              <ArrowLeftRight className='size-3.5' />
              交换两条序列
            </Button>
          }
        />

        <div className='grid gap-4 lg:grid-cols-2'>
          <Card className='min-w-0 gap-0 py-0 shadow-card'>
            <div className='border-b border-border/70 px-5 py-4'>
              <div className='flex items-center justify-between gap-2'>
                <h2 className='text-sm font-semibold tracking-tight'>
                  参考序列
                </h2>
                <Badge
                  variant='outline'
                  className='border-chart-2/40 bg-chart-2/10 text-[10px] text-chart-2'
                >
                  Reference
                </Badge>
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                作为坐标基准的原始序列，差异位置以它的 1-based 坐标记录
              </p>
            </div>
            <div className='space-y-3 p-5'>
              <Input
                value={referenceName}
                onChange={(event) => setReferenceName(event.target.value)}
                placeholder='参考序列名称（可选）'
                maxLength={120}
                className='h-9'
              />
              <SequenceInput
                id='reference-sequence'
                label=''
                value={reference}
                onChange={updateReference}
                placeholder='粘贴参考序列，或使用下方的演示数据'
                textareaClassName='min-h-44'
              />
            </div>
          </Card>

          <Card className='min-w-0 gap-0 py-0 shadow-card'>
            <div className='border-b border-border/70 px-5 py-4'>
              <div className='flex items-center justify-between gap-2'>
                <h2 className='text-sm font-semibold tracking-tight'>
                  待比较序列
                </h2>
                <Badge
                  variant='outline'
                  className='border-chart-1/40 bg-chart-1/10 text-[10px] text-chart-1'
                >
                  Query
                </Badge>
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                允许与参考序列长度不同，比对算法会处理插入与缺失
              </p>
            </div>
            <div className='space-y-3 p-5'>
              <Input
                value={queryName}
                onChange={(event) => setQueryName(event.target.value)}
                placeholder='待比较序列名称（可选）'
                maxLength={120}
                className='h-9'
              />
              <SequenceInput
                id='query-sequence'
                label=''
                value={query}
                onChange={updateQuery}
                placeholder='粘贴待比较序列，长度可以与参考序列不同'
                textareaClassName='min-h-44'
              />
            </div>
          </Card>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            onClick={() => void handleCompare()}
            disabled={loading || !reference.trim() || !query.trim()}
          >
            {loading ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <GitCompareArrows className='size-4' />
            )}
            {loading ? '比对中…' : '开始比对'}
          </Button>
          <Button type='button' variant='outline' onClick={loadDemo}>
            <FlaskConical className='size-4' />
            载入演示数据
          </Button>
          <Button
            type='button'
            variant='ghost'
            onClick={() => {
              setReference('')
              setQuery('')
              setReferenceName('')
              setQueryName('')
              clearResult()
            }}
            disabled={!reference && !query}
          >
            清空
          </Button>
          <span className='ms-auto flex items-center gap-1.5 text-xs text-muted-foreground'>
            <Info className='size-3.5' />
            全局比对 · 每条序列上限 5,000 bp
          </span>
        </div>

        {error ? (
          <ErrorState
            title='比对未能完成'
            message={error}
            onRetry={() => void handleCompare()}
          />
        ) : null}

        {loading ? (
          <LoadingState rows={6} label='正在执行全局比对并整理差异…' />
        ) : null}

        {!loading && !result && !error ? (
          <Card className='gap-0 py-0 shadow-card'>
            <EmptyState
              icon={GitCompareArrows}
              title='还没有比对结果'
              description='输入两条序列后点击「开始比对」。页面会展示对齐后的序列、差异类型与参考坐标。'
            />
          </Card>
        ) : null}

        {result ? (
          <div className='space-y-4'>
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
              <StatCard
                label='比对评分'
                value={result.score.toFixed(1)}
                hint='match +2 / gap −10'
                icon={Gauge}
                tone='blue'
              />
              <StatCard
                label='一致性'
                value={result.identity.toFixed(1)}
                unit='%'
                hint={`${result.alignmentLength} 个对齐列`}
                icon={Percent}
                tone='teal'
              />
              <StatCard
                label='替换'
                value={String(result.substitutions)}
                hint='参考与查询碱基不同'
                icon={Replace}
                tone='amber'
              />
              <StatCard
                label='插入'
                value={String(result.insertions)}
                hint='查询序列中多出的碱基'
                icon={Plus}
                tone='teal'
              />
              <StatCard
                label='缺失'
                value={String(result.deletions)}
                hint='参考序列中多出的碱基'
                icon={Minus}
                tone='violet'
              />
              <StatCard
                label='总差异'
                value={String(result.differenceCount)}
                hint={`占对齐列 ${formatPercent(result.differenceRatio)}`}
                icon={GitCompareArrows}
                tone='blue'
              />
            </div>

            <ChartCard
              title='对齐结果'
              description={`${result.referenceName} × ${result.queryName}`}
              action={
                <Button
                  type='button'
                  size='sm'
                  variant={savedId ? 'outline' : 'default'}
                  onClick={() => void handleSave()}
                  disabled={saving || savedId !== null}
                >
                  {saving ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : (
                    <Save className='size-4' />
                  )}
                  {savedId ? `已保存 #${savedId}` : '保存到历史'}
                </Button>
              }
            >
              <AlignmentView result={result} />
            </ChartCard>

            <div className='grid gap-4 xl:grid-cols-12'>
              <Card className='min-w-0 gap-0 py-0 shadow-card xl:col-span-7'>
                <div className='flex items-center justify-between gap-2 border-b border-border/70 px-5 py-4'>
                  <div>
                    <h2 className='text-sm font-semibold tracking-tight'>
                      差异明细
                    </h2>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      差异按参考坐标排序；插入位置表示「第 N 位之后」
                    </p>
                  </div>
                  <Badge variant='outline' className='text-[10px] font-normal'>
                    {result.differenceCount} 处
                  </Badge>
                </div>
                <div className='p-4'>
                  <DifferenceTable differences={result.differences} />
                </div>
              </Card>

              <Card className='min-w-0 gap-3 p-5 shadow-card xl:col-span-5'>
                <h2 className='text-sm font-semibold tracking-tight'>
                  算法与口径
                </h2>
                <dl className='space-y-3 text-xs'>
                  <div>
                    <dt className='text-muted-foreground'>比对算法</dt>
                    <dd className='mt-0.5 leading-relaxed'>
                      {result.algorithm}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>评分参数</dt>
                    <dd className='mt-0.5 font-mono text-[11px] leading-relaxed'>
                      match {result.scoring.match_score} · mismatch{' '}
                      {result.scoring.mismatch_score} · gap open{' '}
                      {result.scoring.open_gap_score} · extend{' '}
                      {result.scoring.extend_gap_score}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>同分策略</dt>
                    <dd className='mt-0.5 leading-relaxed'>
                      {result.tieBreak}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>坐标规则</dt>
                    <dd className='mt-0.5 leading-relaxed'>
                      {result.coordinateRule}
                    </dd>
                  </div>
                </dl>
                <p className='flex items-start gap-2 rounded-lg border border-chart-4/30 bg-chart-4/8 px-3 py-2.5 text-[11px] leading-relaxed text-chart-4'>
                  <TriangleAlert className='mt-0.5 size-3.5 shrink-0' />
                  比对差异是算法给出的最优对齐推断，不等同于真实生物学突变；本页面不提供任何疾病或临床结论。
                </p>
              </Card>
            </div>
          </div>
        ) : null}
      </Main>
    </>
  )
}
