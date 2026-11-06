import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PlayerApi, PlayerPhase } from '../use-player'

const PHASE_LABEL: Record<PlayerPhase, string> = {
  idle: '待开始',
  transcribing: '转录中',
  translating: '翻译中',
  done: '演示完成',
}

const SPEEDS = [0.5, 1, 1.5, 2]

type PlayerControlsProps = {
  player: PlayerApi
}

export function MobilePlayerBar({ player }: PlayerControlsProps) {
  const { frame, playing, speed } = player
  const progress =
    frame.total > 0 ? Math.round((frame.index / frame.total) * 100) : 0

  return (
    <div className='fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur xl:hidden'>
      <div className='mb-2 flex items-center justify-between text-[11px] text-muted-foreground'>
        <span className='font-medium text-foreground'>
          {PHASE_LABEL[frame.phase]}
        </span>
        <span className='tabular-nums'>
          {frame.index} / {frame.total} 步
        </span>
      </div>
      <div className='mb-2 h-1 overflow-hidden rounded-full bg-muted'>
        <div
          className='h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500'
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className='flex items-center justify-between gap-2'>
        <Button
          type='button'
          variant='outline'
          size='icon'
          aria-label='上一步'
          onClick={player.prev}
          disabled={frame.index === 0}
        >
          <SkipBack className='size-4' />
        </Button>
        <Button
          type='button'
          size='sm'
          className='min-w-20 gap-1.5'
          aria-label={
            playing ? '暂停' : frame.phase === 'done' ? '重新播放' : '播放'
          }
          onClick={player.toggle}
        >
          {playing ? <Pause className='size-4' /> : <Play className='size-4' />}
          {playing ? '暂停' : '播放'}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='icon'
          aria-label='下一步'
          onClick={player.next}
          disabled={frame.index >= frame.total}
        >
          <SkipForward className='size-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          aria-label='重播'
          onClick={player.replay}
        >
          <RotateCcw className='size-4' />
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-8 w-11 px-0 text-xs tabular-nums'
          aria-label='切换播放速度'
          onClick={() => {
            const index = SPEEDS.indexOf(speed)
            player.setSpeed(SPEEDS[(index + 1) % SPEEDS.length])
          }}
        >
          {speed}×
        </Button>
      </div>
    </div>
  )
}

export function PlayerControls({ player }: PlayerControlsProps) {
  const { frame, playing, speed } = player
  const progress =
    frame.total > 0 ? Math.round((frame.index / frame.total) * 100) : 0

  return (
    <div className='rounded-2xl border border-border/70 bg-card p-5 shadow-card'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-xs text-muted-foreground'>演示进度</p>
          <p className='mt-1 text-sm font-semibold'>
            {PHASE_LABEL[frame.phase]}
          </p>
        </div>
        <Badge variant='outline' className='font-normal'>
          {frame.index} / {frame.total} 步
        </Badge>
      </div>

      <div className='mt-4 h-2 overflow-hidden rounded-full bg-muted'>
        <div
          className='h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500'
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className='mt-5 flex items-center justify-center gap-2'>
        <Button
          type='button'
          variant='outline'
          size='icon'
          aria-label='上一步'
          onClick={player.prev}
          disabled={frame.index === 0}
        >
          <SkipBack className='size-4' />
        </Button>
        <Button
          type='button'
          size='icon'
          className='size-12 rounded-full shadow-lg shadow-blue-600/20'
          aria-label={
            playing ? '暂停' : frame.phase === 'done' ? '重新播放' : '播放'
          }
          onClick={player.toggle}
        >
          {playing ? (
            <Pause className='size-5' />
          ) : (
            <Play className='ml-0.5 size-5' />
          )}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='icon'
          aria-label='下一步'
          onClick={player.next}
          disabled={frame.index >= frame.total}
        >
          <SkipForward className='size-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          aria-label='重播'
          onClick={player.replay}
        >
          <RotateCcw className='size-4' />
        </Button>
      </div>

      <div className='mt-5 flex items-center justify-between'>
        <span className='text-[11px] text-muted-foreground'>播放速度</span>
        <div className='flex rounded-lg border border-border/70 p-0.5'>
          {SPEEDS.map((value) => (
            <button
              key={value}
              type='button'
              onClick={() => player.setSpeed(value)}
              className={cn(
                'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                speed === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {value}×
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
