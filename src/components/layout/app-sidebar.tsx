import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { AppBrand } from './app-brand'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { SidebarPromo } from './sidebar-promo'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  return (
    <Sidebar
      collapsible={collapsible}
      variant={variant}
      className='border-e border-white/[0.06] bg-[linear-gradient(180deg,#081120_0%,#0b1a30_52%,#0a1526_100%)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)]'
    >
      <SidebarHeader className='px-3 pt-4 pb-2'>
        <AppBrand />
      </SidebarHeader>
      <SidebarContent className='px-1'>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter className='p-0 pb-3'>
        <SidebarPromo />
        <p className='px-4 text-[10px] text-sidebar-foreground/35'>
          GeneAI v2.0 · 本地运行
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
