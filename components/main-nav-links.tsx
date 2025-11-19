"use client"
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function MainNavLinks() {
  const [readOnlyMode, setReadOnlyMode] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/projects?scope=1', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data)) {
          setReadOnlyMode(false)
        } else {
          setReadOnlyMode(!data?.scope?.hasEditableProjects)
        }
      } catch {
        setReadOnlyMode(false)
      }
    }
    load()
  }, [])

  if (readOnlyMode) {
    return (
      <>
        <NavLink href="/projects" active={pathname === '/projects'}>Projects</NavLink>
      </>
    )
  }

  return (
    <>
      <NavLink href="/dashboard" active={pathname === '/dashboard'}>Dashboard</NavLink>
      <NavLink href="/tasks/mine" active={pathname === '/tasks/mine'}>Your Tasks</NavLink>
      <NavLink href="/todos" active={pathname === '/todos'}>Todos</NavLink>
      <NavLink href="/messages" active={pathname === '/messages'}>Messages</NavLink>
      <NavLink href="/timesheets" active={pathname === '/timesheets'}>Timesheets</NavLink>
    </>
  )
}

function NavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`transition-colors ${active ? 'text-white font-medium' : 'text-white/80 hover:text-white'}`}>
      {children}
    </Link>
  )
}
