"use client"
import { useEffect, useRef, useState } from 'react'

export function InlineEdit({
  value,
  placeholder,
  onSave,
  className,
  rows = 3,
}: {
  value: string | null | undefined
  placeholder?: string
  onSave: (v: string) => Promise<void> | void
  className?: string
  rows?: number
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value || '')
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setText(value || '') }, [value])
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  async function commit() {
    if (saving) return
    setSaving(true)
    try { await onSave(text.trim()) } finally { setSaving(false); setEditing(false) }
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={`w-full text-sm bg-transparent rounded-md border border-white/20 p-2 outline-none focus:border-white/40 ${className || ''}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setEditing(false); setText(value || '') }
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); commit() }
        }}
        placeholder={placeholder}
      />
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => { if (e.key === 'Enter') setEditing(true) }}
      className={`text-sm text-white/80 rounded-md p-2 border border-transparent hover:border-white/20 cursor-text ${className || ''}`}
    >
      {value?.trim() ? value : <span className="text-white/40">{placeholder || 'Click to add...'}</span>}
    </div>
  )
}

