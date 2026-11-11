import { AlertTriangle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type ErrorStateProps = {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({
  title = '出了点问题',
  message = '数据加载失败，请稍后重试。',
  onRetry,
  retryLabel = '重新加载',
  className,
}: ErrorStateProps) {
  return (
    <div
      role='alert'
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/25 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(239,68,68,0.06),transparent_60%)] px-6 py-10 text-center',
        className
      )}
    >
      <span className='flex size-11 items-center justify-center rounded-xl bg-background text-destructive ring-1 ring-destructive/20'>
        <AlertTriangle className='size-5' strokeWidth={1.75} />
      </span>
      <div className='space-y-1'>
        <p className='text-sm font-medium text-foreground'>{title}</p>
        <p className='mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground'>
          {message}
        </p>
      </div>
      {onRetry ? (
        <Button variant='outline' size='sm' onClick={onRetry} className='mt-1'>
          <RotateCcw className='size-3.5' />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}
