"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type Recipient = {
  id: string
  name: string | null
  email: string | null
  sharedProjects: string[]
  isSuperAdmin: boolean
}

type Message = {
  id: string
  content: string
  createdAt: string
  senderId: string
  sender: { id: string; name: string | null; email: string | null }
}

export function DirectMessages({
  initialRecipients,
  initialMessages,
  initialSelectedId,
  currentUserId,
}: {
  initialRecipients: Recipient[]
  initialMessages: Message[]
  initialSelectedId?: string
  currentUserId: string
}) {
  const [recipients, setRecipients] = useState(initialRecipients)
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || (initialRecipients[0]?.id ?? null))
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    const fetchMessages = async () => {
      if (selectedId === initialSelectedId) return
      setFetching(true)
      setError(null)
      try {
        const res = await fetch(`/api/messages?partnerId=${encodeURIComponent(selectedId)}`, { cache: 'no-store', signal: controller.signal })
        if (!res.ok) {
          throw new Error('Failed to load messages')
        }
        const data = await res.json()
        setMessages(Array.isArray(data?.messages) ? data.messages : [])
        if (Array.isArray(data?.sharedProjects)) {
          setRecipients((prev) =>
            prev.map((r) => (r.id === selectedId ? { ...r, sharedProjects: data.sharedProjects.map((p: any) => p?.name || '').filter((n: string) => !!n) } : r)),
          )
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setError(e?.message || 'Failed to load messages')
        }
      } finally {
        setFetching(false)
      }
    }
    fetchMessages()
    return () => controller.abort()
  }, [selectedId, initialSelectedId])

  async function refreshRecipients() {
    try {
      const res = await fetch('/api/messages/recipients', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to refresh recipients')
      const data = await res.json()
      setRecipients(Array.isArray(data?.recipients) ? data.recipients : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to refresh recipients')
    }
  }

  async function sendMessage() {
    if (!selectedId || !text.trim()) return
    setLoading(true)
    setError(null)
    const body = { receiverId: selectedId, content: text.trim() }
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        let msg = 'Failed to send'
        try {
          const data = await res.json()
          if (typeof data?.error === 'string') msg = data.error
        } catch {}
        throw new Error(msg)
      }
      const created: Message = await res.json()
      setMessages((prev) => [...prev, created])
      setText('')
    } catch (e: any) {
      setError(e?.message || 'Failed to send')
    } finally {
      setLoading(false)
    }
  }

  const selectedRecipient = recipients.find((r) => r.id === selectedId) || null

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <aside className="rounded-lg border border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <div className="text-sm font-semibold">Recipients</div>
          <Button variant="ghost" onClick={refreshRecipients}>Refresh</Button>
        </div>
        <ul className="max-h-[60vh] overflow-auto">
          {recipients.length === 0 && (
            <li className="px-3 py-4 text-sm text-white/60">No available recipients yet.</li>
          )}
          {recipients.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => { setSelectedId(r.id); setMessages([]); setError(null) }}
                className={`w-full text-left px-3 py-2 text-sm ${r.id === selectedId ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <div className="font-medium text-white/80">{r.name || r.email || 'User'}</div>
                <div className="text-xs text-white/50">{r.email}</div>
                {r.sharedProjects.length > 0 && (
                  <div className="mt-1 text-[11px] text-white/60">{r.sharedProjects.join(', ')}</div>
                )}
                {r.isSuperAdmin && (
                  <div className="mt-1 inline-flex items-center rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-200">Super Admin</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="rounded-lg border border-white/10 bg-white/[0.02] flex flex-col">
        <div className="border-b border-white/10 px-4 py-3">
          {selectedRecipient ? (
            <>
              <div className="text-sm font-semibold">{selectedRecipient.name || selectedRecipient.email || 'Conversation'}</div>
              {selectedRecipient.sharedProjects.length > 0 && (
                <div className="text-xs text-white/60">Shared projects: {selectedRecipient.sharedProjects.join(', ')}</div>
              )}
            </>
          ) : (
            <div className="text-sm text-white/60">Select a recipient to start messaging.</div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {error && <div className="text-xs text-rose-300">{error}</div>}
          {fetching && <div className="text-xs text-white/50">Loading conversation…</div>}
          {!fetching && messages.length === 0 && <div className="text-xs text-white/50">No messages yet.</div>}
          {messages.map((msg) => {
            const mine = msg.senderId === currentUserId
            return (
              <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg border px-3 py-2 ${mine ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-white/5 border-white/20'}`}>
                  <div className="mb-1 text-xs text-white/60 flex items-center gap-2">
                    {!mine && <span className="font-medium text-white/80">{msg.sender?.name || msg.sender?.email || 'User'}</span>}
                    <span className="ml-auto">{formatTime(msg.createdAt)}</span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="border-t border-white/10 p-3">
          <div className="space-y-2">
            <Textarea
              placeholder={selectedRecipient ? 'Type a message…' : 'Select a recipient to start typing'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!selectedRecipient || loading}
              rows={3}
              className="bg-white/5"
            />
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>{selectedRecipient ? 'Messages are visible to both participants.' : 'Pick someone to begin.'}</span>
              <Button onClick={sendMessage} disabled={!selectedRecipient || !text.trim() || loading}>
                {loading ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function formatTime(iso: string) {
  try {
    const dt = new Date(iso)
    return dt.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return iso
  }
}
