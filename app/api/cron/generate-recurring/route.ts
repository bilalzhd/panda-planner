import { prisma } from '@/lib/prisma'
import { nextDueDate } from '@/lib/recurrence'

// This endpoint can be invoked by a cron job (e.g., GitHub Actions, Vercel Cron)
// It generates concrete task instances for recurring templates if missing for the next window.

export async function POST() {
  const templates = await prisma.task.findMany({
    where: { recurring: true },
  })

  let created = 0
  for (const t of templates) {
    if (!t.frequency) continue
    const lastChild = await prisma.task.findFirst({
      where: { parentId: t.id },
      orderBy: { dueDate: 'desc' },
    })
    const lastDue = lastChild?.dueDate ?? t.dueDate ?? null
    const next = nextDueDate({
      lastDueDate: lastDue,
      frequency: t.frequency,
      interval: t.interval,
      byWeekday: t.byWeekday,
    })
    // Check if a child already exists for this next date
    const exists = await prisma.task.findFirst({ where: { parentId: t.id, dueDate: next } })
    if (exists) continue

    await prisma.task.create({
      data: {
        parentId: t.id,
        projectId: t.projectId,
        title: t.title,
        description: t.description,
        assignedToId: t.assignedToId,
        dueDate: next,
        recurring: false,
        frequency: null,
        interval: null,
        byWeekday: null,
        priority: t.priority,
        status: 'TODO',
      },
    })
    created++
  }

  return Response.json({ created })
}

