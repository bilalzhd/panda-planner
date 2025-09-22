import { prisma } from '@/lib/prisma'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import Link from 'next/link'
import { expandSchedules } from '@/lib/schedule'
import { TeamScheduleDialog } from '@/components/team-schedule-dialog'

export const dynamic = 'force-dynamic'

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x }

export default async function TodosPage() {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  if (teamIds.length === 0) return <div>No team found.</div>
  // Use the first/most recent team for now
  const teamId = teamIds[0]

  const today = startOfDay(new Date())

  const [members, tasks, schedules] = await Promise.all([
    prisma.membership.findMany({ where: { teamId }, include: { user: true }, orderBy: { createdAt: 'asc' } }),
    prisma.task.findMany({ where: { project: { teamId } }, include: { project: true } }),
    prisma.taskSchedule.findMany({ where: { task: { project: { teamId } } } }),
  ])

  const occToday = expandSchedules(schedules as any, today, today)
  const taskById = new Map(tasks.map((t) => [t.id, t]))
  const occByUser = new Map<string, { taskId: string; timeOfDay?: string | null; durationMin?: number | null }[]>()
  for (const o of occToday) {
    const t = taskById.get(o.taskId)
    if (t && t.dueDate && new Date(t.dueDate) < today) continue // don't show after due
    if (!occByUser.has(o.userId)) occByUser.set(o.userId, [])
    occByUser.get(o.userId)!.push({ taskId: o.taskId, timeOfDay: o.timeOfDay, durationMin: o.durationMin })
  }

  const tasksByUser = new Map<string, typeof tasks>()
  for (const m of members) {
    tasksByUser.set(
      m.userId,
      tasks.filter((t) => (t.assignedToId === m.userId)) as any
    )
  }

  function timeRangeLabel(time?: string | null, dur?: number | null) {
    if (!time) return null
    const [h, m] = time.split(':').map((x) => parseInt(x, 10))
    const start = new Date(0,0,0,h || 0,m || 0)
    const end = new Date(start.getTime() + (dur || 60) * 60000)
    const fmt = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    return `${fmt(start)}–${fmt(end)}`
  }

  // taskById defined above

  const taskOptions = tasks.map((t) => ({ id: t.id, title: t.title, projectName: t.project.name }))
  const userOptions = members.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Todos by User</h1>
        <TeamScheduleDialog tasks={taskOptions} users={userOptions} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {members.map((m) => {
          const assigned = tasksByUser.get(m.userId) || []
          const scheduled = (occByUser.get(m.userId) || [])
          const scheduledIds = new Set(scheduled.map((s) => s.taskId))
          const extraAssigned = assigned.filter((t) => !scheduledIds.has(t.id))
          const extraNotDone = extraAssigned.filter((t) => t.status !== 'DONE')
          const extraDone = extraAssigned.filter((t) => t.status === 'DONE')
          return (
            <div key={m.userId} className="rounded-lg border border-white/10 bg-white/5 p-3 min-h-[220px]">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold">{m.user.name || m.user.email || 'User'}</div>
                <div className="text-xs text-white/60">{(assigned.length)} tasks</div>
              </div>
              <div className="space-y-2">
                {scheduled.map((s, idx) => {
                  const t = taskById.get(s.taskId)
                  if (!t) return null
                  return (
                    <Link key={s.taskId+idx} href={`/tasks/${t.id}`} className="block rounded-md border border-amber-500/20 bg-amber-500/10 p-2 hover:bg-amber-500/15">
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="text-[11px] text-white/60">{t.project.name} · {timeRangeLabel(s.timeOfDay, s.durationMin) || 'Scheduled'}</div>
                    </Link>
                  )
                })}
                {extraNotDone.map((t) => (
                  <Link key={t.id} href={`/tasks/${t.id}`} className="block rounded-md border border-white/10 bg-white/5 p-2 hover:bg-white/10">
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="text-[11px] text-white/60">{t.project.name}</div>
                  </Link>
                ))}
                {extraDone.length > 0 && (
                  <div className="pt-1">
                    <div className="mb-1 text-[11px] uppercase tracking-wide text-white/50">Completed</div>
                    <div className="space-y-1.5">
                      {extraDone.map((t) => (
                        <Link key={t.id} href={`/tasks/${t.id}`} className="block rounded-md border border-white/10 bg-white/[0.03] p-2 opacity-70 hover:opacity-100 hover:bg-white/10">
                          <div className="text-sm">{t.title}</div>
                          <div className="text-[11px] text-white/60">{t.project.name}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {scheduled.length === 0 && assigned.length === 0 && (
                  <div className="text-xs text-white/60">No tasks for today.</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
