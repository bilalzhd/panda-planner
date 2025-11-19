"use client"

import { useState } from 'react'
import { useWorkspace } from '@/components/workspace-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, workspaces, loading, error, creating, limit, createWorkspace, refresh } = useWorkspace()
  const [name, setName] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  if (!isSignedIn) {
    return <>{children}</>
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-white/70">Loading workspace…</div>
  }

  const reachedLimit = typeof limit === 'number' && workspaces.length >= limit

  if (workspaces.length === 0) {
    async function handleCreate() {
      if (!name.trim() || creating || reachedLimit) return
      setLocalError(null)
      try {
        await createWorkspace(name.trim())
        setName('')
      } catch (e: any) {
        setLocalError(e?.message || 'Could not create workspace')
      }
    }

    return (
      <div className="mx-auto max-w-xl rounded-lg border border-white/10 bg-white/[0.03] p-6 text-white/80">
        <h1 className="text-2xl font-semibold mb-3">Create your first workspace</h1>
        <p className="text-sm text-white/70">
          You are not a member of any workspace yet. Create one to start managing projects, tasks, and messages. You can invite teammates later from the Users page.
        </p>
        <div className="mt-4 space-y-3">
          <Input
            placeholder={reachedLimit ? 'Workspace limit reached' : 'Workspace name'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={reachedLimit || creating}
          />
          <Button className="w-full" onClick={handleCreate} disabled={creating || reachedLimit || !name.trim()}>
            {creating ? 'Creating…' : 'Create workspace'}
          </Button>
          {typeof limit === 'number' && (
            <div className="text-xs text-white/50 text-center">{workspaces.length}/{limit} workspaces used</div>
          )}
          {(localError || error) && (
            <div className="text-xs text-rose-300 text-center">{localError || error}</div>
          )}
          <Button variant="ghost" onClick={refresh} disabled={creating}>Refresh</Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/70">
        <div>{error}</div>
        <Button variant="outline" onClick={refresh}>Try again</Button>
      </div>
    )
  }

  return <>{children}</>
}
