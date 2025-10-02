import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTaskDueReminderEmail } from '@/lib/email'
import { TaskStatus } from '@prisma/client'

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
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: startOfDay, lte: endOfDay },
      status: { not: TaskStatus.DONE },
      assignedTo: { email: { not: null } },
    },
    include: {
      assignedTo: true,
      project: true,
    },
  })

  let notified = 0
  const errors: { taskId: string; error: string }[] = []

  for (const task of tasks) {
    if (!task.assignedTo?.email) continue
    try {
      await sendTaskDueReminderEmail({
        to: task.assignedTo.email,
        task,
      })
      notified += 1
    } catch (err) {
      console.error('Failed to send due reminder email', err)
      errors.push({ taskId: task.id, error: err instanceof Error ? err.message : 'unknown error' })
    }
  }

  return Response.json({ processed: tasks.length, notified, errors })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
