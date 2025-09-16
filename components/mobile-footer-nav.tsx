"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export function MobileFooterNav() {
  const pathname = usePathname()
  const [unread, setUnread] = useState<number>(0)
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch('/api/messages/unread', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (mounted) setUnread(Number(data?.count || 0))
      } catch {}
    }
    load()
    const id = setInterval(load, 20000)
    return () => { mounted = false; clearInterval(id) }
  }, [])
  const is = (href: string) => pathname === href
  const item = (href: string, icon: React.ReactNode, label: string, badge?: number) => {
    const count = Math.max(0, Number(badge || 0))
    return (
      <Link
        href={href}
        aria-label={label}
        className={`relative flex-1 flex items-center justify-center py-2 ${is(href) ? 'text-white' : 'text-white/70'}`}
      >
        {icon}
        {count > 0 && (
          <span className="absolute top-1.5 right-6 rounded-full bg-rose-500 text-[10px] leading-none px-1.5 py-1 text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    )
  }

  const iconDashboard = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="13" y="3" width="8" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="13" y="10" width="8" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
  const iconTodos = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 6h12M9 12h12M9 18h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M5 5l-2 2 1 1 3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M5 11l-2 2 1 1 3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M5 17l-2 2 1 1 3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  )
  const iconMessages = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9l-4 4v-4H7a3 3 0 0 1-3-3V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 border-t border-white/10 bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {item('/dashboard', iconDashboard, 'Dashboard')}
        {item('/todos', iconTodos, 'Todos')}
        {item('/messages', iconMessages, 'Messages', unread)}
      </div>
    </nav>
  )
}
