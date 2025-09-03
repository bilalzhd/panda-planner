"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function PinSettingsPage() {
  const [hasPin, setHasPin] = useState<boolean | null>(null)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/settings/pin').then(r => r.json()).then(j => setHasPin(!!j.hasPin)).catch(() => setHasPin(false))
  }, [])

  async function save() {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/settings/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPin: hasPin ? currentPin : undefined, newPin }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setMsg(j?.error || 'Failed to update PIN')
      return
    }
    setMsg('PIN updated')
    setCurrentPin('')
    setNewPin('')
    setHasPin(true)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">PIN Settings</h1>
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 max-w-md">
        {hasPin === null ? (
          <div className="text-sm text-white/60">Loading...</div>
        ) : (
          <div className="grid gap-3">
            {hasPin && (
              <Input type="password" placeholder="Current PIN" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} />
            )}
            <Input type="password" placeholder={hasPin ? 'New PIN' : 'Set PIN'} value={newPin} onChange={(e) => setNewPin(e.target.value)} />
            <Button onClick={save} disabled={saving || newPin.length < 4}>{saving ? 'Saving...' : hasPin ? 'Change PIN' : 'Set PIN'}</Button>
            {msg && <div className={`text-sm ${msg.includes('updated') ? 'text-green-400' : 'text-red-400'}`}>{msg}</div>}
          </div>
        )}
      </div>
    </div>
  )
}

