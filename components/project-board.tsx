"use client"
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Task, TaskPriority, TaskStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useRouter } from 'next/navigation'

type UserMini = { id: string; name: string | null; email: string | null; image: string | null }
type TaskExtras = Task & {
  assignedTo?: UserMini | null
  createdBy?: UserMini | null
  timesheets?: { hours: any }[]
}

type Props = {
  projectId: string
  initialTasks: TaskExtras[]
  readOnly?: boolean
  showClientLane?: boolean
}

export function ProjectBoard({ projectId, initialTasks, readOnly = false, showClientLane = false }: Props) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskExtras[]>(initialTasks)
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [due, setDue] = useState('')
  const [assignedToId, setAssignedToId] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [users, setUsers] = useState<{ id: string; name: string | null; email: string | null; image: string | null }[]>([])

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState<TaskExtras | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/users', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => {})
  }, [])

  const columns = useMemo(() => {
    const map: any = {
      TODO: tasks.filter((t) => t.status === 'TODO'),
      IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS'),
      CLIENT_REVIEW: tasks.filter((t) => (t as any).status === 'CLIENT_REVIEW'),
      DONE: tasks.filter((t) => t.status === 'DONE'),
    }
    return map as Record<TaskStatus, TaskExtras[]>
  }, [tasks])

  // Only surface the Client Approval column when it's relevant: either
  // a client is viewing (readOnly mode) or there are tasks in that lane.
  const hasClientReview = useMemo(() => tasks.some((t) => (t as any).status === 'CLIENT_REVIEW'), [tasks])
  const visibleStatuses = useMemo(() => {
    const list: TaskStatus[] = ['TODO', 'IN_PROGRESS'] as any
    if (readOnly || showClientLane || hasClientReview) list.push('CLIENT_REVIEW' as any)
    list.push('DONE')
    return list
  }, [readOnly, showClientLane, hasClientReview])

  async function moveTask(taskId: string, status: TaskStatus) {
    if (readOnly) return
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)))
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    startTransition(() => router.refresh())
  }

  async function createTask() {
    if (readOnly || !title.trim()) return
    setCreating(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status: 'TODO',
        dueDate: due ? new Date(due).toISOString() : undefined,
        assignedToId: assignedToId || undefined,
      }),
    })
    setCreating(false)
    if (res.ok) {
      const t: TaskExtras = await res.json()
      setTasks((prev) => [t, ...prev])
      setOpen(false)
      setTitle('')
      setDescription('')
      setPriority('MEDIUM')
      setDue('')
      setAssignedToId('')
      startTransition(() => router.refresh())
    }
  }

  async function quickAdd(title: string, status: TaskStatus) {
    if (readOnly) return
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, projectId, status }),
    })
    if (res.ok) {
      const t: TaskExtras = await res.json()
      setTasks((prev) => [t, ...prev])
      startTransition(() => router.refresh())
    }
  }

  useEffect(() => {
    function onEdit(ev: any) {
      const id = ev?.detail?.taskId as string
      const task = tasks.find((t) => t.id === id)
      if (task) openEdit(task)
    }
    window.addEventListener('board:edit' as any, onEdit)
    return () => window.removeEventListener('board:edit' as any, onEdit)
  }, [tasks])

  function openEdit(task: TaskExtras) {
    setSelected(task)
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!selected) return
    setSaving(true)
    const res = await fetch(`/api/tasks/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: selected.title,
        description: selected.description,
        priority: selected.priority,
        status: selected.status,
        dueDate: selected.dueDate ? new Date(selected.dueDate).toISOString() : undefined,
        assignedToId: selected.assignedTo?.id || null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === selected.id ? selected : t)))
      setEditOpen(false)
      startTransition(() => router.refresh())
    }
  }

  async function deleteSelected() {
    if (!selected) return
    const ok = window.confirm('Delete this task? This cannot be undone.')
    if (!ok) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${selected.id}`, { method: 'DELETE' })
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== selected.id))
        setEditOpen(false)
        startTransition(() => router.refresh())
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`grid gap-4 ${visibleStatuses.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
      {visibleStatuses.map((status) => (
        <Column
          key={status}
          status={status}
          title={friendly(status)}
          count={columns[status].length}
          projectId={projectId}
          onDropTask={(id) => moveTask(id, status)}
          onAdd={() => setOpen(true)}
          onCreated={() => startTransition(() => router.refresh())}
          onQuickAdd={quickAdd}
          readOnly={readOnly}
        >
          {columns[status].map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              onDeleted={(id) => {
                setTasks((prev) => prev.filter((x) => x.id !== id))
                startTransition(() => router.refresh())
              }}
              readOnly={readOnly}
            />
          ))}
        </Column>
      ))}

      {!readOnly && (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>New Task</DialogHeader>
        <div className="grid gap-2">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm text-white/80">
            Priority
            <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </Select>
          </label>
          <label className="text-sm text-white/80">
            Due Date
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label className="text-sm text-white/80 col-span-2">
            Assignee
            <Select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </Select>
          </label>
        </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={createTask} disabled={creating}>{creating ? 'Creating...' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>) }

      {/* Edit Task Dialog */}
      {!readOnly && (
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogHeader>Edit Task</DialogHeader>
        {selected && (
          <div className="grid gap-2">
            <Input value={selected.title} onChange={(e) => setSelected({ ...selected, title: e.target.value })} />
            <Textarea value={selected.description || ''} onChange={(e) => setSelected({ ...selected, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-white/80">
                Status
                <Select value={selected.status} onChange={(e) => setSelected({ ...selected, status: e.target.value as TaskStatus })}>
                  <option value="TODO">TODO</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="CLIENT_REVIEW">CLIENT_REVIEW</option>
                  <option value="DONE">DONE</option>
                </Select>
              </label>
              <label className="text-sm text-white/80">
                Priority
                <Select value={selected.priority} onChange={(e) => setSelected({ ...selected, priority: e.target.value as TaskPriority })}>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </Select>
              </label>
              <label className="text-sm text-white/80">
                Due Date
                <Input type="date" value={selected.dueDate ? new Date(selected.dueDate).toISOString().slice(0,10) : ''} onChange={(e) => setSelected({ ...selected, dueDate: e.target.value ? new Date(e.target.value) as any : null })} />
              </label>
              <label className="text-sm text-white/80">
                Assignee
                <Select value={selected.assignedTo?.id || ''} onChange={(e) => setSelected({ ...selected, assignedTo: { ...(selected.assignedTo || {}), id: e.target.value } as any })}>
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                  ))}
                </Select>
              </label>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            className="border-red-500/40 text-red-400 hover:text-red-300"
            onClick={deleteSelected}
            disabled={saving}
          >
            {saving ? 'Deleting...' : 'Delete'}
          </Button>
          <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={saveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </Dialog>) }
    </div>
  )
}

function Column({ title, count, status, projectId, onDropTask, onAdd, onCreated, onQuickAdd, children, readOnly }: {
  title: string
  count: number
  status: TaskStatus
  projectId: string
  onDropTask: (taskId: string) => void
  onAdd: () => void
  onCreated: () => void
  onQuickAdd: (title: string, status: TaskStatus) => Promise<void> | void
  children: React.ReactNode
  readOnly: boolean
}) {
  const [hover, setHover] = useState(false)
  const [dragDepth, setDragDepth] = useState(0)
  const [quick, setQuick] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return
      if (menuRef.current.contains(e.target as Node)) return
      setMenuOpen(false)
    }
    if (menuOpen) {
      document.addEventListener('click', onDocClick)
      return () => document.removeEventListener('click', onDocClick)
    }
  }, [menuOpen])

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between p-3 border-b border-white/10 relative">
        <div className="text-sm font-semibold tracking-wide">{title}</div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span>{count}</span>
          {!readOnly && <button className="rounded-full border border-white/20 px-2 py-0.5 hover:bg-white/10" onClick={() => setMenuOpen((v) => !v)} aria-label="Column options">{gearIcon}</button>}
          {!readOnly && <button className="rounded-full border border-white/20 px-2 py-0.5 hover:bg-white/10" onClick={onAdd} aria-label="New task">+</button>}
        </div>
        {menuOpen && (
          <div ref={menuRef} className="absolute right-2 top-10 z-10 w-40 rounded-md border border-white/10 bg-[#12151b] text-xs shadow-lg">
            <button className="block w-full px-3 py-2 text-left hover:bg-white/10" onClick={() => setMenuOpen(false)}>Sort by priority</button>
            <button className="block w-full px-3 py-2 text-left hover:bg-white/10" onClick={() => setMenuOpen(false)}>Collapse column</button>
          </div>
        )}
      </div>
      <div className="px-3 pt-3">
        <input
          placeholder="Quick add..."
          className="mb-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={async (e) => {
            if (!readOnly && e.key === 'Enter' && quick.trim()) {
              // create minimal task in this column
              const title = quick.trim()
              setQuick('')
              await onQuickAdd(title, status)
              onCreated()
            }
          }}
          disabled={readOnly}
        />
      </div>
      <div
        className={`p-3 space-y-2 min-h-[200px] transition-colors rounded-md border-2 border-dashed ${hover ? 'border-white/40 bg-white/[0.03]' : 'border-transparent'}`}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragDepth((d) => d + 1)
          setHover(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!hover) setHover(true)
        }}
        onDragLeave={() => {
          setDragDepth((d) => {
            const n = d - 1
            if (n <= 0) setHover(false)
            return Math.max(0, n)
          })
        }}
        onDrop={(e) => {
          const id = e.dataTransfer.getData('text/task-id')
          if (id) onDropTask(id)
          setHover(false)
          setDragDepth(0)
        }}
      >
        {children}
      </div>
    </div>
  )
}

function TaskRow({ task, onDeleted, readOnly }: { task: TaskExtras; onDeleted?: (id: string) => void; readOnly?: boolean }) {
  const totalHours = (task.timesheets || []).reduce((acc, t) => acc + Number(t.hours || 0), 0)
  const [drag, setDrag] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const initials = useMemo(() => {
    const n = task.assignedTo?.name || task.assignedTo?.email || ''
    const parts = n.split(' ')
    const i = (parts[0]?.[0] || '') + (parts[1]?.[0] || '')
    return i.toUpperCase() || 'U'
  }, [task.assignedTo])

  return (
    <div
      draggable={!readOnly}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/task-id', task.id)
        e.dataTransfer.effectAllowed = 'move'
        setDrag(true)
      }}
      onDragEnd={() => setDrag(false)}
      onClick={() => {
        // dispatch a custom event the board listens to via window for simplicity
        if (!readOnly) {
          const ev = new CustomEvent('board:edit', { detail: { taskId: task.id } })
          window.dispatchEvent(ev)
        }
      }}
      className={`rounded-md border border-white/10 bg-white/5 hover:bg-white/10 transition-opacity ${drag ? 'opacity-60' : ''}`}
    >
      <div className="p-3 cursor-pointer">
        <div className="font-medium text-sm">{task.title}</div>
        {task.description && (
          <div className="text-xs text-white/60 line-clamp-2 mt-1">{task.description}</div>
        )}
        <div className="mt-2 flex items-center justify-between text-[11px] text-white/60">
          <div className="flex items-center gap-3">
            <span>Priority: {task.priority}</span>
            {task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>}
            <span className="rounded bg-white/10 px-1.5 py-0.5">{formatHours(totalHours)}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* task.createdBy && (
              <span className="text-[10px] text-white/50" title={`Added by ${task.createdBy.name || task.createdBy.email}`}>
                by {task.createdBy.name || task.createdBy.email}
              </span>
            )*/}
            {task.assignedTo?.image ? (
              <img src={task.assignedTo.image} alt={task.assignedTo.name || 'User'} className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">{initials}</span>
            )}
            {!readOnly && (
            <button
              type="button"
              className="rounded-full border border-white/20 px-2 py-0.5 hover:bg-white/10"
              title="Delete task"
              aria-label="Delete task"
              onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                if (deleting) return
                const ok = window.confirm('Delete this task?')
                if (!ok) return
                try {
                  setDeleting(true)
                  const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
                  if (res.ok) {
                    onDeleted?.(task.id)
                  } else {
                    const msg = await res.text().catch(() => '')
                    alert(msg || 'Failed to delete task')
                  }
                } finally {
                  setDeleting(false)
                }
              }}
            >
              {trashIcon}
            </button>
            )}
          </div>
        </div>
        {readOnly && (task as any).status === 'CLIENT_REVIEW' && (
          <div className="mt-2 flex items-center gap-2">
            <button
              className="rounded px-2 py-0.5 text-xs border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10"
              onClick={async (e) => {
                e.stopPropagation()
                await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DONE' }) })
              }}>Approve</button>
            <button
              className="rounded px-2 py-0.5 text-xs border border-rose-400/40 text-rose-300 hover:bg-rose-500/10"
              onClick={async (e) => {
                e.stopPropagation()
                await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'TODO' }) })
              }}>Needs changes</button>
          </div>
        )}
      </div>
    </div>
  )
}

function friendly(s: TaskStatus) {
  if (s === 'TODO') return 'TODO'
  if (s === 'IN_PROGRESS') return 'IN PROGRESS'
  if ((s as any) === 'CLIENT_REVIEW') return 'CLIENT APPROVAL'
  return 'COMPLETED'
}

const gearIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M19.4 15a7.97 7.97 0 0 0 .2-1 7.97 7.97 0 0 0-.2-1l2.1-1.6-2-3.4-2.5.8a8.2 8.2 0 0 0-1.8-1l-.4-2.6H11l-.4 2.6a8.2 8.2 0 0 0-1.8 1l-2.5-.8-2 3.4L3.4 13a7.97 7.97 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-.8c.6.4 1.2.8 1.8 1l.4 2.6H13l.4-2.6c.6-.2 1.2-.6 1.8-1l2.5.8 2-3.4L19.4 15Z" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

const trashIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6h18" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

function formatHours(h: number) {
  const hours = Math.floor(h)
  const minutes = Math.round((h - hours) * 60)
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`
}

// Wire up edit-clicks by listening to custom events and opening the dialog.
if (typeof window !== 'undefined') {
  ;(window as any).__board_ready__ = true
}
