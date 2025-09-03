"use client"
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CredentialIcon } from '@/components/credential-icon'
import { Input } from '@/components/ui/input'
import { DialogHeader } from '@/components/ui/dialog'
import { useSearchParams, useRouter } from 'next/navigation'
import { CopyButton } from '@/components/copy-button'

type Revealed = {
  projects: { projectId: string; projectName: string; credentials: { id: string; label: string; username?: string | null; password: string }[] }[]
}

export default function CredentialsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectFilter = searchParams?.get('projectId') || ''
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Revealed | null>(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  async function reveal() {
    setLoading(true)
    setError('')
    setData(null)
    const res = await fetch('/api/credentials/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    })
    setLoading(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j?.error || 'Failed to reveal')
      return
    }
    const j = await res.json()
    setData(j)
  }

  const filtered = useMemo(() => {
    if (!data) return null
    const groups = (projectFilter ? data.projects.filter((p) => p.projectId === projectFilter) : data.projects)
    if (!q.trim()) return groups
    const term = q.toLowerCase()
    return groups
      .map((p) => ({
        ...p,
        credentials: p.credentials.filter((c) =>
          (c.label?.toLowerCase().includes(term)) ||
          (c.username?.toLowerCase().includes(term)) ||
          (c.password?.toLowerCase().includes(term))
        ),
      }))
      .filter((p) => p.credentials.length > 0)
  }, [data, projectFilter, q])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Credentials</h1>
        <div className="flex items-center gap-3">
          {projectFilter && (
            <Button variant="outline" onClick={() => router.push('/credentials')}>Show full list</Button>
          )}
          <Link href="/dashboard" className="text-sm text-white/70 hover:text-white">Back to dashboard</Link>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <DialogHeader>Reveal All Credentials</DialogHeader>
        <div className="space-y-2 p-1">
          <div className="text-xs text-white/70">
            Enter your PIN to reveal all stored passwords across your projects. The first time you do this, your PIN will be set.
          </div>
          <div className="flex gap-2 items-center">
            <Input type="password" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} className="max-w-xs" />
            <Button onClick={reveal} disabled={loading || pin.length < 4}>{loading ? 'Revealing...' : 'Reveal'}</Button>
          </div>
          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>
      </div>

      {data && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input placeholder="Search (label, username, password)" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
            {projectFilter && <span className="text-xs text-white/60">Filtered to a single project</span>}
          </div>
          {(filtered || []).map((p) => (
            <div key={p.projectId} className="rounded-md border border-white/10 p-3 bg-white/[0.02]">
              <div className="mb-2 text-sm font-semibold">{p.projectName}</div>
              {p.credentials.length === 0 ? (
                <div className="text-xs text-white/60">No credentials</div>
              ) : (
                <ul className="mt-1 space-y-2">
                  {p.credentials.map((c) => (
                    <li key={c.id} className="text-xs flex flex-col gap-1 rounded-md border border-white/10 bg-white/5 p-2">
                      <div className="flex items-center gap-2">
                        <CredentialIcon label={c.label} />
                        <span className="font-medium">{c.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/60 w-16">User</span>
                        <span className="truncate font-mono">{c.username || '(empty)'}</span>
                        {c.username && <CopyButton text={c.username} ariaLabel={`Copy username for ${c.label}`} />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/60 w-16">Pass</span>
                        <span className="truncate font-mono">{c.password || '(empty)'}</span>
                        {c.password && <CopyButton text={c.password} ariaLabel={`Copy password for ${c.label}`} />}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
