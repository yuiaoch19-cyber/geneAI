import { Link } from '@tanstack/react-router'
import { DnaMark } from '@/components/geneai/dna/dna-mark'
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
        <SidebarMenuButton
          size='lg'
          asChild
          className='gap-3 px-1.5 hover:bg-transparent data-[state=open]:bg-transparent'
        >
          <Link to='/' onClick={() => setOpenMobile(false)}>
            <span className='relative flex aspect-square size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-blue-700 text-white shadow-[0_10px_30px_-10px_rgba(56,132,255,0.9)] ring-1 ring-white/25'>
              <DnaMark className='size-6' />
              <span className='absolute inset-0 rounded-2xl bg-gradient-to-b from-white/25 to-transparent opacity-60' />
            </span>
            <span className='grid flex-1 text-start leading-tight'>
              <span className='truncate text-[15px] font-semibold tracking-tight text-sidebar-foreground'>
                GeneAI
              </span>
              <span
                className='truncate text-[10px] font-medium tracking-[0.16em] text-sidebar-foreground/50 uppercase'
                aria-label='Bioinformatics Platform'
              >
                Bioinformatics
              </span>
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
