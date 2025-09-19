"use client"
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'

export function ProjectNotes({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveTimer = useRef<any>(null)

  const sanitizeHtml = useCallback((raw: string) => {
    try {
      return raw
        .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
        .replace(/\sdir=("[^"]*"|'[^']*'|[^ >]+)/gi, '')
        .replace(/direction\s*:\s*(rtl|ltr)\s*;?/gi, '')
        .replace(/unicode-bidi\s*:\s*[^;]+;?/gi, '')
    } catch { return raw }
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2,3] },
        codeBlock: true,
      }),
      Underline,
      Link.configure({ openOnClick: true, autolink: true, protocols: ['http', 'https', 'mailto'] }),
      Placeholder.configure({ placeholder: 'Write project notes…' }),
    ],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        dir: 'ltr',
        style: 'direction:ltr; unicode-bidi:plaintext;'
      },
    },
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        setError(null)
        setSaving(true)
        try {
          const html = sanitizeHtml(editor.getHTML())
          const res = await fetch(`/api/projects/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notesHtml: html }),
          })
          if (!res.ok) {
            let msg = `Save failed (${res.status})`
            try { const j = await res.json(); if (j?.error) msg = j.error } catch {}
            throw new Error(msg)
          }
          setSavedAt(new Date())
        } catch (e: any) {
          setError(e?.message || 'Failed to save')
        } finally {
          setSaving(false)
        }
      }, 800)
    },
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/projects/${projectId}`, { cache: 'no-store' })
        if (!res.ok) {
          let msg = 'Failed to load project'
          try { const j = await res.json(); if (j?.error) msg = j.error } catch {}
          throw new Error(msg)
        }
        const p = await res.json()
        if (!cancelled) editor?.commands.setContent(p?.notesHtml || '', false)
      } catch (e: any) {
        setError(e?.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [projectId, editor])

  function addLink() {
    const url = window.prompt('Enter URL:')
    if (!url) return
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }
  function removeLink() { editor?.chain().focus().unsetLink().run() }

  return (
    <>
      {fullscreen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />}
      <div className={`rounded-lg border border-white/10 bg-white/[0.03] ${fullscreen ? 'fixed inset-4 z-50 shadow-2xl bg-[#12151b] ring-1 ring-white/10' : ''}`}>
        <div className="flex items-center justify-between p-3 border-b border-white/10 sticky top-0 bg-white/[0.03] backdrop-blur supports-[backdrop-filter]:bg-white/5">
          <div className="text-sm font-semibold tracking-wide">Project Notes</div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            {saving ? <span>Saving…</span> : savedAt ? <span>Saved</span> : null}
            <Button variant="outline" className="h-8 px-2 text-xs" onClick={async () => {
              const html = sanitizeHtml(editor?.getHTML() || '')
              setSaving(true)
              setError(null)
              try {
                const res = await fetch(`/api/projects/${projectId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notesHtml: html }) })
                if (!res.ok) {
                  let msg = `Save failed (${res.status})`
                  try { const j = await res.json(); if (j?.error) msg = j.error } catch {}
                  throw new Error(msg)
                }
                setSavedAt(new Date())
              } catch (e: any) { setError(e?.message || 'Failed to save') } finally { setSaving(false) }
            }} disabled={saving}>Save</Button>
            <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => setFullscreen((v) => !v)}>{fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</Button>
          </div>
        </div>

        <div className="p-3 border-b border-white/10 sticky top-[41px] bg-white/[0.03] z-10">
          <div className="flex flex-wrap items-center gap-1">
            <TB label="B" onClick={() => editor?.chain().focus().toggleBold().run()} />
            <TB label={<span className="italic">I</span>} onClick={() => editor?.chain().focus().toggleItalic().run()} />
            <TB label={<span className="underline">U</span>} onClick={() => editor?.chain().focus().toggleUnderline().run()} />
            <Sep />
            <TB label="H2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} />
            <TB label="H3" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} />
            <TB label="• List" onClick={() => editor?.chain().focus().toggleBulletList().run()} />
            <TB label="1. List" onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
            <TB label="❝ Quote" onClick={() => editor?.chain().focus().toggleBlockquote().run()} />
            <TB label="Code" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} />
            <Sep />
            <TB label="Link" onClick={addLink} />
            <TB label="Unlink" onClick={removeLink} />
            <TB label="↺" onClick={() => editor?.chain().focus().undo().run()} />
            <TB label="↻" onClick={() => editor?.chain().focus().redo().run()} />
          </div>
        </div>

        <div className="p-3">
          {loading ? (
            <div className="text-sm text-white/60">Loading…</div>
          ) : (
            <div
              className="px-3 py-2 min-h-[260px] max-h-[65vh] overflow-auto text-sm leading-6 text-left text-white/80 rounded-md border border-white/10 bg-white/5 cursor-text"
              onClick={() => editor?.chain().focus().run()}
            >
              <EditorContent editor={editor} />
            </div>
          )}
          <div className="text-[11px] text-white/50 mt-2">Tip: Press Cmd/Ctrl+B/I/U for quick formatting.</div>
          {error && <div className="text-xs text-rose-300 mt-2">{error}</div>}
        </div>
      </div>
    </>
  )
}

function TB({ label, onClick }: { label: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="h-8 px-2 text-xs rounded border border-white/10 hover:bg-white/10" onClick={onClick}>
      {label}
    </button>
  )
}

function Sep() { return <div className="w-px h-5 bg-white/10 mx-1" /> }
