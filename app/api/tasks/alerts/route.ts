import { TaskStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireUser, projectWhereForUser } from '@/lib/tenant'
import { DUE_SOON_WINDOW_HOURS } from '@/lib/task-alerts'

const MAX_DUE_SOON_TASKS = 8
const MAX_OVERDUE_TASKS = 5

function serializeTask(task: {
  id: string
  title: string
  dueDate: Date | null
  project: { id: string; name: string }
}) {
  return {
    id: task.id,
    title: task.title,
    dueDate: task.dueDate?.toISOString() || null,
    project: task.project,
  }
}

export async function GET() {
  const { user, workspaceId } = await requireUser()
  if (!workspaceId) {
    return Response.json({
      dueSoon: [],
      overdueSinceLastCheck: [],
      windowHours: DUE_SOON_WINDOW_HOURS,
      checkedAt: new Date().toISOString(),
    })
  }

  const projectWhere = await projectWhereForUser(user.id)
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId: user.id },
    select: { lastTaskAlertCheckAt: true },
  })

  const now = new Date()
  const dueSoonCutoff = new Date(now.getTime() + DUE_SOON_WINDOW_HOURS * 60 * 60 * 1000)

  const [dueSoon, overdueSinceLastCheck] = await Promise.all([
    prisma.task.findMany({
      where: {
        project: projectWhere,
        assignedTo: { some: { id: user.id } },
        dueDate: { gte: now, lte: dueSoonCutoff },
        status: { not: TaskStatus.DONE },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: MAX_DUE_SOON_TASKS,
    }),
    pref?.lastTaskAlertCheckAt
      ? prisma.task.findMany({
          where: {
            project: projectWhere,
            assignedTo: { some: { id: user.id } },
            dueDate: { gt: pref.lastTaskAlertCheckAt, lt: now },
            status: { not: TaskStatus.DONE },
          },
          select: {
            id: true,
            title: true,
            dueDate: true,
            project: { select: { id: true, name: true } },
          },
          orderBy: { dueDate: 'desc' },
          take: MAX_OVERDUE_TASKS,
        })
      : Promise.resolve([]),
  ])

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      lastTaskAlertCheckAt: now,
    },
    update: {
      lastTaskAlertCheckAt: now,
    },
  })

  return Response.json({
    dueSoon: dueSoon.map(serializeTask),
    overdueSinceLastCheck: overdueSinceLastCheck.map(serializeTask),
    windowHours: DUE_SOON_WINDOW_HOURS,
    checkedAt: now.toISOString(),
  })
}
