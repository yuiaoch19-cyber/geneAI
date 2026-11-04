import { Link } from '@tanstack/react-router'
import { Dna } from 'lucide-react'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

export function AppBrand() {
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size='lg' asChild className='gap-2.5'>
          <Link to='/' onClick={() => setOpenMobile(false)}>
            <span className='flex aspect-square size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm'>
              <Dna className='size-5' strokeWidth={1.9} />
            </span>
            <span className='grid flex-1 text-start leading-tight'>
              <span className='truncate text-sm font-semibold tracking-tight'>
                GeneAI
              </span>
              <span className='truncate text-[11px] text-muted-foreground'>
                DNA 序列分析平台
              </span>
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
