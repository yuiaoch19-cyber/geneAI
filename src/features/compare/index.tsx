import { useState } from 'react'
import {
  ArrowLeftRight,
  FlaskConical,
  GitCompareArrows,
  Percent,
  Ruler,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { DEMO_COMPARISON } from '@/lib/demo-sequences'
import {
  analyzeSequence,
  formatNumber,
  formatPercent,
  type SequenceAnalysis,
} from '@/lib/dna'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChartCard } from '@/components/geneai/chart-card'
import { EmptyState } from '@/components/geneai/empty-state'
import { PageHeader } from '@/components/geneai/page-header'
import { SequenceInput } from '@/components/geneai/sequence-input'
import { StatCard } from '@/components/geneai/stat-card'
import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'

type ComparedOverview = {
  reference: SequenceAnalysis
  query: SequenceAnalysis
}

export function SequenceComparePage() {
  const [reference, setReference] = useState('')
  const [query, setQuery] = useState('')
  const [overview, setOverview] = useState<ComparedOverview | null>(null)

  const updateReference = (value: string) => {
    setReference(value)
    setOverview(null)
  }

  const updateQuery = (value: string) => {
    setQuery(value)
    setOverview(null)
  }

  const loadDemo = () => {
    setReference(DEMO_COMPARISON.reference)
    setQuery(DEMO_COMPARISON.query)
    setOverview(null)
    toast.info('已载入演示数据：1 处替换 + 1 处插入')
  }

  const swap = () => {
    setReference(query)
    setQuery(reference)
    setOverview(null)
  }

  const handleCompare = () => {
    const refAnalysis = analyzeSequence(reference)
    const queryAnalysis = analyzeSequence(query)

    if (refAnalysis.issue) {
      toast.error(`参考序列：${refAnalysis.issue.message}`)
      return
    }
    if (queryAnalysis.issue) {
      toast.error(`待比较序列：${queryAnalysis.issue.message}`)
      return
    }
    if (!refAnalysis.length || !queryAnalysis.length) {
      toast.error('请先输入两条需要比较的序列')
      return
    }

    setOverview({ reference: refAnalysis, query: queryAnalysis })
    toast.success('输入校验通过，已生成序列概览')
  }

  const lengthDelta = overview
    ? overview.query.length - overview.reference.length
    : 0

  return (
    <>
      <AppHeader />
      <Main>
        <PageHeader
          eyebrow='Compare'
          title='序列差异比较'
          description='并排输入参考序列与待比较序列，先完成输入校验与基础指标对照；替换、插入、缺失的识别将在比对引擎接入后展示。'
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

        <div className='mt-6 grid gap-4 lg:grid-cols-2'>
          <Card className='gap-0 py-0 shadow-card'>
            <div className='border-b border-border/70 px-5 py-4'>
              <div className='flex items-center justify-between gap-2'>
                <h2 className='text-sm font-semibold tracking-tight'>
                  参考序列
                </h2>
                <Badge variant='outline' className='text-[10px] font-normal'>
                  Reference
                </Badge>
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                作为基准的原始序列
              </p>
            </div>
            <div className='p-5'>
              <SequenceInput
                id='reference-sequence'
                label=''
                value={reference}
                onChange={updateReference}
                placeholder='粘贴参考序列，或使用下方的演示数据'
                textareaClassName='min-h-48'
              />
            </div>
          </Card>

          <Card className='gap-0 py-0 shadow-card'>
            <div className='border-b border-border/70 px-5 py-4'>
              <div className='flex items-center justify-between gap-2'>
                <h2 className='text-sm font-semibold tracking-tight'>
                  待比较序列
                </h2>
                <Badge variant='outline' className='text-[10px] font-normal'>
                  Query
                </Badge>
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                可能发生替换、插入或缺失的序列
              </p>
            </div>
            <div className='p-5'>
              <SequenceInput
                id='query-sequence'
                label=''
                value={query}
                onChange={updateQuery}
                placeholder='粘贴待比较序列，长度可以与参考序列不同'
                textareaClassName='min-h-48'
              />
            </div>
          </Card>
        </div>

        <div className='mt-4 flex flex-wrap items-center gap-2'>
          <Button type='button' onClick={handleCompare}>
            <GitCompareArrows className='size-4' />
            校验并生成概览
          </Button>
          <Button type='button' variant='outline' onClick={loadDemo}>
            <FlaskConical className='size-4' />
            载入演示数据
          </Button>
          <span className='ms-auto flex items-center gap-1.5 text-xs text-muted-foreground'>
            <TriangleAlert className='size-3.5' />
            比对引擎将在阶段 5 接入，本页暂不生成差异结果
          </span>
        </div>

        <div className='mt-4'>
          <ChartCard
            title='比对结果'
            description='替换、插入、缺失与突变位置将通过表格和序列轨道展示'
            action={
              <Badge variant='outline' className='text-[10px] font-normal'>
                等待接入
              </Badge>
            }
          >
            {overview ? (
              <div className='space-y-4'>
                <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                  <StatCard
                    label='参考序列长度'
                    value={formatNumber(overview.reference.length)}
                    unit='bp'
                    icon={Ruler}
                    tone='blue'
                  />
                  <StatCard
                    label='待比较序列长度'
                    value={formatNumber(overview.query.length)}
                    unit='bp'
                    icon={Ruler}
                    tone='teal'
                  />
                  <StatCard
                    label='长度差'
                    value={
                      lengthDelta > 0 ? `+${lengthDelta}` : `${lengthDelta}`
                    }
                    unit='bp'
                    hint='待比较序列减去参考序列'
                    icon={ArrowLeftRight}
                    tone={lengthDelta === 0 ? 'violet' : 'amber'}
                  />
                  <StatCard
                    label='GC 含量差'
                    value={formatPercent(
                      overview.query.gcContent - overview.reference.gcContent
                    )}
                    hint={`参考 ${formatPercent(overview.reference.gcContent)} · 待比较 ${formatPercent(overview.query.gcContent)}`}
                    icon={Percent}
                    tone='violet'
                  />
                </div>
                <p className='flex items-start gap-1.5 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground'>
                  <TriangleAlert className='mt-0.5 size-3.5 shrink-0' />
                  以上仅为输入校验与基础指标对照，不是序列比对结果。替换、插入、缺失的识别与可视化会在后端比对接口完成后接入。
                </p>
              </div>
            ) : (
              <EmptyState
                icon={GitCompareArrows}
                title='尚未生成比对概览'
                description='输入两条序列后点击「校验并生成概览」。比对引擎接入后，这里会显示差异数量、比例与逐位突变位置。'
              />
            )}
          </ChartCard>
        </div>

        <div className='mt-4 grid gap-4 sm:grid-cols-3'>
          {[
            {
              title: '替换',
              description:
                '参考序列的某个碱基在待比较序列中变成了另一种碱基，序列长度不变。',
            },
            {
              title: '插入',
              description:
                '待比较序列中多出若干碱基，导致该位置之后的序列整体后移。',
            },
            {
              title: '缺失',
              description:
                '待比较序列中少了若干碱基，导致该位置之后的序列整体前移。',
            },
          ].map((item) => (
            <Card key={item.title} className='gap-1 p-5 shadow-card'>
              <p className='text-sm font-medium'>{item.title}</p>
              <p className='text-xs leading-relaxed text-muted-foreground'>
                {item.description}
              </p>
            </Card>
          ))}
        </div>
      </Main>
    </>
  )
}
