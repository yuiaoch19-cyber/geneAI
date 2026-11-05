import { Outlet } from '@tanstack/react-router'
import { Database, Palette } from 'lucide-react'
import { PageHeader } from '@/components/geneai/page-header'
import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'
import { SidebarNav } from './components/sidebar-nav'

const sidebarNavItems = [
  {
    title: '外观与主题',
    href: '/settings/appearance',
    icon: <Palette size={18} />,
  },
  {
    title: '本地工作区',
    href: '/settings/display',
    icon: <Database size={18} />,
  },
]

export function Settings() {
  return (
    <>
      <AppHeader />

      <Main>
        <PageHeader
          eyebrow='Settings'
          title='系统设置'
          description='管理外观、显示与本地工作区偏好。'
        />
        <div className='mt-6 flex flex-1 flex-col gap-4 lg:flex-row lg:gap-10'>
          <aside className='lg:w-52 lg:shrink-0'>
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className='min-w-0 flex-1'>
            <div className='w-full max-w-3xl rounded-xl border border-border/80 bg-card p-5 shadow-card sm:p-6'>
              <Outlet />
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}
