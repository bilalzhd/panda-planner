"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWorkspace } from '@/components/workspace-provider'

export function WorkspaceSwitcher() {
  const { workspaces, limit, activeWorkspaceId, loading, error: loadError, creating, selecting, refresh, selectWorkspace, createWorkspace } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!open) return
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  const reachedLimit = useMemo(() => {
    if (limit == null) return false
    return workspaces.length >= limit
  }, [limit, workspaces])

  async function handleCreateWorkspace() {
    if (!newName.trim() || creating || reachedLimit) return
    setError(null)
    try {
      await createWorkspace(newName.trim())
      setNewName('')
    } catch (e: any) {
      setError(e?.message || 'Could not create workspace')
    }
  }

  if (loading && workspaces.length === 0) {
    return <div className="text-xs text-white/60">Loading workspaces…</div>
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-white/70">
        <Button variant="ghost" onClick={handleCreateWorkspace} disabled={creating || reachedLimit}>
          {creating ? 'Creating…' : 'Create workspace'}
        </Button>
        {(error || loadError) && <span className="text-rose-300">{error || loadError}</span>}
      </div>
    )
  }

  const activeId = activeWorkspaceId || workspaces[0]?.id || ''
  const activeWorkspace = workspaces.find((w) => w.id === activeId) || workspaces[0]

  async function handleSelectWorkspace(workspaceId: string) {
    if (!workspaceId || workspaceId === activeId || selecting) {
      setOpen(false)
      return
    }
    setError(null)
    try {
      await selectWorkspace(workspaceId)
      setOpen(false)
    } catch (e: any) {
      setError(e?.message || 'Unable to switch workspace')
    }
  }

  return (
    <div className="relative flex items-center gap-2 text-sm text-white/80" ref={menuRef}>
      <button
        type="button"
        className="inline-flex items-center rounded-md border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
        onClick={() => setOpen((v) => !v)}
      >
        {activeWorkspace?.name || 'Workspace'}
        <ChevronDownIcon className="ml-2 h-4 w-4 opacity-70" />
      </button>
      <Button variant="ghost" className="h-8 w-8 p-0" onClick={refresh} title="Refresh workspaces">
        ⟳
      </Button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-72 rounded-lg border border-white/15 bg-[#111315] p-3 shadow-xl">
          <div className="text-xs uppercase tracking-wide text-white/50 mb-2">Switch workspace</div>
          <div className="max-h-48 overflow-auto space-y-1">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                onClick={() => handleSelectWorkspace(workspace.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${workspace.id === activeId ? 'bg-white/15 text-white' : 'hover:bg-white/10'}`}
              >
                <span className="truncate">{workspace.name}</span>
                {workspace.id === activeId && <span className="text-[10px] uppercase tracking-wide text-white/70">Active</span>}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            <Input
              placeholder={reachedLimit ? 'Workspace limit reached' : 'New workspace name'}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={reachedLimit || creating}
            />
            <Button className="w-full" onClick={handleCreateWorkspace} disabled={reachedLimit || creating || !newName.trim()}>
              {creating ? 'Adding…' : 'Add workspace'}
            </Button>
            {typeof limit === 'number' && (
              <div className="text-[11px] text-white/50 text-center">
                {workspaces.length}/{limit} workspaces used
              </div>
            )}
            {(error || loadError) && <div className="text-[11px] text-rose-300 text-center">{error || loadError}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
