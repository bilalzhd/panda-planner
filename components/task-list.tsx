"use client"
import { Task, TaskPriority, TaskStatus } from '@prisma/client'

type TaskExtras = Task & {
  assignedTo?: { id: string; name: string | null; email: string | null; image: string | null } | null
  timesheets?: { hours: any }[]
}

export function TaskList({ tasks }: { tasks: TaskExtras[] }) {
  const rows = tasks.slice().sort((a, b) => {
    const pri = rankPriority(a.priority) - rankPriority(b.priority)
    if (pri !== 0) return pri
    const ad = (a.dueDate ? new Date(a.dueDate).getTime() : Infinity)
    const bd = (b.dueDate ? new Date(b.dueDate).getTime() : Infinity)
    return ad - bd
  })

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="grid grid-cols-12 text-xs text-white/60 px-3 py-2 border-b border-white/10">
        <div className="col-span-5">Title</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Priority</div>
        <div className="col-span-2">Due</div>
        <div className="col-span-1 text-right">Hrs</div>
      </div>
      <ul className="divide-y divide-white/10">
        {rows.map((t) => {
          const total = (t.timesheets || []).reduce((acc, x) => acc + Number(x.hours || 0), 0)
          return (
            <li key={t.id} className="grid grid-cols-12 items-center px-3 py-2 hover:bg-white/5">
              <div className="col-span-5 truncate">
                <div className="text-sm font-medium">{t.title}</div>
                {t.assignedTo && (
                  <div className="text-[11px] text-white/60">{t.assignedTo.name || t.assignedTo.email}</div>
                )}
              </div>
              <div className="col-span-2 text-xs">
                <StatusBadge value={t.status} />
              </div>
              <div className="col-span-2 text-xs">
                <PriorityBadge value={t.priority} />
              </div>
              <div className="col-span-2 text-xs">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</div>
              <div className="col-span-1 text-right text-xs">{formatHours(total)}</div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function StatusBadge({ value }: { value: TaskStatus }) {
  // Use Partial to be resilient if the Prisma enum isn't regenerated yet
  const map: Partial<Record<TaskStatus, string>> = {
    TODO: 'bg-white/10',
    IN_PROGRESS: 'bg-amber-500/20 text-amber-200',
    CLIENT_REVIEW: 'bg-sky-500/20 text-sky-200',
    DONE: 'bg-emerald-500/20 text-emerald-200',
  }
  const cls = map[value] || 'bg-white/10'
  return <span className={`px-1.5 py-0.5 rounded ${cls}`}>{value.replace('_', ' ')}</span>
}

function PriorityBadge({ value }: { value: TaskPriority }) {
  const map: Record<TaskPriority, string> = {
    HIGH: 'priority-high bg-rose-500/20 text-rose-200 border border-rose-500/30',
    MEDIUM: 'priority-medium bg-amber-500/20 text-amber-200 border border-amber-500/30',
    LOW: 'priority-low bg-emerald-500/20 text-emerald-200 border border-emerald-500/30',
  }
  return <span className={`px-1.5 py-0.5 rounded ${map[value]}`}>{value}</span>
}

function rankPriority(p?: TaskPriority | null) {
  if (p === 'HIGH') return 0
  if (p === 'MEDIUM') return 1
  return 2
}

function formatHours(h: number) {
  const hours = Math.floor(h)
  const minutes = Math.round((h - hours) * 60)
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`
}
