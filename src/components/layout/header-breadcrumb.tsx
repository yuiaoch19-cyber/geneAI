import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight, LayoutDashboard } from 'lucide-react'

const routeLabels: { prefix: string; label: string }[] = [
  { prefix: '/analysis', label: 'DNA 序列分析' },
  { prefix: '/compare', label: '序列差异比较' },
  { prefix: '/visualization', label: '数据可视化' },
  { prefix: '/history', label: '历史记录' },
  { prefix: '/settings', label: '系统设置' },
]

export function HeaderBreadcrumb() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const match = routeLabels.find(
    (route) =>
      pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)
  )

  return (
    <nav
      aria-label='面包屑'
      className='flex min-w-0 items-center gap-1 text-sm whitespace-nowrap text-muted-foreground'
    >
      <Link
        to='/'
        className='flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:text-foreground'
        aria-label='返回总览'
      >
        <LayoutDashboard className='size-4' />
        <span className='hidden sm:inline'>总览</span>
      </Link>
      {match ? (
        <>
          <ChevronRight className='size-3.5 shrink-0 text-border' />
          <span className='truncate font-medium text-foreground'>
            {match.label}
          </span>
        </>
      ) : null}
    </nav>
  )
}
