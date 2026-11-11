import { Outlet } from '@tanstack/react-router'
import { Database, HardDrive, Palette, ShieldCheck } from 'lucide-react'
import { DnaMark } from '@/components/geneai/dna/dna-mark'
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
          <div className='grid min-w-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start'>
            <div className='w-full max-w-3xl rounded-2xl border border-border/70 bg-card p-5 shadow-card sm:p-6'>
              <Outlet />
            </div>

            <aside className='hidden space-y-4 xl:block'>
              <div className='relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-card'>
                <DnaMark className='pointer-events-none absolute -end-3 -bottom-4 size-24 rotate-12 text-primary/[0.06]' />
                <div className='flex items-center gap-2 text-sm font-semibold'>
                  <ShieldCheck className='size-4 text-primary' />
                  本地优先
                </div>
                <p className='mt-2 text-xs leading-relaxed text-muted-foreground'>
                  GeneAI 不要求注册账号，序列与分析记录只保存在本机 SQLite
                  中，不会上传到云端。
                </p>
                <ul className='mt-4 space-y-3 text-xs text-muted-foreground'>
                  <li className='flex items-start gap-2.5'>
                    <HardDrive className='mt-0.5 size-3.5 shrink-0 text-primary/80' />
                    <span>数据库：server/geneai.db</span>
                  </li>
                  <li className='flex items-start gap-2.5'>
                    <Database className='mt-0.5 size-3.5 shrink-0 text-primary/80' />
                    <span>报告：PDF / CSV 均由本地记录生成</span>
                  </li>
                  <li className='flex items-start gap-2.5'>
                    <ShieldCheck className='mt-0.5 size-3.5 shrink-0 text-primary/80' />
                    <span>清理浏览器缓存不会删除数据库</span>
                  </li>
                </ul>
              </div>

              <div className='rounded-2xl border border-border/70 bg-muted/30 p-5'>
                <p className='text-[10.5px] font-semibold tracking-[0.18em] text-muted-foreground uppercase'>
                  GeneAI
                </p>
                <p className='mt-2 font-mono text-sm font-semibold'>v2.0.0</p>
                <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>
                  React · FastAPI · Biopython · SQLite
                </p>
              </div>
            </aside>
          </div>
        </div>
      </Main>
    </>
  )
}
