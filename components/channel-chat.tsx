"use client"
import { useEffect, useRef, useState } from 'react'
import { format, formatDistanceToNowStrict, isAfter, subHours } from 'date-fns'

type Message = {
  id: string
  content: string
  createdAt: string
  updatedAt?: string
  status?: 'sending' | 'delivered' | 'failed'
  author: { id: string; name: string | null; email: string | null; image: string | null }
}

export function ChannelChat({ channelId, initial, currentUser }: {
  channelId: string
  initial: Message[]
  currentUser: { id: string; name: string | null; email: string | null; image: string | null }
}) {
  const [items, setItems] = useState<Message[]>(initial)
  const [text, setText] = useState('')
  const viewportRef = useRef<HTMLDivElement>(null)

  function scrollToBottom() {
    const el = viewportRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  useEffect(() => { scrollToBottom() }, [])
  useEffect(() => { scrollToBottom() }, [items.length])

  function fmtTime(iso: string) {
    const dt = new Date(iso)
    const twentyFourAgo = subHours(new Date(), 24)
    if (isAfter(dt, twentyFourAgo)) return `${formatDistanceToNowStrict(dt)} ago`
    return format(dt, 'EEE, MMM d')
  }

  async function send() {
    const content = text.trim()
    if (!content) return
    setText('')
    const tempId = `tmp-${Date.now()}`
    const optimistic: Message = { id: tempId, content, createdAt: new Date().toISOString(), status: 'sending', author: currentUser }
    setItems((prev) => [...prev, optimistic])
    try {
      const res = await fetch(`/api/channels/${channelId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
      if (res.ok) {
        const created: Message = await res.json()
        created.status = 'delivered'
        setItems((prev) => prev.map((m) => (m.id === tempId ? created : m)))
      } else {
        setItems((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)))
      }
    } catch {
      setItems((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)))
    }
  }

  return (
    <div className="flex h-[60vh] md:h-[70vh] flex-col rounded-lg border border-white/10 bg-white/5">
      <div ref={viewportRef} className="flex-1 overflow-auto p-3 space-y-2">
        {items.map((m) => {
          const mine = m.author?.id === currentUser.id
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`${mine ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-white/10 border-white/20'} max-w-[80%] rounded-lg border px-3 py-2`}>
                <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                <div className="mt-1 text-[11px] text-white/60 text-right">
                  {fmtTime(m.createdAt)}
                  {m.status && (
                    <span className={`ml-2 ${m.status === 'failed' ? 'text-rose-300' : ''}`}>{m.status === 'sending' ? 'Sending…' : m.status === 'delivered' ? 'Delivered' : 'Failed'}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="border-t border-white/10 p-2">
        <div className="flex items-end gap-2">
          <textarea className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm" rows={2} placeholder="Type a message" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm disabled:opacity-50" disabled={!text.trim()} onClick={send}>Send</button>
        </div>
      </div>
    </div>
  )
}

