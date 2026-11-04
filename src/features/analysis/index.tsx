import { useState } from 'react'
import { Copy, Dna, FlaskConical, Info } from 'lucide-react'
import { toast } from 'sonner'
import { DEMO_ANALYSIS } from '@/lib/demo-sequences'
import {
  analyzeSequence,
  formatNumber,
  formatPercent,
  type BaseCounts,
  type SequenceAnalysis,
} from '@/lib/dna'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ChartCard } from '@/components/geneai/chart-card'
import { EmptyState } from '@/components/geneai/empty-state'
import { ErrorState } from '@/components/geneai/error-state'
import { PageHeader } from '@/components/geneai/page-header'
import { SequenceInput } from '@/components/geneai/sequence-input'
import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'

const baseOrder = [
  { key: 'a', label: 'A', className: 'bg-chart-1' },
  { key: 't', label: 'T', className: 'bg-chart-2' },
  { key: 'g', label: 'G', className: 'bg-chart-4' },
  { key: 'c', label: 'C', className: 'bg-chart-3' },
  { key: 'n', label: 'N', className: 'bg-chart-5' },
] as const

function ResultMetric({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit?: string
}) {
  return (
    <div className='rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5'>
      <p className='text-[11px] text-muted-foreground'>{label}</p>
      <p className='mt-1 flex items-baseline gap-1'>
        <span className='font-mono text-lg leading-none font-semibold tabular-nums'>
          {value}
        </span>
        {unit ? (
          <span className='text-[11px] text-muted-foreground'>{unit}</span>
        ) : null}
      </p>
    </div>
  )
}

function CompositionBar({ counts }: { counts: BaseCounts }) {
  const total = counts.a + counts.t + counts.g + counts.c + counts.n
  if (total === 0) return null
  return (
    <div className='space-y-2'>
      <div className='flex h-2 overflow-hidden rounded-full bg-muted'>
        {baseOrder.map((base) => {
          const value = counts[base.key]
          if (value === 0) return null
          return (
            <span
              key={base.key}
              className={base.className}
              style={{ width: `${(value / total) * 100}%` }}
              title={`${base.label}: ${value}`}
            />
          )
        })}
      </div>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground'>
        {baseOrder.map((base) => (
          <span key={base.key} className='flex items-center gap-1.5'>
            <span className={`size-1.5 rounded-full ${base.className}`} />
            <span className='font-mono font-medium text-foreground'>
              {base.label}
            </span>
            <span className='tabular-nums'>{counts[base.key]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function ChainRow({
  label,
  value,
  onCopy,
}: {
  label: string
  value: string
  onCopy: () => void
}) {
  return (
    <div className='space-y-1.5'>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-xs font-medium text-muted-foreground'>
          {label}
        </span>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-7 px-1.5 text-[11px] text-muted-foreground'
          onClick={onCopy}
          disabled={!value}
        >
          <Copy className='size-3' />
          复制
        </Button>
      </div>
      <pre className='max-h-28 overflow-auto rounded-md border border-border/70 bg-muted/40 px-2.5 py-2 font-mono text-[11px] leading-5 break-all whitespace-pre-wrap text-foreground'>
        {value || '—'}
      </pre>
    </div>
  )
}

export function SequenceAnalysisPage() {
  const [name, setName] = useState('')
  const [raw, setRaw] = useState('')
  const [result, setResult] = useState<SequenceAnalysis | null>(null)

  const handleAnalyze = () => {
    const analysis = analyzeSequence(raw)
    setResult(analysis)
    if (analysis.issue) {
      toast.error(analysis.issue.message)
      return
    }
    if (!name && analysis.name) setName(analysis.name)
    toast.success(`分析完成：${formatNumber(analysis.length)} bp`)
  }

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label}已复制`)
    } catch {
      toast.error('复制失败，请手动选择文本复制')
    }
  }

  const loadDemo = () => {
    setRaw(DEMO_ANALYSIS.sequence)
    setName(DEMO_ANALYSIS.label)
    setResult(null)
  }

  const reset = () => {
    setRaw('')
    setName('')
    setResult(null)
  }

  const showResult = result !== null && result.length > 0

  return (
    <>
      <AppHeader />
      <Main>
        <PageHeader
          eyebrow='Sequence'
          title='DNA 序列分析'
          description='输入或上传 DNA 序列，计算碱基组成、GC / AT 含量，并生成互补链、反向互补链与 RNA 转录结果。'
          actions={
            <Badge
              variant='outline'
              className='gap-1.5 text-xs font-normal text-muted-foreground'
            >
              <Dna className='size-3' />
              浏览器内计算
            </Badge>
          }
        />

        <div className='mt-6 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]'>
          <Card className='gap-0 py-0 shadow-card'>
            <div className='flex items-center justify-between gap-2 border-b border-border/70 px-5 py-4'>
              <div className='space-y-1'>
                <h2 className='text-sm font-semibold tracking-tight'>
                  序列输入
                </h2>
                <p className='text-xs text-muted-foreground'>
                  支持纯文本、带换行的序列，以及 FASTA / FA 文件
                </p>
              </div>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-8 px-2 text-xs text-muted-foreground'
                onClick={loadDemo}
              >
                <FlaskConical className='size-3.5' />
                载入演示
              </Button>
            </div>

            <div className='space-y-4 p-5'>
              <div className='space-y-2'>
                <Label htmlFor='analysis-name' className='text-sm font-medium'>
                  记录名称
                  <span className='ms-1 text-xs font-normal text-muted-foreground'>
                    可选
                  </span>
                </Label>
                <Input
                  id='analysis-name'
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder='例如：人类 HBB 基因片段'
                  className='h-9'
                />
              </div>

              <SequenceInput
                value={raw}
                onChange={setRaw}
                onLoadDemo={loadDemo}
                onFileLoaded={({ name: fileName }) => {
                  if (!name) {
                    setName(fileName.replace(/\.[^.]+$/, ''))
                  }
                }}
                hint='仅支持 A / T / G / C / N；FASTA 头、空白、换行与数字会被自动忽略。'
              />

              <div className='flex flex-wrap items-center gap-2 pt-1'>
                <Button type='button' onClick={handleAnalyze}>
                  <Dna className='size-4' />
                  分析序列
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={reset}
                  disabled={!raw && !result}
                >
                  重置
                </Button>
                {raw ? (
                  <span className='ms-auto text-xs text-muted-foreground'>
                    已输入 {formatNumber(raw.replace(/\s/g, '').length)} 个字符
                  </span>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className='gap-0 py-0 shadow-card'>
            <div className='flex items-center justify-between gap-2 border-b border-border/70 px-5 py-4'>
              <div className='space-y-1'>
                <h2 className='text-sm font-semibold tracking-tight'>
                  分析结果
                </h2>
                <p className='text-xs text-muted-foreground'>
                  统计口径：GC 含量以 A + T + G + C 为分母
                </p>
              </div>
              {showResult && !result?.issue ? (
                <Badge variant='secondary' className='text-[10px] font-normal'>
                  预览
                </Badge>
              ) : null}
            </div>

            <div className='p-5'>
              {!result ? (
                <EmptyState
                  icon={Dna}
                  title='等待分析'
                  description='输入序列并点击「分析序列」，这里会显示长度、碱基组成、GC / AT 含量与三条转换链。'
                />
              ) : result.issue ? (
                <ErrorState
                  title='无法完成分析'
                  message={result.issue.message}
                />
              ) : (
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-3'>
                    <ResultMetric
                      label='序列长度'
                      value={formatNumber(result.length)}
                      unit='bp'
                    />
                    <ResultMetric
                      label='GC 含量'
                      value={formatPercent(result.gcContent)}
                    />
                    <ResultMetric
                      label='AT 含量'
                      value={formatPercent(result.atContent)}
                    />
                    <ResultMetric
                      label='N 碱基'
                      value={formatNumber(result.counts.n)}
                      unit='个'
                    />
                  </div>

                  <CompositionBar counts={result.counts} />

                  <Separator />

                  <div className='space-y-3'>
                    <ChainRow
                      label='互补链 (5′ → 3′)'
                      value={result.complement}
                      onCopy={() => handleCopy(result.complement, '互补链')}
                    />
                    <ChainRow
                      label='反向互补链 (5′ → 3′)'
                      value={result.reverseComplement}
                      onCopy={() =>
                        handleCopy(result.reverseComplement, '反向互补链')
                      }
                    />
                    <ChainRow
                      label='RNA 转录 (5′ → 3′)'
                      value={result.rna}
                      onCopy={() => handleCopy(result.rna, 'RNA 序列')}
                    />
                  </div>

                  <p className='flex items-start gap-1.5 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground'>
                    <Info className='mt-0.5 size-3.5 shrink-0' />
                    当前为本地预览：链转换与 GC
                    计算在浏览器内完成。保存到历史、后端校验与 PDF
                    报告将在后续阶段接入。
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className='mt-4'>
          <ChartCard
            title='计算说明'
            description='面向初高中生物知识的快速对照'
          >
            <div className='grid gap-4 text-sm sm:grid-cols-3'>
              <div className='space-y-1'>
                <p className='font-medium'>碱基互补配对</p>
                <p className='text-xs leading-relaxed text-muted-foreground'>
                  A 与 T 配对，G 与 C 配对。互补链按此规则逐位替换。
                </p>
              </div>
              <div className='space-y-1'>
                <p className='font-medium'>反向互补</p>
                <p className='text-xs leading-relaxed text-muted-foreground'>
                  先求互补链，再整体反向，常用于表示 DNA 双链的另一条链。
                </p>
              </div>
              <div className='space-y-1'>
                <p className='font-medium'>转录为 RNA</p>
                <p className='text-xs leading-relaxed text-muted-foreground'>
                  将序列中的 T 替换为 U，得到对应的 RNA 序列。
                </p>
              </div>
            </div>
          </ChartCard>
        </div>
      </Main>
    </>
  )
}
