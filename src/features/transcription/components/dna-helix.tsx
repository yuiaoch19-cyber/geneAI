import { baseColor } from '../colors'

type DnaHelixProps = {
  coding: string
  template: string
  focusStart: number | null
  focusEnd: number | null
  expanded: boolean
}

const SAMPLE = 38

export function DnaHelix({
  coding,
  template,
  focusStart,
  focusEnd,
  expanded,
}: DnaHelixProps) {
  const visible = expanded ? 26 : 14
  const count = Math.min(coding.length, visible)
  const focus = focusStart ?? 0
  const start = Math.max(
    0,
    Math.min(focus - Math.floor(visible * 0.35), coding.length - count)
  )
  const height = expanded ? 232 : 164
  const center = height / 2
  const amplitude = expanded ? 48 : 30

  const points = Array.from({ length: count }, (_, index) => {
    const x = 46 + index * SAMPLE
    const phase = ((start + index) / 4.6) * Math.PI
    return {
      x,
      yCoding: center + Math.sin(phase) * amplitude,
      yTemplate: center - Math.sin(phase) * amplitude,
      codingBase: coding[start + index] ?? 'N',
      templateBase: template[start + index] ?? 'N',
      index: start + index,
    }
  })

  const codingPath = points
    .map(
      (point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.yCoding}`
    )
    .join(' ')
  const templatePath = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${point.x} ${point.yTemplate}`
    )
    .join(' ')

  const width = 92 + count * SAMPLE
  const highlightFrom = focusStart ?? -1
  const highlightTo = focusEnd ?? focusStart ?? -1

  return (
    <div className='w-full overflow-x-auto'>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className='mx-auto block h-auto w-full min-w-[560px]'
        role='img'
        aria-label='DNA 双螺旋示意，显示编码链与模板链的碱基配对'
      >
        <defs>
          <linearGradient id='codingStrand' x1='0' y1='0' x2='1' y2='0'>
            <stop offset='0%' stopColor='#93c5fd' />
            <stop offset='100%' stopColor='#2563eb' />
          </linearGradient>
          <linearGradient id='templateStrand' x1='0' y1='0' x2='1' y2='0'>
            <stop offset='0%' stopColor='#c4b5fd' />
            <stop offset='100%' stopColor='#7c3aed' />
          </linearGradient>
        </defs>

        {highlightFrom >= start && highlightFrom < start + count ? (
          <rect
            x={46 + (Math.max(highlightFrom, start) - start) * SAMPLE - 18}
            y={16}
            width={
              (Math.min(highlightTo, start + count - 1) -
                Math.max(highlightFrom, start) +
                1) *
              SAMPLE
            }
            height={height - 32}
            rx={14}
            fill='#2563eb'
            fillOpacity={0.06}
            stroke='#2563eb'
            strokeOpacity={0.25}
            strokeDasharray='4 4'
          />
        ) : null}

        <path
          d={templatePath}
          fill='none'
          stroke='url(#templateStrand)'
          strokeWidth={5}
          strokeLinecap='round'
          strokeOpacity={0.9}
        />
        <path
          d={codingPath}
          fill='none'
          stroke='url(#codingStrand)'
          strokeWidth={5}
          strokeLinecap='round'
        />

        {points.map((point) => (
          <g key={point.index}>
            <line
              x1={point.x}
              y1={point.yCoding}
              x2={point.x}
              y2={point.yTemplate}
              stroke='#cbd5e1'
              strokeWidth={2}
              strokeDasharray='3 4'
            />
            <circle cx={point.x} cy={point.yCoding} r={3.5} fill='#2563eb' />
            <circle cx={point.x} cy={point.yTemplate} r={3.5} fill='#7c3aed' />
            {expanded ? (
              <>
                <text
                  x={point.x}
                  y={point.yCoding - 12}
                  textAnchor='middle'
                  fontSize={13}
                  fontWeight={700}
                  fill={baseColor(point.codingBase)}
                >
                  {point.codingBase}
                </text>
                <text
                  x={point.x}
                  y={point.yTemplate + 21}
                  textAnchor='middle'
                  fontSize={13}
                  fontWeight={700}
                  fill={baseColor(point.templateBase)}
                >
                  {point.templateBase}
                </text>
              </>
            ) : null}
          </g>
        ))}

        <text x={12} y={24} fontSize={11} fill='#2563eb' fontWeight={600}>
          编码链 5′
        </text>
        <text
          x={width - 12}
          y={24}
          textAnchor='end'
          fontSize={11}
          fill='#2563eb'
          fontWeight={600}
        >
          3′
        </text>
        <text
          x={12}
          y={height - 12}
          fontSize={11}
          fill='#7c3aed'
          fontWeight={600}
        >
          模板链 3′
        </text>
        <text
          x={width - 12}
          y={height - 12}
          textAnchor='end'
          fontSize={11}
          fill='#7c3aed'
          fontWeight={600}
        >
          5′
        </text>
      </svg>
      {coding.length > visible ? (
        <p className='mt-1 text-center text-[11px] text-muted-foreground'>
          当前显示第 {start + 1}–{start + count} 位，共 {coding.length} bp
        </p>
      ) : null}
    </div>
  )
}
