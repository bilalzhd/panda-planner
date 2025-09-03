"use client"
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PROJECT_COLOR_OPTIONS } from '@/lib/validators'

type Project = { id: string; name: string; color?: string | null }

export function Sidebar({ embedded = false }: { embedded?: boolean }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<string>('blue')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  async function load() {
    const res = await fetch('/api/projects', { cache: 'no-store' })
    if (res.ok) setProjects(await res.json())
  }
  useEffect(() => { load() }, [])

  async function createProject() {
    if (!name.trim()) return
    setLoading(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, color }),
    })
    setLoading(false)
    if (!res.ok) return
    const p = await res.json()
    setOpen(false)
    setName('')
    setDescription('')
    setColor('blue')
    // Optimistically update and navigate
    setProjects((prev) => [{ id: p.id, name: p.name }, ...prev])
    router.push(`/projects/${p.id}`)
    // Also ensure list refreshed
    load()
  }

  function isActive(href: string) {
    return pathname === href
  }

  const content = (
      <div className={`flex ${embedded ? 'h-screen' : 'h-[calc(100vh-56px)]'} flex-col gap-4 p-4 w-full`}>
        <div className="text-lg font-semibold px-1">TaskFlow</div>
        <nav className="flex flex-col gap-1">
          <SideLink href="/dashboard" active={isActive('/dashboard')}>Dashboard</SideLink>
          <SideLink href="/projects" active={isActive('/projects')}>Projects</SideLink>
          <SideLink href="/tasks" active={isActive('/tasks')}>All Tasks</SideLink>
          <SideLink href="/timesheets" active={isActive('/timesheets')}>Timesheets</SideLink>
          <SideLink href="/credentials" active={isActive('/credentials')}>Credentials</SideLink>
          <SideLink href="/settings/pin" active={isActive('/settings/pin')}>PIN Settings</SideLink>
          <SideLink href="/team" active={isActive('/team')}>Team</SideLink>
        </nav>
        <div className="mt-4 text-xs uppercase tracking-wide text-white/50 px-1">Projects</div>
        <div className="flex-1 overflow-auto">
          <ul className="space-y-1">
            {projects.map((p) => {
              const active = pathname?.startsWith(`/projects/${p.id}`)
              return (
                <li key={p.id}>
                  <Link className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/10 ${active ? 'bg-white/10' : ''}`} href={`/projects/${p.id}`}>
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorToHex(p.color || 'gray') }} />
                    {p.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)}>Add Project</Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogHeader>New Project</DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div>
              <div className="mb-1 text-sm text-white/80">Color</div>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLOR_OPTIONS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)} className={`h-7 w-7 rounded-full border ${color === c ? 'ring-2 ring-white' : 'border-white/20'}`} style={{ backgroundColor: colorToHex(c) }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createProject} disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </Dialog>
      </div>
  )

  if (embedded) {
    return <div className="w-72 max-w-full">{content}</div>
  }
  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 border-r border-white/10 bg-white/[0.03]">
      {content}
    </aside>
  )
}

function SideLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`rounded-md px-2 py-1.5 text-sm ${active ? 'bg-white text-black font-medium' : 'hover:bg-white/10'}`}>{children}</Link>
  )
}

function colorToHex(c: string) {
  switch (c) {
    case 'blue': return '#60a5fa'
    case 'green': return '#34d399'
    case 'orange': return '#fb923c'
    case 'purple': return '#a78bfa'
    case 'pink': return '#f472b6'
    case 'teal': return '#14b8a6'
    case 'red': return '#f87171'
    case 'yellow': return '#facc15'
    case 'gray': return '#9ca3af'
    default: return '#9ca3af'
  }
}
