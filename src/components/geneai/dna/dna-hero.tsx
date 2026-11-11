import { cn } from '@/lib/utils'

const BASE_COLORS = ['#2563EB', '#8B5CF6', '#F59E0B', '#10B981'] as const

const WIDTH = 760
const CENTER_Y = 210
const AMPLITUDE = 102
const PERIOD = 62

function buildWave(sign: number) {
  return Array.from({ length: 121 }, (_, index) => {
    const x = (index / 120) * WIDTH
    const y = CENTER_Y + sign * AMPLITUDE * Math.sin(x / PERIOD)
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
}

const FORWARD = buildWave(1)
const REVERSE = buildWave(-1)

const RUNGS = Array.from({ length: 25 }, (_, index) => {
  const x = 18 + index * 30
  const y1 = CENTER_Y + AMPLITUDE * Math.sin(x / PERIOD)
  const y2 = CENTER_Y - AMPLITUDE * Math.sin(x / PERIOD)
  return {
    x,
    y1,
    y2,
    color: BASE_COLORS[index % BASE_COLORS.length],
    opacity: 0.34 + Math.abs(Math.cos(x / PERIOD)) * 0.34,
  }
})

type DnaHeroProps = {
  className?: string
}

/**
 * Decorative double helix for the dashboard hero.
 * Two crossing strands, colour-coded rungs and a soft depth layer.
 */
export function DnaHero({ className }: DnaHeroProps) {
  return (
    <svg
      aria-hidden='true'
      viewBox='0 0 760 420'
      preserveAspectRatio='xMidYMid slice'
      className={cn('pointer-events-none', className)}
    >
      <defs>
        <linearGradient id='dna-hero-front' x1='0' y1='1' x2='1' y2='0'>
          <stop offset='0%' stopColor='#60A5FA' stopOpacity='0.25' />
          <stop offset='35%' stopColor='#2563EB' stopOpacity='0.95' />
          <stop offset='100%' stopColor='#38BDF8' stopOpacity='0.85' />
        </linearGradient>
        <linearGradient id='dna-hero-back' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stopColor='#93C5FD' stopOpacity='0.15' />
          <stop offset='55%' stopColor='#60A5FA' stopOpacity='0.55' />
          <stop offset='100%' stopColor='#3B82F6' stopOpacity='0.12' />
        </linearGradient>
        <radialGradient id='dna-hero-glow' cx='50%' cy='50%' r='50%'>
          <stop offset='0%' stopColor='#7DD3FC' stopOpacity='0.38' />
          <stop offset='100%' stopColor='#7DD3FC' stopOpacity='0' />
        </radialGradient>
      </defs>

      <circle cx='470' cy='190' r='230' fill='url(#dna-hero-glow)' />
      <g transform='rotate(-14 380 210)'>
        <g>
          {RUNGS.map((rung) => (
            <line
              key={rung.x}
              x1={rung.x}
              y1={rung.y1}
              x2={rung.x}
              y2={rung.y2}
              stroke={rung.color}
              strokeWidth='2'
              strokeOpacity={rung.opacity}
              strokeLinecap='round'
            />
          ))}
        </g>

        <path
          d={REVERSE}
          fill='none'
          stroke='url(#dna-hero-back)'
          strokeWidth='5'
          strokeLinecap='round'
        />
        <path
          d={FORWARD}
          fill='none'
          stroke='url(#dna-hero-front)'
          strokeWidth='7.5'
          strokeLinecap='round'
        />

        {RUNGS.map((rung) => (
          <g key={`dot-${rung.x}`} fill={rung.color}>
            <circle cx={rung.x} cy={rung.y1} r='2.3' opacity='0.75' />
            <circle cx={rung.x} cy={rung.y2} r='2.3' opacity='0.55' />
          </g>
        ))}

        {[120, 300, 480, 640].map((x, index) => {
          const y = CENTER_Y + AMPLITUDE * Math.sin(x / PERIOD)
          return (
            <g key={x}>
              <circle cx={x} cy={y} r='9' fill='#93C5FD' opacity='0.14' />
              <circle
                cx={x}
                cy={y}
                r='3.5'
                fill={BASE_COLORS[index % BASE_COLORS.length]}
                opacity='0.9'
              />
            </g>
          )
        })}
      </g>

      <g fill='none' stroke='#93C5FD' strokeOpacity='0.16' strokeWidth='1'>
        <circle cx='560' cy='340' r='44' />
        <circle cx='648' cy='250' r='22' />
        <circle cx='450' cy='58' r='24' />
      </g>
    </svg>
  )
}
