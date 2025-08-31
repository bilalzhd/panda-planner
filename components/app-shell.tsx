"use client"
import { Sidebar } from '@/components/sidebar'
import { usePathname } from 'next/navigation'
import { SignedIn } from '@clerk/nextjs'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLanding = pathname === '/'
  return (
    <div className="flex">
      <SignedIn>
        {!isLanding && <Sidebar />}
      </SignedIn>
      <div className="flex-1">{children}</div>
    </div>
  )
}

