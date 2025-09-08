"use client"
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader } from '@/components/ui/dialog'

type MediaItem = {
  name: string
  path: string
  size: number | null
  updatedAt?: string | null
  url: string
  label?: string | null
  description?: string | null
}

export function ProjectMedia({ projectId, limit }: { projectId: string; limit?: number }) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/media`, { cache: 'no-store' })
    setLoading(false)
    if (res.ok) setItems(await res.json())
  }
  useEffect(() => { load() }, [projectId])

  async function upload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.set('file', file)
    if (label.trim()) fd.set('label', label.trim())
    if (description.trim()) fd.set('description', description.trim())
    setUploading(true)
    const res = await fetch(`/api/projects/${projectId}/media`, { method: 'POST', body: fd })
    setUploading(false)
    if (res.ok) {
      setOpen(false)
      fileRef.current && (fileRef.current.value = '')
      setLabel('')
      setDescription('')
      load()
    }
  }

  async function remove(path: string) {
    const ok = window.confirm('Delete this file? This cannot be undone.')
    if (!ok) return
    const res = await fetch(`/api/projects/${projectId}/media?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
    if (res.ok) setItems((prev) => prev.filter((x) => x.path !== path))
  }

  const displayed = limit ? items.slice(0, limit) : items

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="text-sm font-semibold tracking-wide">Project Media</div>
        <div className="flex items-center gap-2">
          {typeof limit === 'number' && items.length > (limit || 0) && (
            <a href={`/projects/${projectId}/media`} className="text-xs text-white/70 hover:text-white">View all</a>
          )}
          <Button variant="outline" onClick={() => setOpen(true)}>Upload</Button>
        </div>
      </div>
      <div className="p-3">
        {loading && <div className="text-sm text-white/60">Loading...</div>}
        {!loading && items.length === 0 && <div className="text-sm text-white/60">No media files yet.</div>}
        {!loading && items.length > 0 && (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {displayed.map((m) => (
              <li key={m.path} className="rounded-md border border-white/10 bg-white/5 p-0 overflow-hidden text-sm">
                <Preview url={m.url} name={m.name} />
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium hover:underline truncate"
                      title={m.label || m.name}
                    >
                      {m.label || m.name}
                    </a>
                    <button
                      type="button"
                      className="text-xs rounded border border-white/20 px-2 py-0.5 hover:bg-white/10"
                      onClick={() => remove(m.path)}
                    >Delete</button>
                  </div>
                  {m.description && <div className="text-xs text-white/80 mt-1 line-clamp-2">{m.description}</div>}
                  <div className="text-[11px] text-white/50 mt-1">
                    <span className="truncate" title={m.name}>{m.name}</span>
                    <span>
                      {(m.size ? ` • ${formatSize(m.size)}` : '')}
                      {m.updatedAt ? ` • ${new Date(m.updatedAt).toLocaleDateString()}` : ''}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>Upload Media</DialogHeader>
        <div className="p-3">
          <input ref={fileRef} type="file" className="block w-full text-sm" />
          <div className="grid grid-cols-1 gap-2 mt-3">
            <label className="text-xs text-white/80">
              Name (optional)
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Roof blueprint, Signed contract"
                className="mt-1 block w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </label>
            <label className="text-xs text-white/80">
              Description (optional)
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short note about this file..."
                rows={3}
                className="mt-1 block w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </label>
          </div>
          <div className="text-xs text-white/60 mt-2">Any file type (images, PDFs, docs, etc.)</div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={upload} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function formatSize(n: number) {
  if (n < 1024) return n + ' B'
  if (n < 1024*1024) return (n/1024).toFixed(1) + ' KB'
  if (n < 1024*1024*1024) return (n/(1024*1024)).toFixed(1) + ' MB'
  return (n/(1024*1024*1024)).toFixed(1) + ' GB'
}

function Preview({ url, name }: { url: string; name: string }) {
  const ext = (name.split('.').pop() || '').toLowerCase()
  const isImg = ['jpg','jpeg','png','gif','webp','bmp','svg'].includes(ext)
  const isPdf = ext === 'pdf'
  return (
    <div className="bg-black/10">
      {isImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-36 w-full object-cover" />
      ) : isPdf ? (
        <div className="h-36 w-full flex items-center justify-center text-xs text-white/70">PDF preview</div>
      ) : (
        <div className="h-36 w-full flex items-center justify-center text-xs text-white/70 uppercase">{ext || 'file'}</div>
      )}
    </div>
  )
}
