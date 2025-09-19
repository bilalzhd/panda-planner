"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Client = {
  id: string
  name: string | null
  email: string | null
  image: string | null
  accessId: string
  role: string
}

type Invite = {
  id: string
  email: string
  expiresAt: string
  createdAt: string
  token: string
}

export function ProjectClientsPanel({ projectId }: { projectId: string }) {
  const [clients, setClients] = useState<Client[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    try {
      const res = await fetch(`/api/projects/${projectId}/clients`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load clients')
      const data = await res.json()
      setClients(Array.isArray(data?.clients) ? data.clients : [])
      setInvites(Array.isArray(data?.invites) ? data.invites : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load clients')
    }
  }

  useEffect(() => { load() }, [projectId])

  async function addClient(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to add client')
      if (data?.client) {
        setClients((prev) => [data.client, ...prev])
        setMessage('Client added. They can sign in to view this project.')
      } else if (data?.invite) {
        setInvites((prev) => [data.invite, ...prev])
        if (data?.mailSent) {
          setMessage('Invite sent.')
        } else if (data?.acceptUrl) {
          setMessage('Invite created. Copy the accept link below to share manually.')
        }
        if (data?.acceptUrl) {
          navigator.clipboard.writeText(data.acceptUrl).catch(() => {})
        }
      }
      setEmail('')
    } catch (e: any) {
      setError(e?.message || 'Failed to add client')
    } finally {
      setLoading(false)
    }
  }

  async function removeClient(userId: string) {
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/clients?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove client')
      setClients((prev) => prev.filter((c) => c.id !== userId))
    } catch (e: any) {
      setError(e?.message || 'Failed to remove client')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white/80">Invite a client</h3>
        <form onSubmit={addClient} className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            type="email"
            required
            placeholder="client@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="md:flex-1"
          />
          <Button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Invite'}</Button>
        </form>
        <p className="mt-2 text-xs text-white/50">Clients invited here can only access this project and its tasks & timesheets.</p>
      </div>

      {error && <div className="text-xs text-rose-400">{error}</div>}
      {message && <div className="text-xs text-emerald-400">{message}</div>}

      <div className="space-y-3">
        <div className="text-sm font-semibold text-white/80">Active clients</div>
        {clients.length === 0 && <div className="text-xs text-white/50">No clients yet.</div>}
        <ul className="space-y-2">
          {clients.map((c) => (
            <li key={c.accessId} className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2">
              <div>
                <div className="text-sm font-medium">{c.name || c.email || 'Client'}</div>
                <div className="text-xs text-white/50">{c.email}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeClient(c.id)}>Remove</Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-white/80">Pending invites</div>
        {invites.length === 0 && <div className="text-xs text-white/50">No pending invites.</div>}
        <ul className="space-y-2">
          {invites.map((inv) => (
            <li key={inv.id} className="rounded-md border border-dashed border-white/10 bg-white/5 px-3 py-2 text-sm">
              <div className="font-medium">{inv.email}</div>
              <div className="text-xs text-white/50">Expires {new Date(inv.expiresAt).toLocaleDateString()}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
