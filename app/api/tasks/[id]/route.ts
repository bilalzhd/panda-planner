import { prisma } from '@/lib/prisma'
import { taskSchema } from '@/lib/validators'
import { NextRequest } from 'next/server'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import { sendTaskAssignedEmail } from '@/lib/email'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const task = await prisma.task.findFirst({
    where: { id: params.id, project: { teamId: { in: teamIds } } },
    include: { project: true, assignedTo: true, createdBy: true, comments: { include: { author: true } }, attachments: true, timesheets: true },
  })
  if (!task) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(task)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const existing = await prisma.task.findFirst({ where: { id: params.id, project: { teamId: { in: teamIds } } } })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  const parsed = taskSchema.partial().safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.format() }, { status: 400 })
  const { dueDate, ...rest } = parsed.data
  const task = await prisma.task.update({
    where: { id: params.id },
    data: { ...rest, dueDate: dueDate ? new Date(dueDate) : undefined },
    include: { project: true, assignedTo: true, createdBy: true, comments: { include: { author: true } }, attachments: true, timesheets: true },
  })
  // If assignment changed to a new user, notify them (but not on self-assign)
  if (typeof rest.assignedToId !== 'undefined' && rest.assignedToId && rest.assignedToId !== existing.assignedToId) {
    if (task.assignedTo?.email && rest.assignedToId !== user.id) {
      try {
        await sendTaskAssignedEmail({ to: task.assignedTo.email, task })
      } catch (e) {
        console.error('Failed to send assignment email:', e)
      }
    }
  }
  return Response.json(task)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const existing = await prisma.task.findFirst({ where: { id: params.id, project: { teamId: { in: teamIds } } } })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
  // Delete dependent records first to avoid FK constraint errors
  await prisma.comment.deleteMany({ where: { taskId: params.id } })
  await prisma.attachment.deleteMany({ where: { taskId: params.id } })
  await prisma.timesheet.deleteMany({ where: { taskId: params.id } })
  await prisma.taskSchedule.deleteMany({ where: { taskId: params.id } })
  await prisma.task.delete({ where: { id: params.id } })
  return new Response(null, { status: 204 })
}
