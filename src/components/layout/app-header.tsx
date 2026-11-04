import { SearchIcon } from 'lucide-react'
import { useSearch } from '@/context/search-provider'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Header } from './header'
import { HeaderBreadcrumb } from './header-breadcrumb'

function MobileSearch() {
  const { setOpen } = useSearch()

  return (
    <Button
      variant='ghost'
      size='icon'
      className='md:hidden'
      aria-label='搜索页面'
      onClick={() => setOpen(true)}
    >
      <SearchIcon className='size-4' />
    </Button>
  )
}

export function AppHeader() {
  return (
    <Header>
      <HeaderBreadcrumb />
      <div className='ms-auto flex items-center gap-1 sm:gap-1.5'>
        <div className='hidden md:block'>
          <Search placeholder='搜索页面…' />
        </div>
        <MobileSearch />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </div>
    </Header>
  )
}
