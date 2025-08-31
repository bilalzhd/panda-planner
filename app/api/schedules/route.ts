import { prisma } from '@/lib/prisma'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { user } = await requireUser()
  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId') || undefined
  const rules = await prisma.taskSchedule.findMany({
    where: {
      userId: user.id,
      taskId,
      task: { project: { teamId: { in: await teamIdsForUser(user.id) } } },
    },
    include: { task: { include: { project: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json(rules)
}

export async function POST(req: NextRequest) {
  const { user } = await requireUser()
  const body = await req.json()
  const taskId = String(body?.taskId || '')
  const isRecurring = !!body?.isRecurring
  const frequency = body?.frequency || null
  const byWeekday = body?.byWeekday ?? null
  const timeOfDay = body?.timeOfDay || null
  const durationMin = body?.durationMin ?? null
  const date = body?.date ? new Date(body.date) : null
  const startDate = body?.startDate ? new Date(body.startDate) : null
  const endDate = body?.endDate ? new Date(body.endDate) : null

  // Authorization: ensure the task belongs to one of the user's teams
  const task = await prisma.task.findFirst({ where: { id: taskId, project: { teamId: { in: await teamIdsForUser(user.id) } } } })
  if (!task) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const rule = await prisma.taskSchedule.create({
    data: { taskId, userId: user.id, isRecurring, frequency, byWeekday, timeOfDay, durationMin, date, startDate, endDate },
  })
  return Response.json(rule, { status: 201 })
}

