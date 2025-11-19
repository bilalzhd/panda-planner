"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

type Workspace = { id: string; name: string; ownerId: string }

type WorkspaceContextValue = {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  limit: number | null
  loading: boolean
  error: string | null
  creating: boolean
  selecting: boolean
  isSignedIn: boolean
  refresh: () => Promise<void>
  selectWorkspace: (workspaceId: string) => Promise<void>
  createWorkspace: (name: string) => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [limit, setLimit] = useState<number | null>(null)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [selecting, setSelecting] = useState(false)

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setWorkspaces([])
      setLimit(null)
      setActiveWorkspaceId(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/workspaces', { cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to load workspaces')
      }
      const data = await res.json()
      setWorkspaces(Array.isArray(data?.workspaces) ? data.workspaces : [])
      setLimit(typeof data?.limit === 'number' ? data.limit : null)
      setActiveWorkspaceId(typeof data?.activeWorkspaceId === 'string' ? data.activeWorkspaceId : null)
    } catch (e: any) {
      setError(e?.message || 'Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }, [isSignedIn])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createWorkspace = useCallback(
    async (name: string) => {
      if (!isSignedIn || !name.trim()) return
      setCreating(true)
      try {
        const res = await fetch('/api/workspaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || 'Could not create workspace')
        }
        await refresh()
        router.refresh()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('workspace:changed'))
        }
      } finally {
        setCreating(false)
      }
    },
    [isSignedIn, refresh, router],
  )

  const selectWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!isSignedIn || !workspaceId || workspaceId === activeWorkspaceId) return
      setSelecting(true)
      try {
        const res = await fetch('/api/workspaces/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || 'Unable to switch workspace')
        }
        setActiveWorkspaceId(workspaceId)
        await refresh()
        router.refresh()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('workspace:changed', { detail: { workspaceId } }))
        }
      } finally {
        setSelecting(false)
      }
    },
    [isSignedIn, activeWorkspaceId, refresh, router],
  )

  const isSignedInVar = Boolean(isSignedIn)

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      activeWorkspaceId,
      limit,
      loading,
      error,
      creating,
      selecting,
      isSignedIn: isSignedInVar,
      refresh,
      selectWorkspace,
      createWorkspace,
    }),
    [workspaces, activeWorkspaceId, limit, loading, error, creating, selecting, isSignedIn, refresh, selectWorkspace, createWorkspace],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return ctx
}
