import { prisma } from '@/lib/prisma'
import { timesheetSchema } from '@/lib/validators'
import { NextRequest } from 'next/server'
import { requireUser, projectWhereForUser, ensureProjectPermission } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const { user } = await requireUser()
  const projectWhere = await projectWhereForUser(user.id)
  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId') || undefined
  const userId = searchParams.get('userId') || undefined
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const timesheets = await prisma.timesheet.findMany({
    where: {
      task: { project: projectWhere },
      taskId,
      userId,
      date: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
    },
    include: { task: { include: { project: true } }, user: true },
    orderBy: { date: 'desc' },
  })
  return Response.json(timesheets)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = timesheetSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.format() }, { status: 400 })
  const { user } = await requireUser()
  const projectWhere = await projectWhereForUser(user.id)
  const task = await prisma.task.findFirst({ where: { id: parsed.data.taskId, project: projectWhere } })
  if (!task) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const canEdit = await ensureProjectPermission(user, task.projectId, 'EDIT')
  if (!canEdit) return Response.json({ error: 'Read-only access' }, { status: 403 })
  const { date, ...rest } = parsed.data
  const ts = await prisma.timesheet.create({ data: { ...rest, userId: rest.userId || user.id, date: new Date(date) } })
  return Response.json(ts, { status: 201 })
}
