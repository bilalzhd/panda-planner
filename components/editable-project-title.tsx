"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  projectId: string
  initialName: string
  colorHex: string
  canEdit: boolean
}

export function EditableProjectTitle({ projectId, initialName, colorHex, canEdit }: Props) {
  const [name, setName] = useState(initialName)
  const [draft, setDraft] = useState(initialName)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    setName(initialName)
    if (!editing) setDraft(initialName)
  }, [initialName, editing])

  useEffect(() => {
    if (!editing) return
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => cancelAnimationFrame(id)
  }, [editing])

  function handleActivate() {
    if (!canEdit) return
    setDraft(name)
    setEditing(true)
    setError(null)
  }

  async function persist(nextName: string) {
    const trimmed = nextName.trim()
    if (!trimmed) {
      setError('Project name is required')
      setDraft(name)
      setEditing(false)
      return
    }
    if (trimmed === name) {
      setEditing(false)
      setError(null)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        let message = 'Failed to save project name'
        try {
          const data = await res.json()
          if (typeof data?.error === 'string') message = data.error
        } catch {
          // ignore parse errors
        }
        setError(message)
        setDraft(name)
        return
      }
      setName(trimmed)
      setDraft(trimmed)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('project:renamed', { detail: { id: projectId, name: trimmed } }))
      }
      router.refresh()
    } catch {
      setError('Failed to save project name')
      setDraft(name)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  function handleBlur() {
    if (!editing) return
    void persist(draft)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void persist(draft)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setDraft(name)
      setEditing(false)
      setError(null)
    }
  }

  return (
    <div className="flex flex-col min-w-0">
      <div className="flex items-center gap-2 text-lg font-semibold min-w-0">
        <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colorHex }} />
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={saving}
            className="w-full min-w-0 bg-transparent border-b border-white/40 text-lg font-semibold text-white placeholder-white/50 focus:border-white focus:outline-none"
          />
        ) : canEdit ? (
          <button
            type="button"
            onClick={handleActivate}
            className="truncate text-left rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50"
          >
            {name}
          </button>
        ) : (
          <span className="truncate">{name}</span>
        )}
        {saving && !editing && <span className="text-xs text-white/60">Saving…</span>}
      </div>
      {error && <span className="mt-1 text-xs text-red-400">{error}</span>}
    </div>
  )
}
