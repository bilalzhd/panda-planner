import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTaskDueReminderEmail } from '@/lib/email'
import { TaskStatus } from '@prisma/client'
import { DUE_SOON_WINDOW_HOURS } from '@/lib/task-alerts'

function getCronSecret() {
  return process.env.CRON_SECRET || process.env.CRON_SECRET_TOKEN || ''
}

function assertAuthorized(req: NextRequest) {
  const secret = getCronSecret()
  if (!secret) {
    return true
  }
  const header = req.headers.get('x-cron-secret') || req.headers.get('authorization') || ''
  if (header === secret || header === `Bearer ${secret}`) {
    return true
  }
  return false
}

export async function POST(req: NextRequest) {
  if (!assertAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const dueSoonCutoff = new Date(now.getTime() + DUE_SOON_WINDOW_HOURS * 60 * 60 * 1000)

  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: now, lte: dueSoonCutoff },
      status: { not: TaskStatus.DONE },
      assignedTo: { some: { email: { not: null } } },
    },
    include: {
      assignedTo: {
        include: {
          notificationPref: {
            select: {
              emailTaskDueSoon: true,
            },
          },
        },
      },
      project: true,
    },
    orderBy: { dueDate: 'asc' },
  })

  let notified = 0
  let skipped = 0
  const errors: { taskId: string; error: string }[] = []

  for (const task of tasks) {
    for (const assignee of task.assignedTo) {
      if (!assignee.email) continue
      if (assignee.notificationPref?.emailTaskDueSoon === false) {
        skipped += 1
        continue
      }
      try {
        await sendTaskDueReminderEmail({
          to: assignee.email,
          task,
        })
        notified += 1
      } catch (err) {
        console.error('Failed to send due reminder email', err)
        errors.push({ taskId: task.id, error: err instanceof Error ? err.message : 'unknown error' })
      }
    }
  }

  return Response.json({
    processed: tasks.length,
    notified,
    skipped,
    windowHours: DUE_SOON_WINDOW_HOURS,
    errors,
  })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
