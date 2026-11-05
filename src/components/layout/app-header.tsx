import { SearchIcon } from 'lucide-react'
import { useSearch } from '@/context/search-provider'
import { Button } from '@/components/ui/button'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Header } from './header'
import { NotificationsMenu } from './notifications-menu'

function MobileSearch() {
  const { setOpen } = useSearch()

  return (
    <Button
      variant='ghost'
      size='icon'
      className='size-9 rounded-full text-muted-foreground md:hidden'
      aria-label='搜索页面'
      onClick={() => setOpen(true)}
    >
      <SearchIcon className='size-4.5' />
    </Button>
  )
}

export function AppHeader() {
  return (
    <Header className='border-b border-border/60 bg-card/80 backdrop-blur-xl'>
      <div className='hidden w-full justify-center md:flex'>
        <Search
          placeholder='搜索功能或页面…（Ctrl + K）'
          className='h-10 w-full max-w-xl rounded-xl border-border/70 bg-muted/35 px-3 text-[13px] shadow-none hover:bg-muted/60'
        />
      </div>
      <div className='ms-auto flex items-center gap-1.5'>
        <MobileSearch />
        <NotificationsMenu />
        <ThemeSwitch />
        <ProfileDropdown />
      </div>
    </Header>
  )
}
