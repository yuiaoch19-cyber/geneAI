import { useState } from 'react'
import {
  ArrowRight,
  Copy,
  Dna,
  FlaskConical,
  Info,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  DnaStrand,
  MutationAnalysis,
  MutationType,
  SequenceDirection,
} from '@/types/api'
import { ApiError } from '@/lib/api/client'
import { mutateSequence } from '@/lib/api/geneai'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/geneai/page-header'
import { EmptyState } from '@/components/geneai/empty-state'
import { LoadingState } from '@/components/geneai/loading-state'
import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DnaDiffView } from './components/dna-diff-view'
import { ProteinDiffView } from './components/protein-diff-view'

const EXAMPLE = 'ATGGAACCTTGGTAA'

const CONSEQUENCE_TONE: Record<string, string> = {
  synonymous: 'border-chart-3/40 bg-chart-3/10 text-chart-3',
  missense: 'border-chart-4/40 bg-chart-4/10 text-chart-4',
  nonsense: 'border-destructive/40 bg-destructive/10 text-destructive',
  frameshift: 'border-chart-2/40 bg-chart-2/10 text-chart-2',
  'in-frame indel': 'border-chart-1/40 bg-chart-1/10 text-chart-1',
  stop_lost: 'border-chart-4/40 bg-chart-4/10 text-chart-4',
  no_protein: 'border-border bg-muted text-muted-foreground',
}

type Preset = {
  label: string
  type: MutationType
  position: number
  alt: string
  length?: number
  description: string
}

const PRESETS: Preset[] = [
  {
    label: '同义突变',
    type: 'substitution',
    position: 6,
    alt: 'G',
    description: 'GAA → GAG，仍为 Glu',
  },
  {
    label: '错义突变',
    type: 'substitution',
    position: 7,
    alt: 'T',
    description: 'CCT → TCT，Pro → Ser',
  },
  {
    label: '无义突变',
    type: 'substitution',
    position: 11,
    alt: 'A',
    description: 'TGG → TAG，提前终止',
  },
  {
    label: '移码插入',
    type: 'insertion',
    position: 4,
    alt: 'A',
    description: '插入 1 bp，阅读框改变',
  },
  {
    label: '整码插入',
    type: 'insertion',
    position: 3,
    alt: 'GGG',
    description: '插入 3 bp，不改变阅读框',
  },
  {
    label: '整码缺失',
    type: 'deletion',
    position: 4,
    length: 3,
    alt: '',
    description: '删除 GAA，整码缺失',
  },
]

function buildReport(analysis: MutationAnalysis): string {
  const { mutation } = analysis
  return [
    'GeneAI 突变分析报告',
    `突变类型：${mutation.type}（${mutation.position} 位）`,
    `原始序列：${analysis.originalSequence}`,
    `突变后序列：${analysis.mutatedSequence}`,
    `转录方向：${analysis.strand === 'coding' ? '编码链' : '模板链'} ${analysis.inputDirection === '5to3' ? "5'→3'" : "3'→5'"}`,
    `阅读框：+${analysis.frame}`,
    `突变后果：${analysis.label}${analysis.isPrematureStop ? '（提前终止）' : ''}`,
    `DNA 长度变化：${analysis.lengthDelta >= 0 ? '+' : ''}${analysis.lengthDelta} bp`,
    `蛋白质长度：${analysis.originalProteinLength} aa → ${analysis.mutatedProteinLength} aa`,
    `原始蛋白：${analysis.originalProtein}`,
    `突变蛋白：${analysis.mutatedProtein}`,
    `坐标规则：${mutation.coordinateRule}`,
    '',
    analysis.note,
  ].join('\n')
}

export function MutationSimulationPage() {
  const [name, setName] = useState('')
  const [sequence, setSequence] = useState(EXAMPLE)
  const [strand, setStrand] = useState<DnaStrand>('coding')
  const [direction, setDirection] = useState<SequenceDirection>('5to3')
  const [frame, setFrame] = useState(1)

  const [mutationType, setMutationType] = useState<MutationType>('substitution')
  const [position, setPosition] = useState('7')
  const [alt, setAlt] = useState('T')
  const [ref, setRef] = useState('')
  const [deleteLength, setDeleteLength] = useState('1')

  const [result, setResult] = useState<MutationAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetResult() {
    setResult(null)
    setError(null)
  }

  function applyPreset(preset: Preset) {
    setSequence(EXAMPLE)
    setMutationType(preset.type)
    setPosition(String(preset.position))
    setAlt(preset.alt)
    setRef('')
    setDeleteLength(String(preset.length ?? 1))
    resetResult()
  }

  function handleStrandChange(value: DnaStrand) {
    setStrand(value)
    if (value === 'coding') setDirection('5to3')
  }

  async function handleRun() {
    setError(null)
    const parsedPosition = Number(position)
    if (!Number.isInteger(parsedPosition) || parsedPosition < 0) {
      setError('位置必须是 0 或正整数。')
      return
    }
    const parsedLength =
      mutationType === 'deletion' ? Number(deleteLength) : null
    if (
      mutationType === 'deletion' &&
      (!Number.isInteger(parsedLength) || (parsedLength ?? 0) < 1)
    ) {
      setError('缺失长度必须是正整数。')
      return
    }
    setLoading(true)
    try {
      const data = await mutateSequence({
        sequence,
        mutationType,
        position: parsedPosition,
        alt,
        ref,
        length: parsedLength,
        frame,
        strand,
        inputDirection: direction,
      })
      setResult(data)
      toast.success(`突变分析完成：${data.label}`)
      if (window.innerWidth < 1280) {
        window.setTimeout(() => {
          document
            .getElementById('mutation-results')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 150)
      }
    } catch (cause) {
      const message =
        cause instanceof ApiError ? cause.message : '突变分析失败，请稍后再试。'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function copyReport() {
    if (!result) return
    await navigator.clipboard.writeText(buildReport(result))
    toast.success('已复制突变分析报告')
  }

  return (
    <>
      <AppHeader />
      <Main className='flex flex-col gap-4 sm:gap-5'>
        <PageHeader
          eyebrow='MUTATION'
          title='基因突变模拟'
          description='在 DNA 序列上应用替换、插入或缺失，比较突变前后的转录与蛋白质；所有坐标从 1 开始。'
          actions={
            <Badge
              variant='outline'
              className='gap-1.5 border-border/70 text-[11px] font-normal'
            >
              <Dna className='size-3.5' />
              1-based 坐标
            </Badge>
          }
        />

        <div className='grid gap-4 xl:grid-cols-12'>
          <div className='space-y-4 xl:col-span-5'>
            <Card className='gap-0 overflow-hidden py-0 shadow-card'>
              <CardHeader className='border-b border-border/70 px-5 py-4'>
                <CardTitle className='text-sm font-semibold'>原始 DNA 序列</CardTitle>
                <CardDescription className='text-xs'>
                  支持编码链或模板链；小写与空白会自动处理。
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4 px-5 py-4'>
                <div className='space-y-1.5'>
                  <Label htmlFor='mutation-name' className='text-xs'>
                    序列名称
                    <span className='ms-1 font-normal text-muted-foreground'>
                      可选
                    </span>
                  </Label>
                  <Input
                    id='mutation-name'
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder='例如：HBB 教学片段'
                    className='h-9'
                  />
                </div>

                <div className='grid gap-3 sm:grid-cols-3'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs'>输入链</Label>
                    <Select
                      value={strand}
                      onValueChange={(value) =>
                        handleStrandChange(value as DnaStrand)
                      }
                    >
                      <SelectTrigger className='h-9'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='coding'>编码链</SelectItem>
                        <SelectItem value='template'>模板链</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-1.5'>
                    <Label className='text-xs'>输入方向</Label>
                    <Select
                      value={direction}
                      onValueChange={(value) =>
                        setDirection(value as SequenceDirection)
                      }
                      disabled={strand === 'coding'}
                    >
                      <SelectTrigger className='h-9'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='5to3'>5′ → 3′</SelectItem>
                        <SelectItem value='3to5'>3′ → 5′</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-1.5'>
                    <Label className='text-xs'>阅读框</Label>
                    <Select
                      value={String(frame)}
                      onValueChange={(value) => setFrame(Number(value))}
                    >
                      <SelectTrigger className='h-9'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='1'>+1</SelectItem>
                        <SelectItem value='2'>+2</SelectItem>
                        <SelectItem value='3'>+3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='mutation-sequence' className='text-xs'>
                    DNA 序列
                  </Label>
                  <Textarea
                    id='mutation-sequence'
                    value={sequence}
                    onChange={(event) => setSequence(event.target.value)}
                    rows={5}
                    spellCheck={false}
                    className='resize-y font-mono text-[13px] leading-6'
                    placeholder='粘贴 DNA 序列，例如 ATGGAACCTTGGTAA'
                  />
                  <p className='text-[11px] text-muted-foreground'>
                    仅支持 A / T / G / C / N；N 不会被静默当成普通碱基。
                  </p>
                </div>

                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      setSequence(EXAMPLE)
                      resetResult()
                    }}
                  >
                    <Sparkles className='size-3.5' />
                    教学示例
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant='ghost'
                    onClick={() => {
                      setSequence('')
                      setName('')
                      resetResult()
                    }}
                  >
                    <RotateCcw className='size-3.5' />
                    清空
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className='gap-0 overflow-hidden py-0 shadow-card'>
              <CardHeader className='border-b border-border/70 px-5 py-4'>
                <CardTitle className='text-sm font-semibold'>突变操作</CardTitle>
                <CardDescription className='text-xs'>
                  指定类型、位置与碱基；提交后由后端重新校验。
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4 px-5 py-4'>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>突变类型</Label>
                  <Select
                    value={mutationType}
                    onValueChange={(value) => {
                      setMutationType(value as MutationType)
                      resetResult()
                    }}
                  >
                    <SelectTrigger className='h-9'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='substitution'>碱基替换</SelectItem>
                      <SelectItem value='insertion'>碱基插入</SelectItem>
                      <SelectItem value='deletion'>碱基缺失</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='grid gap-3 sm:grid-cols-2'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='mutation-position' className='text-xs'>
                      {mutationType === 'insertion'
                        ? '插入位置（第 N 位之后）'
                        : '起始位置'}
                    </Label>
                    <Input
                      id='mutation-position'
                      type='number'
                      min={0}
                      value={position}
                      onChange={(event) => setPosition(event.target.value)}
                      className='h-9 tabular-nums'
                    />
                  </div>

                  {mutationType === 'deletion' ? (
                    <div className='space-y-1.5'>
                      <Label htmlFor='mutation-length' className='text-xs'>
                        删除长度（bp）
                      </Label>
                      <Input
                        id='mutation-length'
                        type='number'
                        min={1}
                        value={deleteLength}
                        onChange={(event) => setDeleteLength(event.target.value)}
                        className='h-9 tabular-nums'
                      />
                    </div>
                  ) : (
                    <div className='space-y-1.5'>
                      <Label htmlFor='mutation-alt' className='text-xs'>
                        {mutationType === 'substitution'
                          ? '替换为'
                          : '插入碱基'}
                      </Label>
                      <Input
                        id='mutation-alt'
                        value={alt}
                        onChange={(event) =>
                          setAlt(event.target.value.toUpperCase())
                        }
                        placeholder='如 G'
                        className='h-9 font-mono'
                      />
                    </div>
                  )}
                </div>

                {mutationType === 'substitution' ? (
                  <div className='space-y-1.5'>
                    <Label htmlFor='mutation-ref' className='text-xs'>
                      参考碱基
                      <span className='ms-1 font-normal text-muted-foreground'>
                        可选，留空则取该位置
                      </span>
                    </Label>
                    <Input
                      id='mutation-ref'
                      value={ref}
                      onChange={(event) =>
                        setRef(event.target.value.toUpperCase())
                      }
                      placeholder='用于校验，如 C'
                      className='h-9 font-mono'
                    />
                  </div>
                ) : null}

                <p className='rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground'>
                  替换 / 缺失为 1-based 起始位置；插入表示“第 N 位之后”，0
                  表示序列开头。插入位置 0 属于边界情况，后端会校验。
                </p>

                {error ? (
                  <div className='flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs leading-relaxed text-destructive'>
                    <Info className='mt-0.5 size-3.5 shrink-0' />
                    {error}
                  </div>
                ) : null}

                <Button
                  type='button'
                  className='w-full'
                  disabled={loading}
                  onClick={() => void handleRun()}
                >
                  {loading ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : (
                    <Play className='size-4' />
                  )}
                  {loading ? '正在分析…' : '应用突变并分析'}
                </Button>

                <div className='space-y-2 border-t border-border/70 pt-3'>
                  <p className='text-[11px] font-medium text-muted-foreground'>
                    教学预设（15 bp 示例）
                  </p>
                  <div className='flex flex-wrap gap-1.5'>
                    {PRESETS.map((preset) => (
                      <Button
                        key={preset.label}
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-7 px-2 text-[11px]'
                        title={preset.description}
                        onClick={() => applyPreset(preset)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='gap-0 overflow-hidden py-0 shadow-card'>
              <CardHeader className='border-b border-border/70 px-5 py-4'>
                <CardTitle className='text-sm font-semibold'>
                  突变类型说明
                </CardTitle>
                <CardDescription className='text-xs'>
                  分类依据是密码子与蛋白质结果，而不是 DNA 变化形式。
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3 px-5 py-4'>
                {[
                  [
                    '同义突变',
                    'bg-chart-3',
                    '碱基改变，但编码的氨基酸不变。',
                  ],
                  [
                    '错义突变',
                    'bg-chart-4',
                    '一个氨基酸被替换为另一个氨基酸。',
                  ],
                  [
                    '无义突变',
                    'bg-destructive',
                    '提前出现终止密码子，蛋白质被截短。',
                  ],
                  [
                    '移码突变',
                    'bg-chart-2',
                    '插入/缺失长度不是 3 的倍数，阅读框改变。',
                  ],
                  [
                    '整码插入/缺失',
                    'bg-chart-1',
                    '长度是 3 的倍数，阅读框不变，但氨基酸增减。',
                  ],
                ].map(([label, dot, description]) => (
                  <div key={label} className='flex items-start gap-2.5'>
                    <span
                      className={cn('mt-1.5 size-2 shrink-0 rounded-full', dot)}
                    />
                    <div className='space-y-0.5'>
                      <p className='text-xs font-medium'>{label}</p>
                      <p className='text-[11px] leading-relaxed text-muted-foreground'>
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div
            id='mutation-results'
            className='min-w-0 scroll-mt-20 space-y-4 xl:col-span-7'
          >
            {loading ? (
              <Card className='py-0 shadow-card'>
                <CardContent className='p-5'>
                  <LoadingState rows={6} label='正在应用突变并生成蛋白质…' />
                </CardContent>
              </Card>
            ) : !result ? (
              <Card className='py-0 shadow-card'>
                <CardContent className='p-5'>
                  <EmptyState
                    icon={FlaskConical}
                    title='等待一次突变分析'
                    description='选择突变类型与位置后点击「应用突变并分析」，这里会显示 DNA、RNA 与蛋白质层面的对比。'
                    action={
                      <Button
                        type='button'
                        size='sm'
                        onClick={() => void handleRun()}
                      >
                        <Play className='size-3.5' />
                        分析教学示例
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className='gap-0 overflow-hidden py-0 shadow-card'>
                  <CardHeader className='border-b border-border/70 px-5 py-4'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <div className='space-y-1'>
                        <CardTitle className='text-sm font-semibold'>
                          分析结果
                        </CardTitle>
                        <CardDescription className='text-xs'>
                          {name || '未命名序列'} · {result.originalSequence.length} bp
                        </CardDescription>
                      </div>
                      <div className='flex flex-wrap items-center gap-1.5'>
                        {result.isPrematureStop ? (
                          <Badge
                            variant='outline'
                            className='border-destructive/40 bg-destructive/10 text-[10px] text-destructive'
                          >
                            提前终止
                          </Badge>
                        ) : null}
                        <Badge
                          variant='outline'
                          className={cn(
                            'text-[10px]',
                            CONSEQUENCE_TONE[result.consequence]
                          )}
                        >
                          {result.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className='grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-4'>
                    {[
                      [
                        'DNA 长度变化',
                        `${result.lengthDelta >= 0 ? '+' : ''}${result.lengthDelta} bp`,
                      ],
                      [
                        '蛋白质长度',
                        `${result.originalProteinLength} → ${result.mutatedProteinLength} aa`,
                      ],
                      [
                        '受影响密码子',
                        result.affectedCodon ? `第 ${result.affectedCodon} 个` : '—',
                      ],
                      ['阅读框', `+${result.frame}（${result.strand === 'coding' ? '编码链' : '模板链'}）`],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className='rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5'
                      >
                        <p className='text-[11px] text-muted-foreground'>{label}</p>
                        <p className='mt-1 text-sm font-semibold tabular-nums'>
                          {value}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className='gap-0 overflow-hidden py-0 shadow-card'>
                  <CardHeader className='border-b border-border/70 px-5 py-4'>
                    <CardTitle className='text-sm font-semibold'>DNA 差异</CardTitle>
                    <CardDescription className='text-xs'>
                      红色为原始序列中的替换/缺失碱基，绿色为突变后新增或替换的碱基。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='px-5 py-4'>
                    <DnaDiffView analysis={result} />
                  </CardContent>
                </Card>

                <Card className='gap-0 overflow-hidden py-0 shadow-card'>
                  <CardHeader className='border-b border-border/70 px-5 py-4'>
                    <CardTitle className='text-sm font-semibold'>转录对比</CardTitle>
                    <CardDescription className='text-xs'>
                      统一输出 5′→3′ RNA；模板链先转换为编码链再转录。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-3 px-5 py-4'>
                    {[
                      ['原始 RNA', result.originalRna],
                      ['突变后 RNA', result.mutatedRna],
                    ].map(([label, rna]) => (
                      <div key={label} className='space-y-1.5'>
                        <p className='text-[11px] font-medium text-muted-foreground'>
                          {label}
                        </p>
                        <div className='max-h-24 overflow-auto rounded-lg border border-border/70 bg-muted/30 p-3 font-mono text-xs leading-relaxed break-all'>
                          {rna || '—'}
                        </div>
                      </div>
                    ))}
                    {result.originalProtein === result.mutatedProtein ? (
                      <p className='text-[11px] text-muted-foreground'>
                        RNA 可能已改变，但按标准遗传密码翻译出的蛋白质相同。
                      </p>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className='gap-0 overflow-hidden py-0 shadow-card'>
                  <CardHeader className='border-b border-border/70 px-5 py-4'>
                    <CardTitle className='text-sm font-semibold'>蛋白质对比</CardTitle>
                    <CardDescription className='text-xs'>
                      逐位显示氨基酸变化；`*` 表示终止密码子。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='px-5 py-4'>
                    <ProteinDiffView analysis={result} />
                  </CardContent>
                </Card>

                <Card className='gap-0 overflow-hidden py-0 shadow-card'>
                  <CardHeader className='flex flex-row items-center justify-between border-b border-border/70 px-5 py-4'>
                    <div className='space-y-1'>
                      <CardTitle className='text-sm font-semibold'>
                        分析报告
                      </CardTitle>
                      <CardDescription className='text-xs'>
                        用于课程演示的序列层面摘要。
                      </CardDescription>
                    </div>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      onClick={() => void copyReport()}
                    >
                      <Copy className='size-3.5' />
                      复制报告
                    </Button>
                  </CardHeader>
                  <CardContent className='space-y-3 px-5 py-4 text-xs leading-relaxed'>
                    <dl className='grid gap-x-6 gap-y-2 sm:grid-cols-2'>
                      {[
                        ['突变', `${result.label} · ${result.mutation.position} 位`],
                        ['坐标规则', result.mutation.coordinateRule],
                        ['阅读框', `+${result.frame}`],
                        [
                          '输入链 / 方向',
                          `${result.strand === 'coding' ? '编码链' : '模板链'} · ${result.inputDirection === '5to3' ? "5'→3'" : "3'→5'"}`,
                        ],
                        ['原始蛋白', result.originalProtein],
                        ['突变蛋白', result.mutatedProtein],
                      ].map(([label, value]) => (
                        <div key={label} className='flex gap-2'>
                          <dt className='w-20 shrink-0 text-muted-foreground'>
                            {label}
                          </dt>
                          <dd className='min-w-0 font-medium break-all'>{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className='rounded-lg border border-chart-4/30 bg-chart-4/8 px-3 py-2 text-[11px] text-chart-4'>
                      {result.note}
                    </p>
                    <p className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
                      <ArrowRight className='size-3.5' />
                      序列变化不等于疾病结论；本页不提供临床解释。
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </Main>
    </>
  )
}
