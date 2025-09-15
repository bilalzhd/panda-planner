import './globals.css'
import { ReactNode } from 'react'
import Link from 'next/link'
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import { AppShell } from '@/components/app-shell'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/sidebar'
// Removed header credentials reveal in favor of sidebar and dedicated pages
import { ThemeToggle } from '@/components/theme-toggle'
import { MobileFooterNav } from '@/components/mobile-footer-nav'

export const metadata = {
  title: 'Mera Kommunikation Task Management',
  description: 'Task & Project Management for agencies',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen antialiased">
          <script dangerouslySetInnerHTML={{__html: `try{var t=localStorage.getItem('pp-theme'); if(t==='light'){document.documentElement.classList.add('theme-light')}}catch(e){}`}} />
          <header className="border-b border-white/10">
            <div className="container flex items-center justify-between h-14">
              <div className="flex items-center gap-2">
                <div className="md:hidden">
                  <Sheet>
                    <SheetTrigger>
                      <Button variant="ghost" aria-label="Open menu">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                          <path d="M3.75 6.75h16.5a.75.75 0 0 0 0-1.5H3.75a.75.75 0 0 0 0 1.5Zm16.5 4.5H3.75a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5Zm0 6H3.75a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5Z" />
                        </svg>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left">
                      <Sidebar embedded />
                    </SheetContent>
                  </Sheet>
                </div>
                <Link href="/" className="font-semibold">Mera Kommunikation</Link>
              </div>
              <nav className="hidden md:flex items-center gap-4 text-sm text-white/80">
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/tasks/mine">Your Tasks</Link>
                <Link href="/todos">Todos</Link>
                <Link href="/messages">Messages</Link>
                <Link href="/timesheets">Timesheets</Link>
                <SignedIn>
                  <ThemeToggle />
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="rounded-md border border-white/10 bg-white/10 px-3 py-1 text-sm">Sign In</button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
                </SignedIn>
              </nav>
            </div>
          </header>
          <main>
            <AppShell>
              <div className="container py-6 pb-20 md:pb-6">{children}</div>
            </AppShell>
            <MobileFooterNav />
          </main>
        </body>
      </html>
    </ClerkProvider>
  )
}
