"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CredentialIcon } from '@/components/credential-icon'
import { Dialog, DialogFooter, DialogHeader } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type Cred = { id: string; label: string; username?: string | null }

export function CredentialsPanel({ projectId }: { projectId: string }) {
  const [creds, setCreds] = useState<Cred[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/credentials`, { cache: 'no-store' })
    setLoading(false)
    if (res.ok) setCreds(await res.json())
  }

  useEffect(() => { load() }, [projectId])

  async function create() {
    if (!label.trim() || !password) return
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: label.trim(), username: username.trim() || undefined, password }),
    })
    setSaving(false)
    if (res.ok) {
      setOpen(false)
      setLabel('')
      setUsername('')
      setPassword('')
      load()
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="text-sm font-semibold tracking-wide">Project Credentials</div>
        <div className="flex items-center gap-2">
          <a href={`/credentials?projectId=${projectId}`} className="text-xs text-white/70 hover:text-white">Open Credentials</a>
          <Button variant="outline" onClick={() => setOpen(true)}>Add Credential</Button>
        </div>
      </div>
      <div className="p-3">
        {loading && <div className="text-white/60 text-sm">Loading...</div>}
        {!loading && creds.length === 0 && (
          <div className="text-white/60 text-sm">No credentials yet.</div>
        )}
        {!loading && creds.length > 0 && (
          <ul className="space-y-2">
            {creds.map((c) => (
              <li key={c.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-2 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <CredentialIcon label={c.label} />
                    <span>{c.label}</span>
                  </div>
                  <button
                    type="button"
                    className="text-xs rounded border border-white/20 px-2 py-0.5 hover:bg-white/10"
                    onClick={async () => {
                      const ok = window.confirm('Delete this credential? This cannot be undone.')
                      if (!ok) return
                      const res = await fetch(`/api/credentials/${c.id}`, { method: 'DELETE' })
                      if (res.ok) {
                        setCreds((prev) => prev.filter((x) => x.id !== c.id))
                      }
                    }}
                  >Delete</button>
                </div>
                <div className="text-xs text-white/60">{c.username || 'No username'}</div>
                <div className="text-xs text-white/40 mt-1">Password hidden • Reveal from Credentials page</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>New Credential</DialogHeader>
        <div className="grid gap-2 p-1">
          <Input placeholder="Label (e.g., Google)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input placeholder="Username (optional)" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={create} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
