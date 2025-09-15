"use client"
import { useEffect, useState } from 'react'
import { Dialog, DialogFooter, DialogHeader } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type UserOpt = { id: string; name: string | null; email: string | null }

export function ChannelCreateDialog({ teamId, users, onCreated }: { teamId: string; users: UserOpt[]; onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    const res = await fetch('/api/channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId, name: name.trim() || 'new-channel', memberIds: selected }) })
    setSaving(false)
    if (res.ok) {
      setOpen(false)
      setName('')
      setSelected([])
      onCreated?.()
    }
  }

  return (
    <div>
      <button className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs" onClick={() => setOpen(true)}>New Channel</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>New Channel</DialogHeader>
        <div className="space-y-2">
          <Input placeholder="Channel name (e.g., design)" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <div className="mb-1 text-sm text-white/80">Members</div>
            <div className="max-h-48 overflow-auto rounded-md border border-white/10">
              {users.map((u) => {
                const checked = selected.includes(u.id)
                return (
                  <label key={u.id} className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-white/5">
                    <input type="checkbox" checked={checked} onChange={(e) => {
                      setSelected((prev) => e.target.checked ? [...prev, u.id] : prev.filter((x) => x !== u.id))
                    }} />
                    <span>{u.name || u.email}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

