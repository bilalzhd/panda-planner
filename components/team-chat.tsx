"use client"
import { useEffect, useRef, useState, useTransition } from 'react'

type Message = {
  id: string
  content: string
  createdAt: string
  updatedAt?: string
  status?: 'sending' | 'delivered' | 'failed'
  author: { id: string; name: string | null; email: string | null; image: string | null }
  reads?: { user: { id: string; name: string | null; email: string | null } }[]
}

export function TeamChat({ teamId, initial, canPost = true, currentUserId, currentUser }: {
  teamId: string
  initial: Message[]
  canPost?: boolean
  currentUserId?: string
  currentUser?: { id: string; name: string | null; email: string | null; image: string | null }
}) {
  const [items, setItems] = useState<Message[]>([...initial].sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()))
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [isPending, startTransition] = useTransition()
  const listRef = useRef<HTMLDivElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  function scrollToBottom(){ const el = listRef.current; if (el) el.scrollTop = el.scrollHeight }
  useEffect(()=>{ scrollToBottom() },[])
  useEffect(()=>{ scrollToBottom() },[items.length])

  // Mark messages as read for the current user (those they didn't author)
  useEffect(()=>{
    if (!currentUserId) return
    const unread = items.filter(m => m.author?.id !== currentUserId && !(m.reads||[]).some(r => r.user.id === currentUserId)).map(m=>m.id)
    if (unread.length === 0) return
    fetch('/api/messages/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: unread }) })
      .then(() => {
        setItems(prev => prev.map(m => unread.includes(m.id) ? { ...m, reads: [ ...(m.reads||[]), { user: { id: currentUserId, name: currentUser?.name || null, email: currentUser?.email || null } } ] } : m))
      })
      .catch(()=>{})
  }, [items, currentUserId])

  async function send() {
    if (sending) return
    const content = text.trim()
    if (!content) return
    setText('')
    setSending(true)
    // Optimistic: insert a temp message immediately
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      status: 'sending',
      author: currentUser || { id: currentUserId || 'me', name: null, email: null, image: null },
    }
    setItems((prev) => [...prev, optimistic])

    // Send to server in background
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, content }),
      })
      if (res.ok) {
        const created: Message = await res.json()
        created.status = 'delivered'
        setItems((prev) => prev.map((m) => (m.id === tempId ? created : m)))
      } else {
        setItems((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)))
      }
    } catch {
      setItems((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)))
    } finally {
      setSending(false)
    }
  }

  async function saveEdit(id: string) {
    const content = editingText.trim()
    if (!content) return setEditingId(null)
    const res = await fetch(`/api/messages/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
    if (res.ok) {
      const updated: Message = await res.json()
      setItems((prev) => prev.map((m) => (m.id === id ? updated : m)))
      setEditingId(null)
      setEditingText('')
    }
  }

  function fmtRelative(iso: string) {
    const dt = new Date(iso)
    const now = Date.now()
    const diff = now - dt.getTime()
    const day = 24*60*60*1000
    if (diff < day) {
      const mins = Math.max(1, Math.round(diff/60000))
      if (mins < 60) return `${mins} minute${mins>1?'s':''} ago`
      const hrs = Math.round(mins/60)
      return `${hrs} hour${hrs>1?'s':''} ago`
    }
    return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex h-[60vh] md:h-[70vh] flex-col rounded-lg border border-white/10 bg-white/5">
      <div ref={listRef} className="flex-1 overflow-auto p-3 space-y-2">
        {items.length === 0 && <div className="px-3 py-6 text-sm text-white/60">No messages yet.</div>}
        {items.map((m) => {
          const mine = m.author?.id === currentUserId
          const readers = (m.reads || []).map(r => r.user).filter(u => u.id !== m.author?.id)
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`${mine ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-white/10 border-white/20'} max-w-[80%] rounded-lg border px-3 py-2`}>
                <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
                  {!mine && (
                    <>
                      {m.author?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.author.image} alt="" className="h-5 w-5 rounded-full object-cover" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">{(m.author?.name||m.author?.email||'U').slice(0,2).toUpperCase()}</div>
                      )}
                      <span className="font-medium text-white/80">{m.author?.name || m.author?.email || 'User'}</span>
                    </>
                  )}
                  <span className="ml-auto">{fmtRelative(m.createdAt)}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                {mine && readers.length > 0 && (
                  <div className="mt-1 text-[11px] text-white/60 text-right">Seen by {readers.map(u=>u.name||u.email||'User').slice(0,3).join(', ')}{readers.length>3?` +${readers.length-3}`:''}</div>
                )}
                {m.status && (
                  <div className={`mt-1 text-[11px] ${m.status === 'failed' ? 'text-rose-300' : 'text-white/50'} text-right`}>
                    {m.status === 'sending' ? 'Sending…' : m.status === 'delivered' ? 'Delivered' : 'Failed to send'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {canPost && (
        <div className="border-t border-white/10 p-2">
          <div className="flex items-end gap-2">
            <textarea
              className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
              rows={2}
              placeholder="Type a message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (text.trim()) void send()
                }
              }}
            />
            <button
              aria-label="Send"
              className={`rounded-md border px-3 py-2 text-sm disabled:opacity-50 flex items-center justify-center ${text.trim() && !sending ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200' : 'border-white/10 bg-white/10 text-white/60'}`}
              disabled={!text.trim() || sending}
              onClick={send}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12l18-9-7 18-2-7-9-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
