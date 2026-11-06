import { useMemo, useRef, useState } from 'react'
import { Minus, MousePointerSquareDashed, RotateCcw, ZoomIn } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MapOrf, SequenceMapResult } from '@/types/api'

const W = 1000
const H = 412
const LEFT = 74
const RIGHT = 18
const PLOT_W = W - LEFT - RIGHT

const Y = {
  ruler: 44,
  plusOrf: 68,
  minusOrf: 100,
  gcTop: 140,
  gcBottom: 236,
  enzyme: 268,
  motif: 292,
  mutation: 320,
  bottom: 344,
}

const ORF_HEIGHT = 16
const MIN_SPAN = 20

function niceStep(raw: number) {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))))
  const base = raw / pow
  const factor = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10
  return factor * pow
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

interface View {
  start: number
  end: number
}

interface SequenceMapProps {
  result: SequenceMapResult
  onOrfSelect: (orf: MapOrf) => void
  onMutationSelect: () => void
}

export function SequenceMap({
  result,
  onOrfSelect,
  onMutationSelect,
}: SequenceMapProps) {
  const length = result.sequenceLength
  const [view, setView] = useState<View>({
    start: 0,
    end: Math.min(length, 320),
  })
  const [selection, setSelection] = useState<View | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const drag = useRef<{
    mode: 'pan' | 'select'
    x: number
    view: View
    anchor: number
  } | null>(null)

  const span = view.end - view.start
  const x = (bp: number) => LEFT + ((bp - view.start) / span) * PLOT_W
  const yGc = (value: number) =>
    Y.gcBottom - (clamp(value, 0, 100) / 100) * (Y.gcBottom - Y.gcTop)

  const ticks = useMemo(() => {
    const step = niceStep(span / 8)
    const first = Math.ceil(view.start / step) * step
    const list: number[] = []
    for (let value = first; value <= view.end; value += step) {
      list.push(value)
    }
    return { step, list }
  }, [span, view.start, view.end])

  const visibleOrfs = result.orfs.filter(
    (orf) => orf.end >= view.start + 1 && orf.start <= view.end
  )
  const visibleMotifs = result.motifs.filter(
    (motif) => motif.end >= view.start + 1 && motif.start <= view.end
  )
  const visibleEnzymes = result.restrictionSites.filter(
    (site) => site.cutPosition >= view.start + 1 && site.cutPosition <= view.end
  )
  const visibleGc = useMemo(() => {
    const points = result.gc.points.filter(
      (point) => point.end > view.start && point.start < view.end
    )
    const stride = Math.max(1, Math.ceil(points.length / 420))
    return points.filter((_, index) => index % stride === 0)
  }, [result.gc.points, view.start, view.end])

  const gcPath = visibleGc
    .map((point, index) => {
      const mid = (point.start + point.end) / 2
      return `${index === 0 ? 'M' : 'L'}${x(mid).toFixed(2)},${yGc(point.gc).toFixed(2)}`
    })
    .join(' ')
  const gcArea =
    visibleGc.length < 2
      ? ''
      : `M${x(visibleGc[0].start).toFixed(2)},${Y.gcBottom} ${gcPath.replace(
          /^M/,
          'L'
        )} L${x(visibleGc[visibleGc.length - 1].end).toFixed(2)},${Y.gcBottom} Z`

  const zoomAt = (factor: number, anchorBp?: number) => {
    const nextSpan = clamp(span * factor, MIN_SPAN, length)
    const anchor = anchorBp ?? (view.start + view.end) / 2
    const ratio = (anchor - view.start) / span
    const start = clamp(
      anchor - ratio * nextSpan,
      0,
      Math.max(0, length - nextSpan)
    )
    setView({ start, end: start + nextSpan })
  }

  const shift = (direction: -1 | 1) => {
    const step = span * 0.8 * direction
    const start = clamp(view.start + step, 0, Math.max(0, length - span))
    setView({ start, end: start + span })
  }

  const bpAt = (clientX: number, rect: DOMRect) => {
    const ratio = (clientX - rect.left - (LEFT / W) * rect.width) / ((PLOT_W / W) * rect.width)
    return clamp(view.start + ratio * span, 0, length)
  }

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'touch') return
    const target = event.target as Element
    if (target.closest('[data-hit="true"]')) return
    const rect = event.currentTarget.getBoundingClientRect()
    const bp = bpAt(event.clientX, rect)
    const mode = selectMode || event.shiftKey ? 'select' : 'pan'
    drag.current = { mode, x: event.clientX, view, anchor: bp }
    if (mode === 'select') setSelection({ start: bp, end: bp })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const bp = bpAt(event.clientX, rect)
    setHover(bp)
    const current = drag.current
    if (!current) return
    if (current.mode === 'pan') {
      const deltaRatio = (event.clientX - current.x) / ((PLOT_W / W) * rect.width)
      const delta = -deltaRatio * (current.view.end - current.view.start)
      const start = clamp(
        current.view.start + delta,
        0,
        Math.max(0, length - (current.view.end - current.view.start))
      )
      setView({ start, end: start + (current.view.end - current.view.start) })
    } else {
      const anchor = current.anchor
      setSelection({
        start: Math.min(anchor, bp),
        end: Math.max(anchor, bp),
      })
    }
  }

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const current = drag.current
    if (current?.mode === 'select' && selection) {
      if (selection.end - selection.start < 2) setSelection(null)
    }
    drag.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const selectionText = selection
    ? `选中 ${Math.floor(selection.start) + 1}–${Math.ceil(selection.end)} bp（${Math.max(1, Math.round(selection.end - selection.start))} bp）`
    : null

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='mr-auto flex items-baseline gap-2 text-xs text-muted-foreground'>
          <span className='font-mono text-sm text-foreground'>
            {Math.floor(view.start) + 1}–{Math.ceil(view.end)}
          </span>
          <span>/ {length.toLocaleString('zh-CN')} bp</span>
          {selectionText ? (
            <span className='rounded-md bg-primary/10 px-2 py-0.5 text-primary'>
              {selectionText}
            </span>
          ) : null}
          {selection ? (
            <Button
              type='button'
              size='sm'
              variant='ghost'
              className='h-6 px-2 text-[11px]'
              onClick={() => setSelection(null)}
            >
              清除选区
            </Button>
          ) : null}
        </div>
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={() => shift(-1)}
          disabled={view.start <= 0}
        >
          上一段
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={() => shift(1)}
          disabled={view.end >= length}
        >
          下一段
        </Button>
        <Button
          type='button'
          size='icon'
          variant='outline'
          aria-label='缩小'
          onClick={() => zoomAt(1.25)}
        >
          <Minus className='size-4' />
        </Button>
        <Button
          type='button'
          size='icon'
          variant='outline'
          aria-label='放大'
          onClick={() => zoomAt(0.8)}
        >
          <ZoomIn className='size-4' />
        </Button>
        <Button
          type='button'
          size='sm'
          variant={selectMode ? 'default' : 'outline'}
          onClick={() => setSelectMode((value) => !value)}
        >
          <MousePointerSquareDashed className='size-4' />
          框选
        </Button>
        <Button
          type='button'
          size='icon'
          variant='ghost'
          aria-label='重置视图'
          onClick={() => setView({ start: 0, end: Math.min(length, 320) })}
        >
          <RotateCcw className='size-4' />
        </Button>
      </div>

      <div className='overflow-x-auto rounded-xl border bg-muted/20'>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role='img'
          aria-label='DNA 序列地图'
          className='h-auto w-full min-w-[720px] select-none'
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            setHover(null)
            drag.current = null
          }}
          onWheel={(event) => {
            event.preventDefault()
            const rect = event.currentTarget.getBoundingClientRect()
            zoomAt(event.deltaY > 0 ? 1.2 : 0.83, bpAt(event.clientX, rect))
          }}
        >
          <defs>
            <linearGradient id='map-gc-fill' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor='#10b981' stopOpacity='0.28' />
              <stop offset='100%' stopColor='#10b981' stopOpacity='0.02' />
            </linearGradient>
          </defs>

          <g fontSize='12' fill='currentColor' className='text-muted-foreground'>
            <text x='8' y={Y.plusOrf + 12}>
              正链 ORF
            </text>
            <text x='8' y={Y.minusOrf + 12}>
              负链 ORF
            </text>
            <text x='8' y={Y.gcTop + 12}>
              GC 含量
            </text>
            <text x='8' y={Y.enzyme + 4}>
              酶切位点
            </text>
            <text x='8' y={Y.motif + 9}>
              Motif
            </text>
            {result.mutation ? (
              <text x='8' y={Y.mutation + 4}>
                突变
              </text>
            ) : null}
          </g>

          <line
            x1={LEFT}
            y1={Y.ruler}
            x2={W - RIGHT}
            y2={Y.ruler}
            stroke='currentColor'
            strokeOpacity='0.25'
          />
          {ticks.list
            .filter((tick) => tick < length)
            .map((tick) => (
            <g key={tick}>
              <line
                x1={x(tick)}
                y1={Y.ruler - 5}
                x2={x(tick)}
                y2={Y.ruler + 4}
                stroke='currentColor'
                strokeOpacity='0.4'
              />
              <text
                x={x(tick)}
                y={Y.ruler - 10}
                fontSize='11.5'
                textAnchor='middle'
                className='fill-muted-foreground'
              >
                {(tick + 1).toLocaleString('zh-CN')}
              </text>
            </g>
          ))}

          <line
            x1={LEFT}
            y1={Y.gcTop}
            x2={LEFT}
            y2={Y.gcBottom}
            stroke='currentColor'
            strokeOpacity='0.2'
          />
          {[0, 50, 100].map((value) => (
            <g key={value}>
              <line
                x1={LEFT}
                y1={yGc(value)}
                x2={W - RIGHT}
                y2={yGc(value)}
                stroke='currentColor'
                strokeOpacity='0.14'
                strokeDasharray='3 4'
              />
              <text
                x={LEFT + 4}
                y={yGc(value) + 4}
                fontSize='11'
                textAnchor='start'
                className='fill-muted-foreground'
              >
                {value}%
              </text>
            </g>
          ))}
          {gcArea ? <path d={gcArea} fill='url(#map-gc-fill)' /> : null}
          {gcPath ? (
            <path
              d={gcPath}
              fill='none'
              stroke='#10b981'
              strokeWidth='1.6'
              strokeLinejoin='round'
            />
          ) : (
            <text
              x={LEFT + PLOT_W / 2}
              y={(Y.gcTop + Y.gcBottom) / 2}
              fontSize='12'
              textAnchor='middle'
              className='fill-muted-foreground'
            >
              当前视图没有完整 GC 窗口
            </text>
          )}

          {visibleOrfs.map((orf) => {
            const start = Math.max(orf.start - 1, view.start)
            const end = Math.min(orf.end, view.end)
            const width = Math.max(2, x(end) - x(start))
            const plus = orf.strand === '+'
            return (
              <g
                key={`${orf.strand}-${orf.start}-${orf.frame}-${orf.end}`}
                data-hit='true'
                role='button'
                tabIndex={0}
                className='cursor-pointer'
                onClick={() => onOrfSelect(orf)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onOrfSelect(orf)
                  }
                }}
              >
                <title>
                  {orf.strand} 链 · 框 {orf.frame} · {orf.start}–{orf.end} bp ·{' '}
                  {orf.lengthAa} aa
                </title>
                <rect
                  x={x(start)}
                  y={plus ? Y.plusOrf : Y.minusOrf}
                  width={width}
                  height={ORF_HEIGHT}
                  rx={3}
                  fill={plus ? '#2563eb' : '#8b5cf6'}
                  fillOpacity='0.78'
                />
                <circle
                  cx={x(Math.max(orf.start - 1, view.start))}
                  cy={(plus ? Y.plusOrf : Y.minusOrf) + ORF_HEIGHT / 2}
                  r='3'
                  fill='#10b981'
                  stroke='#fff'
                  strokeWidth='1'
                />
                <circle
                  cx={x(Math.min(orf.end - 1, view.end - 1))}
                  cy={(plus ? Y.plusOrf : Y.minusOrf) + ORF_HEIGHT / 2}
                  r='3'
                  fill='#ef4444'
                  stroke='#fff'
                  strokeWidth='1'
                />
                {width > 54 ? (
                  <text
                    x={x(start) + 5}
                    y={(plus ? Y.plusOrf : Y.minusOrf) + 12}
                    fontSize='10.5'
                    fill='#fff'
                    pointerEvents='none'
                  >
                    {orf.start}–{orf.end}
                  </text>
                ) : null}
              </g>
            )
          })}

          {visibleEnzymes.map((site, index) => (
            <g key={`${site.enzyme}-${site.cutPosition}-${index}`} data-hit='true'>
              <title>
                {site.enzyme} · {site.cutPosition} bp · {site.recognitionSite}
              </title>
              <line
                x1={x(site.cutPosition - 1)}
                y1={Y.enzyme - 12}
                x2={x(site.cutPosition - 1)}
                y2={Y.enzyme + 6}
                stroke='#0ea5e9'
                strokeWidth='1.4'
              />
              {span < 260 ? (
                <text
                  x={x(site.cutPosition - 1)}
                  y={Y.enzyme - 16}
                  fontSize='10'
                  textAnchor='middle'
                  className='fill-sky-600 dark:fill-sky-400'
                >
                  {site.enzyme}
                </text>
              ) : null}
            </g>
          ))}

          {visibleMotifs.map((motif, index) => {
            const start = Math.max(motif.start - 1, view.start)
            const end = Math.min(motif.end, view.end)
            return (
              <rect
                key={`${motif.pattern}-${motif.start}-${motif.strand}-${index}`}
                data-hit='true'
                x={x(start)}
                y={Y.motif}
                width={Math.max(2, x(end) - x(start))}
                height={12}
                rx={2}
                fill={motif.strand === '+' ? '#6366f1' : '#14b8a6'}
                fillOpacity='0.55'
              >
                <title>
                  {motif.pattern} · {motif.start}–{motif.end} bp · {motif.strand} 链
                </title>
              </rect>
            )
          })}

          {result.mutation ? (
            <g
              data-hit='true'
              role='button'
              tabIndex={0}
              className='cursor-pointer'
              onClick={onMutationSelect}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onMutationSelect()
                }
              }}
            >
              <title>
                {result.mutation.label} · 第 {result.mutation.position} 位
              </title>
              <rect
                x={x(result.mutation.position - 1) - 8}
                y={Y.ruler}
                width={16}
                height={Y.bottom - Y.ruler}
                fill='transparent'
              />
              <line
                x1={x(result.mutation.position - 1)}
                y1={Y.ruler}
                x2={x(result.mutation.position - 1)}
                y2={Y.bottom}
                stroke='#f43f5e'
                strokeWidth='1.4'
                strokeDasharray='4 4'
              />
              <circle
                cx={x(result.mutation.position - 1)}
                cy={Y.mutation}
                r='5'
                fill='#f43f5e'
                stroke='#fff'
                strokeWidth='1.5'
              />
              <text
                x={x(result.mutation.position - 1)}
                y={Y.mutation - 10}
                fontSize='10.5'
                textAnchor={x(result.mutation.position - 1) < 120 ? 'start' : 'middle'}
                className='fill-rose-600 dark:fill-rose-400'
                pointerEvents='none'
              >
                {result.mutation.label}
              </text>
            </g>
          ) : null}

          {selection ? (
            <rect
              x={x(Math.max(selection.start, view.start))}
              y={50}
              width={Math.max(
                1,
                x(Math.min(selection.end, view.end)) -
                  x(Math.max(selection.start, view.start))
              )}
              height={Y.bottom - 50}
              fill='#2563eb'
              fillOpacity='0.08'
              stroke='#2563eb'
              strokeDasharray='4 4'
              pointerEvents='none'
            />
          ) : null}

          {hover !== null ? (
            <g pointerEvents='none'>
              <line
                x1={x(hover)}
                y1={Y.ruler}
                x2={x(hover)}
                y2={Y.bottom}
                stroke='currentColor'
                strokeOpacity='0.5'
                strokeDasharray='2 3'
              />
              <rect
                x={LEFT + PLOT_W - 96}
                y={8}
                width='92'
                height='20'
                rx='5'
                className='fill-foreground'
                fillOpacity='0.85'
              />
              <text
                x={LEFT + PLOT_W - 50}
                y={22}
                fontSize='11'
                textAnchor='middle'
                fill='#fff'
              >
                位置 {Math.round(hover) + 1} bp
              </text>
            </g>
          ) : null}
        </svg>
      </div>

      <p className='text-[11px] text-muted-foreground sm:hidden'>
        地图可左右滑动；点击 ORF 或突变标记查看详情。
      </p>

      <div className='flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground'>
        <LegendSwatch color='#2563eb' label='正链 ORF' />
        <LegendSwatch color='#8b5cf6' label='负链 ORF' />
        <LegendSwatch color='#10b981' label='起始密码子' />
        <LegendSwatch color='#ef4444' label='终止密码子' />
        <LegendSwatch color='#10b981' label='GC 曲线' />
        <LegendSwatch color='#0ea5e9' label='限制酶位点' />
        <LegendSwatch color='#6366f1' label='Motif（正链）' />
        <LegendSwatch color='#14b8a6' label='Motif（负链）' />
        <LegendSwatch color='#f43f5e' label='突变位点' />
        <span className='inline-flex items-center gap-1.5'>
          <span className='h-2 w-3 rounded-sm border border-primary/50 bg-primary/10' />
          框选区间
        </span>
        <span className='ml-auto'>
          滚轮缩放 · 拖动平移 · Shift 拖动框选
        </span>
      </div>
    </div>
  )
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className='inline-flex items-center gap-1.5'>
      <span
        className={cn('size-2.5 rounded-sm')}
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}
