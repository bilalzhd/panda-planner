"use client"
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Task, TaskPriority } from '@prisma/client'

export function TaskCard({ task }: { task: Task & { projectId: string } }) {
  const priorityColor: Record<TaskPriority, string> = {
    LOW: 'text-emerald-300',
    MEDIUM: 'text-yellow-300',
    HIGH: 'text-rose-300',
  }
  return (
    <Link className='cursor-pointer' href={`/tasks/${task.id}`} draggable onDragStart={(e) => {
      e.dataTransfer.setData('text/task-id', task.id)
      e.dataTransfer.effectAllowed = 'move'
    }}>
      <div className="rounded-md border border-white/10 bg-white/5 p-3 hover:bg-white/10">
        <div className="flex items-center justify-between">
          <div className="font-medium">{task.title}</div>
          <Badge className={priorityColor[task.priority]}>{task.priority}</Badge>
        </div>
        {task.dueDate && (
          <div className="mt-2 text-xs text-white/60">Due {new Date(task.dueDate).toLocaleDateString()}</div>
        )}
      </div>
    </Link>
  )
}
