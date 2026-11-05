import { formatDistanceToNow } from 'date-fns'
import { Link } from '@tanstack/react-router'
import { zhCN } from 'date-fns/locale'
import { Bell, CheckCheck, Dna } from 'lucide-react'
import { formatPercent } from '@/lib/dna'
import { useStatsOverview } from '@/hooks/use-stats-overview'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

function relative(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return formatDistanceToNow(date, { addSuffix: true, locale: zhCN })
}

export function NotificationsMenu() {
  const { data } = useStatsOverview()
  const recent = data?.recent ?? []
  const hasUnread = recent.length > 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative size-9 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground'
          aria-label='查看最近分析通知'
        >
          <Bell className='size-4.5' />
          {hasUnread ? (
            <span className='absolute end-2 top-1.5 size-2 rounded-full bg-rose-500 ring-2 ring-background' />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' sideOffset={8} className='w-80 p-0'>
        <div className='flex items-center justify-between border-b border-border/70 px-4 py-3'>
          <div className='flex items-center gap-2 text-sm font-semibold'>
            <CheckCheck className='size-4 text-primary' />
            最近分析
          </div>
          <span className='text-[11px] text-muted-foreground'>
            {recent.length ? `${recent.length} 条动态` : '暂无动态'}
          </span>
        </div>
        {recent.length === 0 ? (
          <div className='px-4 py-8 text-center text-xs leading-relaxed text-muted-foreground'>
            保存一次序列分析后，
            <br />
            这里会显示最新的计算记录。
          </div>
        ) : (
          <ul className='max-h-72 overflow-y-auto py-1'>
            {recent.map((item) => (
              <li key={item.id}>
                <Link
                  to='/history'
                  className='flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-accent/60'
                >
                  <span className='mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                    <Dna className='size-3.5' />
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-xs font-medium'>
                      {item.name}
                    </span>
                    <span className='mt-0.5 block text-[11px] text-muted-foreground'>
                      {item.length} bp · GC {formatPercent(item.gcContent)} ·{' '}
                      {relative(item.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className='border-t border-border/70 p-2'>
          <Button asChild variant='ghost' size='sm' className='w-full text-xs'>
            <Link to='/history'>查看全部历史记录</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
