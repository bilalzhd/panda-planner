import './globals.css'
import { ReactNode } from 'react'
import Link from 'next/link'
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import { AppShell } from '@/components/app-shell'

export const metadata = {
  title: 'Panda Planner',
  description: 'Task & Project Management for agencies',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen antialiased">
          <header className="border-b border-white/10">
            <div className="container flex items-center justify-between h-14">
              <Link href="/" className="font-semibold">Panda Planner</Link>
              <nav className="flex items-center gap-4 text-sm text-white/80">
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/timesheets">Timesheets</Link>
                <SignedOut>
                  <SignInButton afterSignInUrl="/dashboard" mode="modal">
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
              <div className="container py-6">{children}</div>
            </AppShell>
          </main>
        </body>
      </html>
    </ClerkProvider>
  )
}
