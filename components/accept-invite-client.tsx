"use client"
import { useEffect, useState } from 'react'

export function AcceptInviteClient({ token }: { token: string }) {
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('Invite token missing.')
      return
    }
    let cancelled = false
    async function accept() {
      try {
        const res = await fetch(`/api/invites/accept?token=${encodeURIComponent(token)}`, { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Failed to accept invite')
        if (cancelled) return
        const destination = data?.type === 'PROJECT_CLIENT' && data?.projectId
          ? `/projects/${data.projectId}?accepted=1`
          : '/team?accepted=1'
        window.location.replace(destination)
      } catch (e: any) {
        if (cancelled) return
        setStatus('error')
        setError(e?.message || 'Failed to accept invite')
      }
    }
    accept()
    return () => { cancelled = true }
  }, [token])

  if (status === 'error') {
    return (
      <div className="mx-auto mt-20 max-w-md rounded-lg border border-white/10 bg-white/5 p-6 text-center">
        <div className="text-lg font-semibold text-white">Invite problem</div>
        <div className="mt-2 text-sm text-white/70">{error || 'Something went wrong while accepting the invite.'}</div>
        <div className="mt-6 text-sm">
          <a className="text-blue-300 hover:text-blue-200" href="/">Go back home</a>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-20 flex max-w-md flex-col items-center gap-4 rounded-lg border border-white/10 bg-white/5 px-6 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20">
        <svg className="h-6 w-6 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"></path>
        </svg>
      </div>
      <div className="text-lg font-semibold text-white">Preparing your workspace…</div>
      <div className="text-sm text-white/70">Hang tight while we verify your invite and redirect you.</div>
    </div>
  )
}
