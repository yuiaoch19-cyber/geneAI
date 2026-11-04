import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

type LoadingStateProps = {
  rows?: number
  className?: string
  label?: string
}

export function LoadingState({
  rows = 3,
  className,
  label = '加载中…',
}: LoadingStateProps) {
  return (
    <div
      className={cn('space-y-4', className)}
      role='status'
      aria-live='polite'
    >
      <span className='sr-only'>{label}</span>
      <div className='flex items-center gap-3'>
        <Skeleton className='size-9 rounded-lg' />
        <div className='flex-1 space-y-2'>
          <Skeleton className='h-3.5 w-1/3' />
          <Skeleton className='h-3 w-1/2' />
        </div>
      </div>
      <div className='space-y-2.5'>
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className='h-14 rounded-lg' />
        ))}
      </div>
    </div>
  )
}
