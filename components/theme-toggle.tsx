"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

function applyTheme(t: 'light' | 'dark') {
  const root = document.documentElement
  if (t === 'light') {
    root.classList.add('theme-light')
  } else {
    root.classList.remove('theme-light')
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => 'dark')

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && (localStorage.getItem('pp-theme') as 'light' | 'dark' | null)) || null
    const initial = saved || 'dark'
    setTheme(initial)
    applyTheme(initial)
  }, [])

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    applyTheme(next)
    try { localStorage.setItem('pp-theme', next) } catch {}
  }

  return (
    <Button variant="outline" onClick={toggle} aria-label="Toggle theme">
      {theme === 'light' ? (
        // Sun icon
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0 4a.75.75 0 0 1-.75-.75v-1.5a.75.75 0 0 1 1.5 0v1.5A.75.75 0 0 1 12 22ZM12 4a.75.75 0 0 1-.75-.75v-1.5a.75.75 0 0 1 1.5 0v1.5A.75.75 0 0 1 12 4Zm10 8a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 22 12ZM4 12a.75.75 0 0 1-.75.75H1.75a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 4 12Zm14.72 7.28a.75.75 0 0 1-1.06 0l-1.06-1.06a.75.75 0 0 1 1.06-1.06l1.06 1.06c.3.3.3.77 0 1.06Zm-11.32-11.32a.75.75 0 0 1-1.06 0L4.28 6.9A.75.75 0 0 1 5.34 5.84l1.06 1.06c.3.3.3.77 0 1.06Zm11.32-1.06a.75.75 0 0 1 0 1.06L17.66 9.02a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM7.4 18.34a.75.75 0 1 1-1.06 1.06L5.28 18.34a.75.75 0 1 1 1.06-1.06l1.06 1.06Z" />
        </svg>
      ) : (
        // Moon icon
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M21.752 15.002A9 9 0 1 1 9 2.248a9.75 9.75 0 1 0 12.752 12.754Z" />
        </svg>
      )}
    </Button>
  )
}

