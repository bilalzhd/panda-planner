import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { TaskCard } from '@/components/task-card'
import { KanbanBoard } from '@/components/kanban-board'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import { Progress } from '@/components/ui/progress'

export const dynamic = 'force-dynamic'

async function getData() {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const [projects, tasksToday, allTasks, timesheets] = await Promise.all([
    prisma.project.findMany({ where: { teamId: { in: teamIds } }, orderBy: { createdAt: 'desc' } }),
    prisma.task.findMany({
      where: {
        project: { teamId: { in: teamIds } },
        dueDate: {
          gte: new Date(new Date().toDateString()),
          lt: new Date(new Date().setDate(new Date().getDate() + 1)),
        },
      },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.task.findMany({ where: { project: { teamId: { in: teamIds } } }, orderBy: { createdAt: 'desc' } }),
    prisma.timesheet.findMany({ where: { task: { project: { teamId: { in: teamIds } } } } }),
  ])
  return { projects, tasksToday, allTasks, timesheets }
}

export default async function DashboardPage() {
  const { projects, tasksToday, allTasks, timesheets } = await getData()
  const { personalTeam } = await requireUser()
  const totalTasks = allTasks.length
  const doneThisWeek = allTasks.filter((t) => t.status === 'DONE' && t.updatedAt > new Date(Date.now() - 7*24*3600*1000)).length
  const hoursLogged = timesheets.reduce((acc, t) => acc + Number(t.hours), 0)
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="font-semibold">Active Projects</CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="font-semibold">Total Tasks</CardHeader>
          <CardContent><div className="text-3xl font-semibold">{totalTasks}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="font-semibold">Completed This Week</CardHeader>
          <CardContent><div className="text-3xl font-semibold">{doneThisWeek}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="font-semibold">Hours Logged</CardHeader>
          <CardContent><div className="text-3xl font-semibold">{hoursLogged.toFixed(2)}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="font-semibold">Tasks Due Today</CardHeader>
          <CardContent>
            {tasksToday.length === 0 && (
              <div className="flex h-40 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60">No tasks due today</div>
            )}
            {tasksToday.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tasksToday.map((t) => (<TaskCard key={t.id} task={t as any} />))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="font-semibold">Project Progress</CardHeader>
          <CardContent>
            {projects.length === 0 && <div className="text-sm text-white/60">No projects</div>}
            {projects.slice(0, 3).map((p) => {
              const tasks = allTasks.filter((t) => t.projectId === p.id)
              const done = tasks.filter((t) => t.status === 'DONE').length
              const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0
              return (
                <div key={p.id} className="mb-3">
                  <div className="mb-1 text-sm">{p.name} <span className="text-white/50">{pct}%</span></div>
                  <Progress value={pct} />
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">Global To-Do</div>
        <KanbanBoard tasks={allTasks as any} />
      </div>

      {/* Invite form moved to Team page */}
    </div>
  )
}
