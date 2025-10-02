import { prisma } from '@/lib/prisma'
import { taskSchema } from '@/lib/validators'
import { NextRequest } from 'next/server'
import { requireUser, projectWhereForUser, isClientForProject } from '@/lib/tenant'
import { sendTaskAssignedEmail, sendTaskStatusChangedEmail } from '@/lib/email'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const { user } = await requireUser()
  const projectWhere = await projectWhereForUser(user.id)
  const task = await prisma.task.findFirst({
    where: { id: params.id, project: projectWhere },
    include: { project: true, assignedTo: true, createdBy: true, comments: { include: { author: true } }, attachments: true, timesheets: true },
  })
  if (!task) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(task)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { user } = await requireUser()
  const projectWhere = await projectWhereForUser(user.id)
  const existing = await prisma.task.findFirst({ where: { id: params.id, project: projectWhere }, include: { project: true } })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  const parsed = taskSchema.partial().safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.format() }, { status: 400 })
  const { dueDate, ...rest } = parsed.data
  // If client for this project, restrict edits: allow only status change from CLIENT_REVIEW to DONE or TODO
  if (await isClientForProject(user.id, existing.projectId)) {
    const onlyStatus = Object.keys(rest).length === 1 && typeof rest.status === 'string'
    const allowed = existing.status === 'CLIENT_REVIEW' && (rest.status === 'DONE' || rest.status === 'TODO')
    if (!onlyStatus || !allowed) return Response.json({ error: 'Clients may only approve or request changes for items in Client Approval' }, { status: 403 })
  }
  const statusChanged = typeof rest.status !== 'undefined' && rest.status !== existing.status && typeof rest.status === 'string'
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
  if (statusChanged && task.createdBy?.email && existing.createdById) {
    try {
      await sendTaskStatusChangedEmail({
        to: task.createdBy.email,
        task,
        previousStatus: existing.status,
        updatedBy: { name: user.name, email: user.email },
      })
    } catch (e) {
      console.error('Failed to send status change email:', e)
    }
  }
  return Response.json(task)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { user } = await requireUser()
  const projectWhere = await projectWhereForUser(user.id)
  const existing = await prisma.task.findFirst({ where: { id: params.id, project: projectWhere } })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
  // Clients cannot delete tasks
  if (await isClientForProject(user.id, existing.projectId)) return Response.json({ error: 'Clients cannot delete tasks' }, { status: 403 })
  // Delete dependent records first to avoid FK constraint errors
  await prisma.comment.deleteMany({ where: { taskId: params.id } })
  await prisma.attachment.deleteMany({ where: { taskId: params.id } })
  await prisma.timesheet.deleteMany({ where: { taskId: params.id } })
  await prisma.taskSchedule.deleteMany({ where: { taskId: params.id } })
  await prisma.task.delete({ where: { id: params.id } })
  return new Response(null, { status: 204 })
}
