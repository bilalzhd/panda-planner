import Link from 'next/link'
import { SignedIn, SignedOut } from '@clerk/nextjs'

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-4xl text-center py-16">
      <h1 className="text-3xl md:text-4xl font-bold">Mera Kommunikation Task Management</h1>
      <p className="mt-4 text-white/80">Lightweight Task & Project Management for digital marketing and web agencies.</p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <SignedOut>
          <Link href="/sign-in" className="rounded-md bg-white text-black px-4 py-2 text-sm font-medium">Get Started</Link>
        </SignedOut>
        <SignedIn>
          <Link href="/dashboard" className="rounded-md bg-white text-black px-4 py-2 text-sm font-medium">Go to Dashboard</Link>
        </SignedIn>
        <a href="#features" className="rounded-md border border-white/20 px-4 py-2 text-sm">Learn more</a>
        <Link href="/changelog" className="rounded-md border border-white/20 px-4 py-2 text-sm">Changelog</Link>
      </div>
      <div id="features" className="mt-16 grid md:grid-cols-3 gap-4 text-left">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="font-semibold">Projects & Tasks</div>
          <div className="text-sm text-white/70">Organize work by project, with priorities, due dates, and comments.</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="font-semibold">Kanban & To‑Do</div>
          <div className="text-sm text-white/70">Drag and drop across To Do, In Progress, and Done.</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="font-semibold">Timesheets & Reports</div>
          <div className="text-sm text-white/70">Track hours and export CSV/PDF for payroll and reporting.</div>
        </div>
      </div>
    </div>
  )
}
