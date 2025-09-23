"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <NotificationsCard />
        <PinCard />
      </div>
    </div>
  )
}

function NotificationsCard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [emailTaskAssigned, setEmailTaskAssigned] = useState(true)
  const [emailTeamMessage, setEmailTeamMessage] = useState(false)
  const [msg, setMsg] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then((r) => r.json())
      .then((j) => { setEmailTaskAssigned(!!j.emailTaskAssigned); setEmailTeamMessage(!!j.emailTeamMessage); if (j.setupPending) setNote('Notifications are being set up. You can still toggle your preference and try saving again shortly.') })
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/settings/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emailTaskAssigned, emailTeamMessage }) })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      const err = j?.error || 'We could not save your preferences. Please try again.'
      setMsg(err)
      return
    }
    setMsg('Your notification preferences have been saved.')
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 text-sm font-semibold">Notifications</div>
      {loading ? (
        <div className="text-sm text-white/60">Loading…</div>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={emailTaskAssigned} onChange={(e) => setEmailTaskAssigned(e.target.checked)} /> Email me when tasks are assigned to me</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={emailTeamMessage} onChange={(e) => setEmailTeamMessage(e.target.checked)} /> Email me when new team messages are posted</label>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          {note && <div className="text-xs text-white/60">{note}</div>}
          {msg && <div className={`text-xs ${msg.startsWith('Your') ? 'text-emerald-400' : 'text-rose-400'}`}>{msg}</div>}
        </div>
      )}
    </div>
  )
}

function PinCard() {
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
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 text-sm font-semibold">PIN</div>
      {hasPin === null ? (
        <div className="text-sm text-white/60">Loading…</div>
      ) : (
        <div className="grid gap-3 max-w-md">
          {hasPin && (
            <Input type="password" placeholder="Current PIN" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} />
          )}
          <Input type="password" placeholder={hasPin ? 'New PIN' : 'Set PIN'} value={newPin} onChange={(e) => setNewPin(e.target.value)} />
          <Button onClick={save} disabled={saving || newPin.length < 4}>{saving ? 'Saving…' : hasPin ? 'Change PIN' : 'Set PIN'}</Button>
          {msg && <div className={`text-sm ${msg.includes('updated') ? 'text-green-400' : 'text-red-400'}`}>{msg}</div>}
        </div>
      )}
    </div>
  )
}
