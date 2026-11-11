import { cn } from '@/lib/utils'

type DnaMarkProps = {
  className?: string
}

/**
 * Compact, self-contained helix mark used by the brand and small avatars.
 * Two crossing backbones with four rungs stay legible at 20–40px.
 */
export function DnaMark({ className }: DnaMarkProps) {
  return (
    <svg
      aria-hidden='true'
      viewBox='0 0 32 32'
      fill='none'
      className={cn('size-5', className)}
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path
        d='M11 3.5c0 5.5 10 6.5 10 12.5s-10 7-10 12.5'
        stroke='currentColor'
        strokeWidth='1.9'
        opacity='0.95'
      />
      <path
        d='M21 3.5c0 5.5-10 6.5-10 12.5s10 7 10 12.5'
        stroke='currentColor'
        strokeWidth='1.5'
        opacity='0.6'
      />
      <path
        d='M10.6 8.4h10.8M8.8 13h14.4M8.8 19h14.4M10.6 23.6h10.8'
        stroke='currentColor'
        strokeWidth='1.35'
        opacity='0.55'
      />
      <circle cx='11' cy='3.5' r='1.35' fill='currentColor' stroke='none' />
      <circle cx='21' cy='28.5' r='1.35' fill='currentColor' stroke='none' />
    </svg>
  )
}
