"use client"
import { Task, TaskStatus } from '@prisma/client'
import { TaskCard } from '@/components/task-card'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function KanbanBoard({ tasks, currentUserId }: { tasks: Task[]; currentUserId?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function moveTask(taskId: string, status: TaskStatus) {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    startTransition(() => router.refresh())
  }

  const sortOwnFirst = (list: Task[]) => {
    if (!currentUserId) return list
    // Sort: current user's tasks first, then unassigned, then others
    return [...list].sort((a, b) => {
      const rank = (t: Task) => (t.assignedToId === currentUserId ? 0 : t.assignedToId == null ? 1 : 2)
      const ra = rank(a)
      const rb = rank(b)
      if (ra !== rb) return ra - rb
      // Secondary: most recently updated first to surface fresh items
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }

  const todo = sortOwnFirst(tasks.filter((t) => t.status === 'TODO'))
  const inprog = sortOwnFirst(tasks.filter((t) => t.status === 'IN_PROGRESS'))
  const done = sortOwnFirst(tasks.filter((t) => t.status === 'DONE'))

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <KanbanColumn title="To Do" status="TODO" onDrop={(id) => moveTask(id, 'TODO')}>
        {todo.map((t) => (<TaskCard key={t.id} task={t as any} />))}
      </KanbanColumn>
      <KanbanColumn title="In Progress" status="IN_PROGRESS" onDrop={(id) => moveTask(id, 'IN_PROGRESS')}>
        {inprog.map((t) => (<TaskCard key={t.id} task={t as any} />))}
      </KanbanColumn>
      <KanbanColumn title="Done" status="DONE" onDrop={(id) => moveTask(id, 'DONE')}>
        {done.map((t) => (<TaskCard key={t.id} task={t as any} />))}
      </KanbanColumn>
    </div>
  )
}

function KanbanColumn({ title, status, onDrop, children }: {
  title: string
  status: TaskStatus
  onDrop: (taskId: string) => void
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-lg border border-white/10 bg-white/5 p-3 min-h-[200px]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const id = e.dataTransfer.getData('text/task-id')
        if (id) onDrop(id)
      }}
    >
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )
}
