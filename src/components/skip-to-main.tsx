import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function SkipToMain() {
  const [keyboardIntent, setKeyboardIntent] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') setKeyboardIntent(true)
    }
    const onPointerDown = () => setKeyboardIntent(false)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [])

  return (
    <a
      className={cn(
        'fixed inset-s-44 z-999 -translate-y-52 bg-primary px-4 py-2 text-sm font-medium whitespace-nowrap text-primary-foreground opacity-95 shadow-sm transition hover:bg-primary/90 focus-visible:ring-1 focus-visible:ring-ring',
        keyboardIntent &&
          'focus-visible:translate-y-3 focus-visible:transform'
      )}
      href='#content'
    >
      跳到主内容
    </a>
  )
}
