"use client"
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Task, TaskPriority } from '@prisma/client'

export function TaskCard({ task, projectName }: { task: Task & { projectId: string }, projectName?: string }) {
  const priorityClass: Record<TaskPriority, string> = {
    // Stronger backgrounds for visibility; themed via globals.css for light mode
    HIGH: 'priority-high border border-rose-500/30 bg-rose-500/20 text-rose-200',
    MEDIUM: 'priority-medium border border-amber-500/30 bg-amber-500/20 text-amber-200',
    LOW: 'priority-low border border-emerald-500/30 bg-emerald-500/20 text-emerald-200',
  }
  return (
    <Link className='cursor-pointer' href={`/tasks/${task.id}`} draggable onDragStart={(e) => {
      e.dataTransfer.setData('text/task-id', task.id)
      e.dataTransfer.effectAllowed = 'move'
    }}>
      <div className="h-full rounded-md border border-white/10 bg-white/5 p-3 hover:bg-white/10">
        <div className="flex items-center justify-between">
          <div className="font-medium">{task.title}</div>
          <Badge className={priorityClass[task.priority]}>{task.priority}</Badge>
        </div>
        {projectName && (
          <div className="mt-1 text-xs text-white/50">{projectName}</div>
        )}
        {task.dueDate && (
          <div className="mt-2 text-xs text-white/60">Due {new Date(task.dueDate).toLocaleDateString()}</div>
        )}
      </div>
    </Link>
  )
}
