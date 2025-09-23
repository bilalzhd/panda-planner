import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { TaskCard } from '@/components/task-card'
import { KanbanBoard } from '@/components/kanban-board'
import { requireUser, projectWhereForUser } from '@/lib/tenant'
import { Progress } from '@/components/ui/progress'

export const dynamic = 'force-dynamic'

async function getData() {
  const { user } = await requireUser()
  const projectWhere = await projectWhereForUser(user.id)
  const [projects, tasksToday, allTasks, timesheets] = await Promise.all([
    prisma.project.findMany({ where: projectWhere, orderBy: { createdAt: 'desc' } }),
    prisma.task.findMany({
      where: {
        project: projectWhere,
        dueDate: {
          gte: new Date(new Date().toDateString()),
          lt: new Date(new Date().setDate(new Date().getDate() + 1)),
        },
      },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.task.findMany({ where: { project: projectWhere }, orderBy: { createdAt: 'desc' } }),
    prisma.timesheet.findMany({ where: { task: { project: projectWhere } } }),
  ])
  return { projects, tasksToday, allTasks, timesheets, user }
}

export default async function DashboardPage() {
  const { projects, tasksToday, allTasks, timesheets, user } = await getData()
  const projectById = Object.fromEntries(projects.map((p) => [p.id, p]))
  const startOfToday = new Date(new Date().toDateString())
  const startOfTomorrow = new Date(new Date(startOfToday).setDate(startOfToday.getDate() + 1))
  // Your upcoming = your non-done tasks with dueDate today or later
  const prRank = (p?: string | null) => (p === 'HIGH' ? 0 : p === 'MEDIUM' ? 1 : 2)
  const yourUpcoming = allTasks
    .filter((t) => t.assignedToId === user.id && t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) >= startOfToday)
    .sort((a, b) => {
      const pa = prRank((a as any).priority)
      const pb = prRank((b as any).priority)
      if (pa !== pb) return pa - pb
      return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()
    })
  const overdueYours = allTasks
    .filter((t) => t.assignedToId === user.id && t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < startOfToday)
    .sort((a, b) => {
      const pa = prRank((a as any).priority)
      const pb = prRank((b as any).priority)
      if (pa !== pb) return pa - pb
      return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()
    })
  const openTasks = allTasks.filter((t) => (t as any).status === 'TODO').length
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
          <CardHeader className="font-semibold">Open Tasks</CardHeader>
          <CardContent><div className="text-3xl font-semibold">{openTasks}</div></CardContent>
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
          <CardHeader className="font-semibold">Your Upcoming Tasks</CardHeader>
          <CardContent>
            {yourUpcoming.length === 0 && (
              <div className="flex h-40 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60">No upcoming tasks</div>
            )}
            {yourUpcoming.length > 0 && (
              <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {yourUpcoming
                  .slice()
                  .slice(0, 9)
                  .map((t) => (
                    <TaskCard key={t.id} task={t as any} projectName={projectById[(t as any).projectId]?.name} />
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Right sidebar column stacking Upcoming + Progress to avoid layout breaks */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="font-semibold">Overdue Tasks</CardHeader>
            <CardContent>
              {overdueYours.length === 0 && (
                <div className="flex h-32 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60">No overdue tasks 🎉</div>
              )}
              {overdueYours.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  {overdueYours.slice(0, 6).map((t) => (<TaskCard key={t.id} task={t as any} />))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="font-semibold">Tasks Due Today</CardHeader>
            <CardContent>
              {tasksToday.length === 0 && (
                <div className="flex h-40 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60">No tasks due today</div>
              )}
              {tasksToday.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  {tasksToday
                    .slice()
                    .sort((a, b) => {
                      // Priority first, then ownership, then due time
                      const pa = prRank((a as any).priority)
                      const pb = prRank((b as any).priority)
                      if (pa !== pb) return pa - pb
                      const ownRank = (t: any) => (t.assignedToId === user.id ? 0 : t.assignedToId == null ? 1 : 2)
                      const ra = ownRank(a)
                      const rb = ownRank(b)
                      if (ra !== rb) return ra - rb
                      // Secondary: earlier due dates first
                      return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()
                    })
                    .slice(0, 6)
                    .map((t) => (<TaskCard key={t.id} task={t as any} />))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="font-semibold">Project Progress</CardHeader>
            <CardContent className="min-h-40">
              {projects.length === 0 && <div className="text-sm text-white/60">No projects</div>}
              {projects.slice(0, 3).map((p) => {
                const tasks = allTasks.filter((t) => t.projectId === p.id)
                const done = tasks.filter((t) => t.status === 'DONE').length
                const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0
                return (
                  <div key={p.id} className="mb-3">
                    <div className="mb-1 text-sm flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: (p.color || '#9ca3af') as any }} />
                      <span>{p.name}</span>
                      <span className="text-white/50">{pct}%</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">Global To-Do</div>
        <KanbanBoard tasks={allTasks as any} currentUserId={user.id} limitPerColumn={5} showViewAllLinks />
      </div>

      {/* Invite form moved to Team page */}
    </div>
  )
}
