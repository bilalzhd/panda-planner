"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function InviteForm({ teamId }: { teamId: string }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ acceptUrl: string; mailSent: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)
    if (!email.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Invite failed')
      setResult({ acceptUrl: data.acceptUrl, mailSent: !!data.mailSent })
      setEmail('')
    } catch (e: any) {
      setError(e?.message || 'Invite failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          name="email"
          type="email"
          placeholder="teammate@example.com"
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Invite'}</Button>
      </form>
      {error && <div className="mt-2 text-xs text-rose-400">{error}</div>}
      {result && (
        <div className="mt-2 text-xs text-white/80 space-y-1">
          <div>{result.mailSent ? 'Email sent.' : 'Email could not be sent. You can share the link below manually.'}</div>
          <div className="break-all rounded-md border border-white/10 bg-white/5 px-2 py-1">{result.acceptUrl}</div>
          <button
            type="button"
            className="mt-1 rounded-md border border-white/10 bg-white/10 px-2 py-0.5"
            onClick={() => navigator.clipboard.writeText(result.acceptUrl)}
          >Copy link</button>
        </div>
      )}
      <div className="mt-2 text-xs text-white/60">Sends an invite link valid for 7 days.</div>
    </div>
  )
}

