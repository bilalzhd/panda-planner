import { prisma } from '@/lib/prisma'
import { taskSchema } from '@/lib/validators'
import { NextRequest } from 'next/server'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import { sendTaskAssignedEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId') || undefined
  const assignedToId = searchParams.get('assignedToId') || undefined
  const status = searchParams.get('status') as any
  const tasks = await prisma.task.findMany({
    where: {
      project: { teamId: { in: teamIds } },
      projectId,
      assignedToId,
      status: status as any,
    },
    include: { project: true, assignedTo: true, createdBy: true },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  })
  return Response.json(tasks)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = taskSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.format() }, { status: 400 })
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const project = await prisma.project.findFirst({ where: { id: parsed.data.projectId, teamId: { in: teamIds } } })
  if (!project) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { dueDate, ...rest } = parsed.data
  // If no assignee provided (e.g., quick add), assign to the creator by default
  const assignedToId = rest.assignedToId ?? user.id
  const task = await prisma.task.create({
    data: { ...rest, assignedToId, createdById: user.id, dueDate: dueDate ? new Date(dueDate) : null },
    include: { project: true, assignedTo: true, createdBy: true },
  })
  // Notify the assignee if it's someone other than the creator and we have their email
  if (task.assignedTo?.email && task.assignedToId && task.assignedToId !== user.id) {
    try {
      await sendTaskAssignedEmail({ to: task.assignedTo.email, task })
    } catch (e) {
      // Swallow email errors to not block task creation
      console.error('Failed to send assignment email:', e)
    }
  }
  return Response.json(task, { status: 201 })
}
