import { useState, type ReactNode } from 'react'
import type {
  DnaStrand,
  SequenceDirection,
  TranscriptionResult,
  TranslationResult,
} from '@/types/api'
import {
  ArrowRight,
  Boxes,
  ChevronDown,
  Dna,
  FlaskConical,
  Info,
  Maximize2,
  Minimize2,
  Play,
  Sparkles,
  Waves,
} from 'lucide-react'
import { toast } from 'sonner'
import { transcribeSequence, translateSequence } from '@/lib/api/geneai'
import { TEACHING_SAMPLES } from '@/lib/demo-sequences'
import { analyzeSequence } from '@/lib/dna'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DnaMark } from '@/components/geneai/dna/dna-mark'
import { PageHeader } from '@/components/geneai/page-header'
import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'
import { BASE_HEX, BASE_NAMES } from './colors'
import { DnaHelix } from './components/dna-helix'
import { MobilePlayerBar, PlayerControls } from './components/player-controls'
import { TranscriptionStage } from './components/transcription-stage'
import { TranslationStage } from './components/translation-stage'
import { useCentralDogmaPlayer } from './use-player'

const EXAMPLE = 'ATGGAACCTTGGTAA'

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className='gap-0 overflow-hidden py-0 shadow-card'>
      <div className='flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-5 py-4'>
        <div>
          <h2 className='text-sm font-semibold tracking-tight'>{title}</h2>
          <p className='mt-1 text-xs text-muted-foreground'>{description}</p>
        </div>
        {action}
      </div>
      <div className='p-5'>{children}</div>
    </Card>
  )
}

export function TranscriptionPage() {
  const [name, setName] = useState('')
  const [raw, setRaw] = useState(EXAMPLE)
  const [strand, setStrand] = useState<DnaStrand>('coding')
  const [direction, setDirection] = useState<SequenceDirection>('5to3')
  const [frame, setFrame] = useState('1')
  const [expanded, setExpanded] = useState(true)
  const [transcription, setTranscription] =
    useState<TranscriptionResult | null>(null)
  const [translation, setTranslation] = useState<TranslationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const player = useCentralDogmaPlayer(transcription, translation)

  async function handleAnalyze() {
    const parsed = analyzeSequence(raw)
    if (parsed.issue) {
      setError(parsed.issue.message)
      setTranscription(null)
      setTranslation(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const input = {
        sequence: parsed.sequence,
        strand,
        inputDirection: direction,
        frame: Number(frame),
      }
      const [transcribed, translated] = await Promise.all([
        transcribeSequence(input),
        translateSequence(input),
      ])
      setTranscription(transcribed)
      setTranslation(translated)
      toast.success('转录与翻译结果已生成')
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败，请稍后重试。')
      setTranscription(null)
      setTranslation(null)
    } finally {
      setLoading(false)
    }
  }

  function loadSample(sampleId: string) {
    const sample = TEACHING_SAMPLES.find((item) => item.id === sampleId)
    if (!sample) return
    setName(sample.label)
    setRaw(sample.sequence)
    setStrand('coding')
    setDirection('5to3')
    setFrame('1')
    setTranscription(null)
    setTranslation(null)
    setError(null)
    toast.success(`已载入${sample.label}`)
  }

  function clearAll() {
    setName('')
    setRaw('')
    setStrand('coding')
    setDirection('5to3')
    setFrame('1')
    setTranscription(null)
    setTranslation(null)
    setError(null)
  }

  const currentCodon = player.frame.currentCodon
  const focusStart =
    player.frame.currentBase ?? (currentCodon ? currentCodon.start - 1 : null)
  const focusEnd =
    player.frame.currentBase ?? (currentCodon ? currentCodon.end - 1 : null)

  return (
    <>
      <AppHeader />
      <Main className='flex flex-col gap-5 pb-28 xl:pb-6'>
        <PageHeader
          eyebrow='CENTRAL DOGMA'
          title='转录与翻译演示'
          description='从 DNA 双螺旋到 mRNA，再到核糖体与多肽链。每一步只使用后端算法返回的碱基、密码子与氨基酸。'
          actions={
            <Badge
              variant='outline'
              className='gap-1.5 border-blue-200 bg-blue-50 px-2.5 py-1 font-normal text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300'
            >
              <Sparkles className='size-3.5' />
              算法驱动动画
            </Badge>
          }
        />

        <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-start'>
          <div className='flex min-w-0 flex-col gap-4'>
            <SectionCard
              title='DNA 序列输入'
              description='支持编码链或模板链；小写会自动转大写，空白与换行会被忽略。'
              action={
                <Badge variant='outline' className='text-[10px] font-normal'>
                  A / T / G / C / N
                </Badge>
              }
            >
              <div className='space-y-4'>
                <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                  <div className='space-y-1.5 sm:col-span-2 lg:col-span-1'>
                    <label className='text-xs font-medium' htmlFor='seq-name'>
                      序列名称
                    </label>
                    <Input
                      id='seq-name'
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder='可选'
                      className='h-9'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-medium'>输入链</label>
                    <Select
                      value={strand}
                      onValueChange={(value) => {
                        setStrand(value as DnaStrand)
                        if (value === 'coding') setDirection('5to3')
                      }}
                    >
                      <SelectTrigger className='h-9 w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='coding'>编码链</SelectItem>
                        <SelectItem value='template'>模板链</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-medium'>输入方向</label>
                    <Select
                      value={direction}
                      onValueChange={(value) =>
                        setDirection(value as SequenceDirection)
                      }
                      disabled={strand === 'coding'}
                    >
                      <SelectTrigger className='h-9 w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='5to3'>5′ → 3′</SelectItem>
                        <SelectItem value='3to5'>3′ → 5′</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-medium'>阅读框</label>
                    <Select
                      value={frame}
                      onValueChange={(value) => setFrame(value)}
                    >
                      <SelectTrigger className='h-9 w-full'>
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

                <Textarea
                  id='dna-sequence'
                  value={raw}
                  onChange={(event) => {
                    setRaw(event.target.value)
                    if (error) setError(null)
                  }}
                  rows={4}
                  spellCheck={false}
                  placeholder='例如：ATGGAACCTTGGTAA'
                  className={cn(
                    'min-h-32 resize-y font-mono text-sm leading-relaxed tracking-wide',
                    error &&
                      'border-destructive focus-visible:ring-destructive/30'
                  )}
                />

                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    type='button'
                    onClick={handleAnalyze}
                    disabled={loading || !raw.trim()}
                    className='gap-2'
                  >
                    <Play className='size-4' />
                    {loading ? '计算中…' : '开始演示'}
                  </Button>
                  <Select onValueChange={loadSample}>
                    <SelectTrigger className='h-9 w-[148px] gap-1.5 text-xs'>
                      <FlaskConical className='size-3.5' />
                      <SelectValue placeholder='教学示例 A / B / C' />
                    </SelectTrigger>
                    <SelectContent>
                      {TEACHING_SAMPLES.map((sample) => (
                        <SelectItem key={sample.id} value={sample.id}>
                          {sample.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type='button' variant='ghost' onClick={clearAll}>
                    清空
                  </Button>
                  <span className='text-[11px] text-muted-foreground sm:ml-auto'>
                    示例：ATGGAACCTTGGTAA → AUGGAACCUUGGUAA →
                    Met-Glu-Pro-Trp-Stop
                  </span>
                </div>

                {error ? (
                  <p className='rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive'>
                    {error}
                  </p>
                ) : null}
              </div>
            </SectionCard>

            {!transcription ? (
              <SectionCard
                title='中心法则概览'
                description='一次分析会同时生成 DNA 双螺旋、mRNA 与蛋白质三层结果。'
                action={
                  <Badge variant='outline' className='font-normal'>
                    教学视图
                  </Badge>
                }
              >
                <div className='relative overflow-hidden rounded-xl border border-border/70 bg-muted/20 p-5'>
                  <DnaMark className='pointer-events-none absolute -end-4 -bottom-6 size-28 rotate-12 text-primary/[0.05]' />
                  <div className='relative flex flex-col gap-3 sm:flex-row sm:items-center'>
                    {[
                      {
                        icon: Dna,
                        step: '01',
                        title: 'DNA 双螺旋',
                        desc: '编码链 / 模板链',
                        tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
                      },
                      {
                        icon: Waves,
                        step: '02',
                        title: 'mRNA',
                        desc: 'T→U · 5′→3′',
                        tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
                      },
                      {
                        icon: Boxes,
                        step: '03',
                        title: '蛋白质',
                        desc: '密码子 → 氨基酸',
                        tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
                      },
                    ].map((item, index) => (
                      <div key={item.step} className='contents'>
                        <div className='flex flex-1 items-center gap-3 rounded-lg border border-border/60 bg-card/80 px-3.5 py-3'>
                          <span
                            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}
                          >
                            <item.icon className='size-4' strokeWidth={1.8} />
                          </span>
                          <div className='min-w-0'>
                            <p className='text-[10px] font-medium tracking-[0.14em] text-muted-foreground'>
                              {item.step}
                            </p>
                            <p className='text-[13px] font-semibold'>
                              {item.title}
                            </p>
                            <p className='truncate text-[11px] text-muted-foreground'>
                              {item.desc}
                            </p>
                          </div>
                        </div>
                        {index < 2 ? (
                          <ArrowRight className='mx-auto size-4 shrink-0 rotate-90 text-muted-foreground/50 sm:rotate-0' />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            ) : null}

            {transcription ? (
              <SectionCard
                title='DNA 双螺旋'
                description='编码链与模板链反向平行，碱基对以虚线连接；高亮区域对应当前步骤。'
                action={
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='gap-1.5 text-xs'
                    onClick={() => setExpanded((current) => !current)}
                  >
                    {expanded ? (
                      <Minimize2 className='size-3.5' />
                    ) : (
                      <Maximize2 className='size-3.5' />
                    )}
                    {expanded ? '收拢' : '展开'}
                  </Button>
                }
              >
                <DnaHelix
                  coding={transcription.codingSequence}
                  template={transcription.templateSequence}
                  focusStart={focusStart}
                  focusEnd={focusEnd}
                  expanded={expanded}
                />
                <div className='mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground'>
                  <span className='inline-flex items-center gap-1.5'>
                    <span className='size-2.5 rounded-full bg-blue-600' />
                    编码链 5′→3′
                  </span>
                  <span className='inline-flex items-center gap-1.5'>
                    <span className='size-2.5 rounded-full bg-violet-600' />
                    模板链 3′→5′
                  </span>
                  {(['A', 'T', 'G', 'C'] as const).map((base) => (
                    <span key={base} className='inline-flex items-center gap-1'>
                      <span
                        className='size-2 rounded-sm'
                        style={{ backgroundColor: BASE_HEX[base] }}
                      />
                      {base} · {BASE_NAMES[base]}
                    </span>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {transcription ? (
              <SectionCard
                title='DNA → RNA 转录'
                description='RNA 聚合酶沿模板链 3′→5′ 移动，新合成的 RNA 按 5′→3′ 延伸。'
                action={
                  <Badge variant='outline' className='font-normal'>
                    {transcription.rnaDirection}
                  </Badge>
                }
              >
                <TranscriptionStage
                  transcription={transcription}
                  rnaCount={player.frame.rnaCount}
                  currentBase={player.frame.currentBase}
                />
              </SectionCard>
            ) : null}

            {translation && transcription ? (
              <SectionCard
                title='mRNA → 蛋白质翻译'
                description='核糖体每次读取一个密码子，tRNA 携带对应氨基酸进入，遇到终止密码子后释放多肽链。'
                action={
                  <Badge variant='outline' className='font-normal'>
                    阅读框 +{translation.frame}
                  </Badge>
                }
              >
                <TranslationStage
                  translation={translation}
                  codonCount={player.frame.codonCount}
                  currentCodon={player.frame.currentCodon}
                />
              </SectionCard>
            ) : null}

            <SectionCard
              title='演示与算法口径'
              description='动画不自行编造碱基；所有步骤都由同一次后端计算结果派生。'
              action={<Info className='size-4 text-muted-foreground' />}
            >
              <div className='grid gap-4 text-xs leading-relaxed text-muted-foreground sm:grid-cols-2'>
                <div>
                  <p className='mb-1 font-medium text-foreground'>链与方向</p>
                  编码链按 T→U 转录；模板链先按输入方向换算为编码链，再转录。RNA
                  始终按 5′→3′ 展示，模板链按 3′→5′ 被读取。
                </div>
                <div>
                  <p className='mb-1 font-medium text-foreground'>
                    密码子与终止
                  </p>
                  每 3 个 RNA 碱基为一个密码子；UAA、UAG、UGA
                  为终止密码子。末尾不足 3 个碱基不翻译，并在结果中提示。
                </div>
                <div>
                  <p className='mb-1 font-medium text-foreground'>模糊碱基</p>N
                  会保留并单独标记；含 N 的密码子翻译为
                  X（Xaa），不会被静默当作某个具体氨基酸。
                </div>
                <div>
                  <p className='mb-1 font-medium text-foreground'>教学示例</p>
                  示例 ATGGAACCTTGGTAA → AUGGAACCUUGGUAA →
                  Met-Glu-Pro-Trp-Stop，仅用于展示中心法则流程。
                </div>
              </div>
            </SectionCard>
          </div>

          <aside className='flex flex-col gap-4 xl:sticky xl:top-4'>
            {transcription ? (
              <div className='hidden xl:block'>
                <PlayerControls player={player} />
              </div>
            ) : (
              <Card className='gap-0 overflow-hidden py-0 shadow-card'>
                <div className='border-b border-border/70 px-5 py-4'>
                  <h2 className='text-sm font-semibold'>开始一次演示</h2>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    输入序列后，按真实算法生成转录与翻译结果。
                  </p>
                </div>
                <ol className='space-y-4 p-5 text-xs text-muted-foreground'>
                  {[
                    '粘贴 DNA 序列，选择编码链或模板链。',
                    '点击「开始演示」，后端计算 RNA 与蛋白质。',
                    '用播放、上一步/下一步观察每个碱基与密码子。',
                  ].map((text, index) => (
                    <li key={text} className='flex gap-3'>
                      <span className='flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-600 dark:bg-blue-950/50 dark:text-blue-300'>
                        {index + 1}
                      </span>
                      <span className='leading-relaxed'>{text}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {translation ? (
              <Card className='gap-0 overflow-hidden py-0 shadow-card'>
                <div className='border-b border-border/70 px-5 py-4'>
                  <h2 className='text-sm font-semibold'>最终蛋白质</h2>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {name.trim() || '未命名序列'} ·{' '}
                    {translation.codingSequence.length} bp ·{' '}
                    {translation.codons.length} 个密码子
                  </p>
                </div>
                <div className='space-y-4 p-5'>
                  <div>
                    <p className='text-[11px] text-muted-foreground'>
                      单字母序列
                    </p>
                    <p className='mt-1 font-mono text-lg font-semibold tracking-[0.18em] break-all text-blue-700 dark:text-blue-300'>
                      {translation.protein || '—'}
                    </p>
                  </div>
                  <div>
                    <p className='text-[11px] text-muted-foreground'>
                      三字母序列
                    </p>
                    <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>
                      {translation.threeLetters.join(' - ') || '—'}
                    </p>
                  </div>
                  <div className='grid grid-cols-2 gap-2 text-xs'>
                    <div className='rounded-lg bg-muted/40 p-2.5'>
                      <p className='text-[10px] text-muted-foreground'>起始</p>
                      <p className='mt-0.5 font-mono font-semibold'>
                        {translation.startCodon ?? '非 AUG'}
                      </p>
                    </div>
                    <div className='rounded-lg bg-muted/40 p-2.5'>
                      <p className='text-[10px] text-muted-foreground'>终止</p>
                      <p className='mt-0.5 font-mono font-semibold'>
                        {translation.stopCodon ?? '未检测到'}
                      </p>
                    </div>
                    <div className='rounded-lg bg-muted/40 p-2.5'>
                      <p className='text-[10px] text-muted-foreground'>
                        忽略碱基
                      </p>
                      <p className='mt-0.5 font-semibold tabular-nums'>
                        {translation.ignoredBases}
                      </p>
                    </div>
                    <div className='rounded-lg bg-muted/40 p-2.5'>
                      <p className='text-[10px] text-muted-foreground'>
                        含 N 密码子
                      </p>
                      <p className='mt-0.5 font-semibold tabular-nums'>
                        {translation.ambiguousCodons}
                      </p>
                    </div>
                  </div>
                  {translation.warnings.length ? (
                    <ul className='space-y-1.5 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-[11px] leading-relaxed text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300'>
                      {translation.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                  <p className='flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground'>
                    <Info className='mt-0.5 size-3 shrink-0' />
                    仅用于课程演示，不构成临床或生物学结论。当前 ORF
                    与突变分析尚未接入本页面。
                  </p>
                </div>
              </Card>
            ) : null}

            <Card className='gap-0 overflow-hidden py-0 shadow-card'>
              <div className='border-b border-border/70 px-5 py-4'>
                <h2 className='text-sm font-semibold'>碱基图例</h2>
                <p className='mt-1 text-xs text-muted-foreground'>
                  DNA 与 RNA 使用同一套碱基语义色。
                </p>
              </div>
              <div className='grid grid-cols-2 gap-3 p-5 text-xs'>
                {(['A', 'T', 'G', 'C'] as const).map((base) => (
                  <div key={base} className='flex items-center gap-2'>
                    <span
                      className='flex size-7 items-center justify-center rounded-md font-mono text-xs font-bold text-white'
                      style={{ backgroundColor: BASE_HEX[base] }}
                    >
                      {base}
                    </span>
                    <span className='text-muted-foreground'>
                      {BASE_NAMES[base]}
                    </span>
                  </div>
                ))}
                <div className='col-span-2 flex items-center gap-2 border-t border-border/60 pt-3'>
                  <span className='text-muted-foreground'>
                    A–U、T–A、C–G、G–C
                  </span>
                  <ArrowRight className='size-3.5 text-muted-foreground' />
                  <span className='text-muted-foreground'>转录配对</span>
                  <ChevronDown className='size-3.5 text-muted-foreground' />
                </div>
              </div>
            </Card>
          </aside>
        </div>
        {transcription ? <MobilePlayerBar player={player} /> : null}
      </Main>
    </>
  )
}
