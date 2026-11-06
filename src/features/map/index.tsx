import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dna, FlaskConical, Map as MapIcon, TriangleAlert } from 'lucide-react'

import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/geneai/page-header'
import { EmptyState } from '@/components/geneai/empty-state'
import { ErrorState } from '@/components/geneai/error-state'
import { LoadingState } from '@/components/geneai/loading-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import { buildSequenceMap } from '@/lib/api/geneai'
import { cn } from '@/lib/utils'
import type { MapOrf, MutationType, SequenceMapInput } from '@/types/api'

import { SequenceMap } from './components/sequence-map'

const DEMO_SEQUENCE =
  'ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAG' +
  'GAATTCTATAAAGCTT' +
  'CTGCCCAGGGCCTCACCACCAACTTCATCCACGTTCACCTTGCCCCACAGGGCAGTAACGGCAGACTTCTCCTCAGGAGTCAGATGCACCAT'

const ENZYMES = ['EcoRI', 'BamHI', 'HindIII', 'NotI', 'XhoI', 'SalI']

const DEFAULT_PARAMS: SequenceMapInput = {
  sequence: DEMO_SEQUENCE,
  window: 50,
  step: 10,
  minOrfAa: 0,
  enzymes: ['EcoRI', 'BamHI', 'HindIII', 'NotI'],
  motifs: ['TATA', 'GCGC'],
}

export function SequenceMapPage() {
  const [name, setName] = useState('HBB 地图示例')
  const [sequence, setSequence] = useState(DEMO_SEQUENCE)
  const [windowText, setWindowText] = useState('50')
  const [stepText, setStepText] = useState('10')
  const [minOrfText, setMinOrfText] = useState('0')
  const [enzymes, setEnzymes] = useState<string[]>(DEFAULT_PARAMS.enzymes ?? [])
  const [motifText, setMotifText] = useState('TATA, GCGC')
  const [withMutation, setWithMutation] = useState(false)
  const [mutationType, setMutationType] = useState<MutationType>('substitution')
  const [positionText, setPositionText] = useState('4')
  const [altText, setAltText] = useState('A')
  const [error, setError] = useState<string | null>(null)

  const [applied, setApplied] = useState<SequenceMapInput>(DEFAULT_PARAMS)
  const [selectedOrf, setSelectedOrf] = useState<MapOrf | null>(null)
  const [mutationOpen, setMutationOpen] = useState(false)

  const mapQuery = useQuery({
    queryKey: ['sequence-map', applied],
    queryFn: () => buildSequenceMap(applied),
    retry: false,
    staleTime: 60_000,
  })

  const result = mapQuery.data

  const buildParams = (): SequenceMapInput | null => {
    const window = Number(windowText)
    const step = Number(stepText)
    const minOrfAa = Number(minOrfText)
    if (!Number.isInteger(window) || window < 1) {
      setError('窗口大小必须是大于 0 的整数。')
      return null
    }
    if (!Number.isInteger(step) || step < 1) {
      setError('步长必须是大于 0 的整数。')
      return null
    }
    if (!Number.isInteger(minOrfAa) || minOrfAa < 0) {
      setError('ORF 最小氨基酸数必须是非负整数。')
      return null
    }
    if (!sequence.trim()) {
      setError('请输入 DNA 序列。')
      return null
    }
    const motifs = motifText
      .split(/[,，\s]+/)
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean)
    let mutation: SequenceMapInput['mutation'] = null
    if (withMutation) {
      const position = Number(positionText)
      if (!Number.isInteger(position) || position < 0) {
        setError('突变位置必须是非负整数。')
        return null
      }
      mutation = {
        mutationType,
        position,
        alt: altText.trim().toUpperCase(),
        frame: 1,
      }
    }
    setError(null)
    return {
      sequence: sequence.trim(),
      window,
      step,
      minOrfAa,
      enzymes,
      motifs,
      mutation,
    }
  }

  const handleRun = () => {
    const next = buildParams()
    if (!next) return
    if (JSON.stringify(next) === JSON.stringify(applied)) {
      void mapQuery.refetch()
    } else {
      setApplied(next)
    }
  }

  const handleDemo = () => {
    setName('HBB 地图示例')
    setSequence(DEMO_SEQUENCE)
    setWindowText('50')
    setStepText('10')
    setMinOrfText('0')
    setEnzymes(DEFAULT_PARAMS.enzymes ?? [])
    setMotifText('TATA, GCGC')
    setWithMutation(false)
    setError(null)
    setApplied(DEFAULT_PARAMS)
  }

  const toggleEnzyme = (enzyme: string, checked: boolean) => {
    setEnzymes((current) =>
      checked ? [...current, enzyme] : current.filter((item) => item !== enzyme)
    )
  }

  return (
    <>
      <AppHeader />
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <PageHeader
          eyebrow='SEQUENCE MAP'
          title='DNA 序列地图'
          description='在同一坐标轴上查看 ORF、GC 含量、限制酶切位点、motif 与突变位点。所有图层来自后端真实分析，反向链坐标已换算为正链坐标。'
          actions={
            <Badge variant='outline' className='gap-1.5'>
              <MapIcon className='size-3.5' />
              1-based 坐标
            </Badge>
          }
        />

        <div className='grid gap-4 xl:grid-cols-12'>
          <div className='min-w-0 space-y-4 xl:col-span-4'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <Dna className='size-4 text-primary' />
                  序列与参数
                </CardTitle>
                <CardDescription>
                  支持 A/T/G/C/N；小写与空白自动清理，单条序列最长 100,000 bp。
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-1.5'>
                  <Label htmlFor='map-name'>序列名称</Label>
                  <Input
                    id='map-name'
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder='例如：HBB 地图示例'
                  />
                </div>
                <div className='space-y-1.5'>
                  <div className='flex items-center justify-between'>
                    <Label htmlFor='map-sequence'>DNA 序列</Label>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-7 px-2 text-xs'
                      onClick={handleDemo}
                    >
                      <FlaskConical className='size-3.5' />
                      载入示例
                    </Button>
                  </div>
                  <Textarea
                    id='map-sequence'
                    value={sequence}
                    onChange={(event) => setSequence(event.target.value)}
                    className='min-h-32 min-w-0 font-mono text-xs leading-6 break-all'
                    placeholder='粘贴 DNA 序列…'
                  />
                  <p className='text-[11px] text-muted-foreground'>
                    当前{' '}
                    {sequence.replace(/[^A-Za-z]/g, '').length.toLocaleString('zh-CN')}{' '}
                    个字符
                  </p>
                </div>

                <div className='grid grid-cols-3 gap-2'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='map-window' className='text-xs'>
                      窗口 (bp)
                    </Label>
                    <Input
                      id='map-window'
                      inputMode='numeric'
                      value={windowText}
                      onChange={(event) => setWindowText(event.target.value)}
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='map-step' className='text-xs'>
                      步长 (bp)
                    </Label>
                    <Input
                      id='map-step'
                      inputMode='numeric'
                      value={stepText}
                      onChange={(event) => setStepText(event.target.value)}
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='map-min-orf' className='text-xs'>
                      最小 aa
                    </Label>
                    <Input
                      id='map-min-orf'
                      inputMode='numeric'
                      value={minOrfText}
                      onChange={(event) => setMinOrfText(event.target.value)}
                    />
                  </div>
                </div>

                <div className='space-y-1.5'>
                  <Label>限制酶</Label>
                  <div className='grid grid-cols-2 gap-x-3 gap-y-2'>
                    {ENZYMES.map((enzyme) => (
                      <label
                        key={enzyme}
                        className='flex items-center gap-2 text-xs text-muted-foreground'
                      >
                        <Checkbox
                          checked={enzymes.includes(enzyme)}
                          onCheckedChange={(checked) =>
                            toggleEnzyme(enzyme, checked === true)
                          }
                        />
                        {enzyme}
                      </label>
                    ))}
                  </div>
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='map-motifs'>Motif（逗号分隔，支持 IUPAC）</Label>
                  <Input
                    id='map-motifs'
                    value={motifText}
                    onChange={(event) => setMotifText(event.target.value)}
                    placeholder='TATA, GCGC'
                  />
                </div>

                <div className='space-y-3 rounded-lg border bg-muted/30 p-3'>
                  <label className='flex items-center gap-2 text-sm font-medium'>
                    <Checkbox
                      checked={withMutation}
                      onCheckedChange={(checked) =>
                        setWithMutation(checked === true)
                      }
                    />
                    叠加一个突变位点
                  </label>
                  {withMutation ? (
                    <div className='grid grid-cols-2 gap-2'>
                      <div className='col-span-2 space-y-1.5'>
                        <Label className='text-xs'>突变类型</Label>
                        <Select
                          value={mutationType}
                          onValueChange={(value) =>
                            setMutationType(value as MutationType)
                          }
                        >
                          <SelectTrigger className='h-9'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='substitution'>替换</SelectItem>
                            <SelectItem value='insertion'>插入</SelectItem>
                            <SelectItem value='deletion'>缺失</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className='space-y-1.5'>
                        <Label htmlFor='map-position' className='text-xs'>
                          位置
                        </Label>
                        <Input
                          id='map-position'
                          inputMode='numeric'
                          value={positionText}
                          onChange={(event) => setPositionText(event.target.value)}
                        />
                      </div>
                      <div className='space-y-1.5'>
                        <Label htmlFor='map-alt' className='text-xs'>
                          变异碱基
                        </Label>
                        <Input
                          id='map-alt'
                          value={altText}
                          onChange={(event) => setAltText(event.target.value)}
                          className='font-mono'
                        />
                      </div>
                      <p className='col-span-2 text-[11px] text-muted-foreground'>
                        替换/缺失为 1-based 起始位置；插入表示「第 N 位之后」，0 表示序列开头。
                      </p>
                    </div>
                  ) : null}
                </div>

                {error ? (
                  <p className='flex items-center gap-1.5 text-xs text-destructive'>
                    <TriangleAlert className='size-3.5' />
                    {error}
                  </p>
                ) : null}

                <Button
                  className='w-full'
                  onClick={handleRun}
                  disabled={mapQuery.isFetching}
                >
                  <MapIcon className='size-4' />
                  {mapQuery.isFetching ? '生成中…' : '生成序列地图'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className='min-w-0 space-y-4 xl:col-span-8'>
            <Card>
              <CardHeader className='flex flex-row items-start justify-between gap-3'>
                <div>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <MapIcon className='size-4 text-primary' />
                    {name || '序列地图'}
                  </CardTitle>
                  <CardDescription>
                    {result
                      ? `${result.sequenceLength.toLocaleString('zh-CN')} bp · ${result.orfTotal} 个潜在 ORF · GC ${result.gc.window}/${result.gc.step} bp`
                      : '等待生成地图'}
                  </CardDescription>
                </div>
                <div className='flex flex-wrap justify-end gap-1.5'>
                  <Badge variant='outline'>正链 +</Badge>
                  <Badge variant='outline'>负链 −</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {mapQuery.isPending ? (
                  <LoadingState rows={4} label='正在计算序列地图…' />
                ) : mapQuery.isError ? (
                  <ErrorState
                    title='地图生成失败'
                    message={
                      mapQuery.error instanceof Error
                        ? mapQuery.error.message
                        : '请检查序列与参数。'
                    }
                    onRetry={() => void mapQuery.refetch()}
                  />
                ) : result ? (
                  <SequenceMap
                    key={`${result.sequenceLength}-${result.gc.window}-${result.gc.step}-${result.mutation?.position ?? 0}-${result.mutation?.alt ?? ''}`}
                    result={result}
                    onOrfSelect={setSelectedOrf}
                    onMutationSelect={() => {
                      if (result.mutation) setMutationOpen(true)
                    }}
                  />
                ) : (
                  <EmptyState
                    icon={MapIcon}
                    title='还没有地图数据'
                    description='输入 DNA 序列并点击「生成序列地图」。'
                    action={
                      <Button size='sm' onClick={handleRun}>
                        生成序列地图
                      </Button>
                    }
                  />
                )}
              </CardContent>
            </Card>

            {result ? (
              <div className='grid gap-4 lg:grid-cols-2'>
                <Card>
                  <CardHeader className='pb-3'>
                    <CardTitle className='text-sm'>
                      潜在 ORF
                      <Badge variant='secondary' className='ml-2'>
                        {result.orfTotal}
                      </Badge>
                    </CardTitle>
                    <CardDescription>点击条目查看完整信息</CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-1'>
                    {result.orfs.slice(0, 8).map((orf) => (
                      <button
                        key={`${orf.strand}-${orf.start}-${orf.frame}-${orf.end}`}
                        type='button'
                        onClick={() => setSelectedOrf(orf)}
                        className='flex w-full items-center justify-between gap-2 rounded-md border-b border-border/50 px-1 py-1.5 text-left text-xs last:border-0 hover:bg-muted/60'
                      >
                        <span className='flex items-center gap-2'>
                          <span
                            className={cn(
                              'rounded px-1 py-0.5 text-[10px] font-medium',
                              orf.strand === '+'
                                ? 'bg-chart-1/15 text-chart-1'
                                : 'bg-chart-2/15 text-chart-2'
                            )}
                          >
                            {orf.strand} 链 · 框 {orf.frame}
                          </span>
                          <span className='font-mono text-muted-foreground'>
                            {orf.start}–{orf.end}
                          </span>
                        </span>
                        <span className='text-muted-foreground'>
                          {orf.lengthAa} aa
                        </span>
                      </button>
                    ))}
                    {result.orfs.length === 0 ? (
                      <p className='py-4 text-center text-xs text-muted-foreground'>
                        当前参数下没有找到 ATG 起止的 ORF。
                      </p>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className='pb-3'>
                    <CardTitle className='text-sm'>图例与口径</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-2 text-[11px] leading-5 text-muted-foreground'>
                    <p>
                      坐标：1-based 闭区间；GC 曲线横轴为窗口中心，纵轴 0–100%。
                    </p>
                    <p>
                      当前视图显示完整窗口 {result.gc.points.length} 个；
                      {result.gc.strategy}
                    </p>
                    {result.warnings.length > 0 ? (
                      <ul className='list-disc space-y-1 pl-4'>
                        {result.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className='text-emerald-600 dark:text-emerald-400'>
                        未发现数据缺失或截断。
                      </p>
                    )}
                    <p className='border-t pt-2 text-[10.5px]'>
                      {result.coordinateRule}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </div>

        <Card className='mt-4'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm'>图层与坐标</CardTitle>
            <CardDescription>
              所有图层均来自同一次后端计算结果，坐标统一为 1-based。
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3 text-[11px] leading-5 text-muted-foreground sm:grid-cols-2 xl:grid-cols-4'>
            <p>
              <span className='font-medium text-foreground'>ORF</span>
              ：仅 ATG 起始、同框终止密码子结束；标注为「潜在 ORF」，不等同已验证基因。
            </p>
            <p>
              <span className='font-medium text-foreground'>GC</span>
              ：完整窗口 (G + C) / (A + T + G + C)，N 不计入分母，末尾不足一个窗口的碱基忽略。
            </p>
            <p>
              <span className='font-medium text-foreground'>限制酶</span>
              ：识别位点按 Biopython 切割位点记录，坐标为 1-based 正链。
            </p>
            <p>
              <span className='font-medium text-foreground'>Motif</span>
              ：同时搜索正链与反向互补链，负链坐标已换算为正链坐标。
            </p>
          </CardContent>
        </Card>
      </Main>

      <Dialog
        open={!!selectedOrf}
        onOpenChange={(open) => !open && setSelectedOrf(null)}
      >
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {selectedOrf?.strand === '+' ? '正链' : '负链'}潜在 ORF · 框{' '}
              {selectedOrf?.frame}
            </DialogTitle>
            <DialogDescription>
              {selectedOrf
                ? `${selectedOrf.start}–${selectedOrf.end} bp（1-based）· ${selectedOrf.lengthNt} bp · ${selectedOrf.lengthAa} aa`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedOrf ? (
            <div className='space-y-4 text-sm'>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                <Metric label='起始' value={selectedOrf.startCodon} />
                <Metric label='终止' value={selectedOrf.stopCodon ?? '—'} />
                <Metric
                  label='完整'
                  value={selectedOrf.isComplete ? '是' : '否'}
                />
                <Metric
                  label='性质'
                  value={selectedOrf.isPotential ? '潜在' : '已验证'}
                />
              </div>
              <div>
                <p className='mb-1 text-xs font-medium text-muted-foreground'>
                  蛋白质序列（单字母）
                </p>
                <pre className='max-h-52 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs leading-5'>
                  {selectedOrf.protein || '—'}
                </pre>
              </div>
              <p className='text-[11px] text-muted-foreground'>
                ORF 仅基于起始/终止密码子预测，不代表真实基因或功能。
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={mutationOpen} onOpenChange={setMutationOpen}>
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>突变位点 · {result?.mutation?.label}</DialogTitle>
            <DialogDescription>
              第 {result?.mutation?.position} 位 · {result?.mutation?.ref || '—'} →{' '}
              {result?.mutation?.alt || '—'}
            </DialogDescription>
          </DialogHeader>
          {result?.mutation ? (
            <div className='space-y-3 text-sm'>
              <div className='grid grid-cols-2 gap-3'>
                <Metric label='后果' value={result.mutation.label} />
                <Metric
                  label='蛋白质长度'
                  value={`${result.mutation.originalProtein.replace(/\*$/, '').length} → ${result.mutation.mutatedProtein.replace(/\*$/, '').length} aa`}
                />
              </div>
              <div>
                <p className='mb-1 text-xs font-medium text-muted-foreground'>
                  原始蛋白质
                </p>
                <pre className='overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs'>
                  {result.mutation.originalProtein}
                </pre>
              </div>
              <div>
                <p className='mb-1 text-xs font-medium text-muted-foreground'>
                  突变后蛋白质
                </p>
                <pre className='overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs'>
                  {result.mutation.mutatedProtein}
                </pre>
              </div>
              <p className='rounded-md bg-amber-500/10 p-2 text-[11px] leading-5 text-amber-700 dark:text-amber-300'>
                {result.mutation.note}
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg border bg-muted/30 px-3 py-2'>
      <p className='text-[10px] uppercase tracking-wide text-muted-foreground'>
        {label}
      </p>
      <p className='mt-0.5 truncate font-mono text-sm font-medium'>{value}</p>
    </div>
  )
}
