import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Select } from '@/components/ui/select'

async function getTasks(status?: string) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  return prisma.task.findMany({
    where: { project: { teamId: { in: teamIds } }, status: status as any || undefined },
    include: { project: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
}

export default async function TasksPage({ searchParams }: { searchParams: { status?: string } }) {
  const tasks = await getTasks(searchParams.status)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">All Tasks</h1>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tasks.map((t) => (
          <Card key={t.id}>
            <CardHeader className="font-semibold flex items-center justify-between">
              <span>{t.title}</span>
              <Link className="text-sm text-white/70 hover:text-white" href={`/tasks/${t.id}`}>Open</Link>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-white/60">Project: {t.project.name}</div>
              {t.dueDate && <div className="text-xs text-white/60">Due {new Date(t.dueDate).toLocaleDateString()}</div>}
            </CardContent>
          </Card>
        ))}
        {tasks.length === 0 && <div className="text-white/60">No tasks found.</div>}
      </div>
    </div>
  )
}

