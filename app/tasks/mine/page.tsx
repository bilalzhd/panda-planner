import { prisma } from '@/lib/prisma'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import Link from 'next/link'
import { TaskList } from '@/components/task-list'

export const dynamic = 'force-dynamic'

async function getMyTasks() {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const tasks = await prisma.task.findMany({
    where: { project: { teamId: { in: teamIds } }, assignedToId: user.id },
    include: { project: true, assignedTo: true, timesheets: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
  return { tasks, user }
}

export default async function MyTasksPage() {
  const { tasks, user } = await getMyTasks()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your Tasks</h1>
        <div className="text-sm text-white/70">
          <Link href="/tasks" className="hover:text-white underline">View all tasks</Link>
        </div>
      </div>
      <TaskList tasks={tasks as any} />
      {tasks.length === 0 && (
        <div className="text-white/60">No tasks assigned to you yet.</div>
      )}
    </div>
  )
}

