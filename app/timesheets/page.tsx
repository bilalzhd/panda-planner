import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TimesheetGrid } from '@/components/timesheet-grid'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import { expandSchedules } from '@/lib/schedule'
import { ScheduleDialog } from '@/components/schedule-dialog'
import { TimesheetToolbar } from '@/components/timesheet-toolbar'

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x }

export default async function TimesheetsPage({ searchParams }: { searchParams: { from?: string; to?: string; range?: string } }) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)

  const today = startOfDay(new Date())
  const range = searchParams.range || 'week'
  const defaultFrom = range === 'month' ? new Date(today.getFullYear(), today.getMonth(), 1) : startOfDay(addDays(today, -6))
  const defaultTo = range === 'month' ? new Date(today.getFullYear(), today.getMonth()+1, 0) : today
  const from = searchParams.from ? startOfDay(new Date(searchParams.from)) : defaultFrom
  const to = searchParams.to ? startOfDay(new Date(searchParams.to)) : defaultTo

  const [tasks, entries, schedules] = await Promise.all([
    prisma.task.findMany({ where: { project: { teamId: { in: teamIds } } }, include: { project: true } }),
    prisma.timesheet.findMany({ where: { userId: user.id, date: { gte: from, lte: to } } }),
    prisma.taskSchedule.findMany({ where: { userId: user.id, task: { project: { teamId: { in: teamIds } } } } }),
  ])

  // Expand schedules to occurrences in the range
  const occ = expandSchedules(schedules as any, from, to)
  const dates: string[] = []
  for (let d = new Date(from); d <= to; d = addDays(d, 1)) dates.push(d.toISOString().slice(0,10))

  // Build rows: tasks that have either an occurrence or at least one entry
  const taskIdsInRange = new Set<string>()
  occ.forEach((o) => taskIdsInRange.add(o.taskId))
  entries.forEach((e) => taskIdsInRange.add(e.taskId))
  const rows = tasks.filter((t) => taskIdsInRange.has(t.id)).map((t) => ({ id: t.id, title: t.title, projectName: t.project.name }))

  const days = dates.map((d) => ({ date: d, label: new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) }))
  const mappedEntries = entries.map((e) => ({ taskId: e.taskId, date: e.date.toISOString().slice(0,10), hours: Number(e.hours) }))
  const scheduledMap: Record<string, boolean> = {}
  occ.forEach((o) => { const key = `${o.taskId}:${o.date.toISOString().slice(0,10)}`; scheduledMap[key] = true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Timesheets</h1>
        <TimesheetToolbar from={from.toISOString()} to={to.toISOString()} range={(searchParams.range as any) === 'month' ? 'month' : 'week'} />
      </div>

      <Card>
        <CardHeader className="font-semibold">Your Time</CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/70">Use schedules to pre-fill tasks for this range.</div>
            <ScheduleDialog tasks={tasks.map((t) => ({ id: t.id, title: t.title, projectName: t.project.name }))} />
          </div>
          {rows.length === 0 && <div className="text-white/60">No tasks scheduled or logged in this range.</div>}
          <TimesheetGrid days={days} rows={rows} entries={mappedEntries} scheduled={scheduledMap} taskOptions={tasks.map((t) => ({ id: t.id, title: t.title, projectName: t.project.name }))} />

          <div className="text-xs text-white/60">Tip: click a cell and type e.g. 1:30 to log 1.5h. Use schedules to surface tasks in this range.</div>
        </CardContent>
      </Card>
    </div>
  )
}
