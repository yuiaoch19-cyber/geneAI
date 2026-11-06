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
      className='border-e border-sidebar-border/60'
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
