import { prisma } from '@/lib/prisma'
import { taskSchema } from '@/lib/validators'
import { NextRequest } from 'next/server'
import { requireUser, projectWhereForUser, ensureProjectPermission } from '@/lib/tenant'
import { sendTaskAssignedEmail } from '@/lib/email'
import { normalizeAssignedUserIds } from '@/lib/task-assignees'

export async function GET(req: NextRequest) {
  const { user, workspaceId } = await requireUser()
  if (!workspaceId) {
    return Response.json({ error: 'Select a workspace first' }, { status: 400 })
  }
  const projectWhere = await projectWhereForUser(user.id)
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId') || undefined
  const assignedToId = searchParams.get('assignedToId') || undefined
  const status = searchParams.get('status') as any
  const tasks = await prisma.task.findMany({
    where: {
      project: projectWhere,
      projectId,
      assignedTo: assignedToId ? { some: { id: assignedToId } } : undefined,
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
  const { user, workspaceId } = await requireUser()
  if (!workspaceId) {
    return Response.json({ error: 'Select a workspace first' }, { status: 400 })
  }
  const projectWhere = await projectWhereForUser(user.id)
  const project = await prisma.project.findFirst({ where: { id: parsed.data.projectId, AND: [projectWhere] } })
  if (!project) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const canEdit = await ensureProjectPermission(user, project.id, 'EDIT')
  if (!canEdit) {
    return Response.json({ error: 'Read-only access' }, { status: 403 })
  }
  const { dueDate, ...rest } = parsed.data
  const { ids: assignedToIds } = normalizeAssignedUserIds(rest, {
    fallbackUserId: user.id,
    treatMissingAsFallback: true,
  })
  const task = await prisma.task.create({
    data: {
      projectId: rest.projectId,
      title: rest.title,
      description: rest.description,
      recurring: rest.recurring,
      frequency: rest.frequency,
      interval: rest.interval,
      byWeekday: rest.byWeekday,
      priority: rest.priority,
      status: rest.status,
      createdById: user.id,
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedTo: assignedToIds.length ? { connect: assignedToIds.map((id) => ({ id })) } : undefined,
    },
    include: { project: true, assignedTo: true, createdBy: true },
  })
  for (const assignee of task.assignedTo) {
    if (!assignee.email || assignee.id === user.id) continue
    try {
      await sendTaskAssignedEmail({ to: assignee.email, task })
    } catch (e) {
      console.error('Failed to send assignment email:', e)
    }
  }
  return Response.json(task, { status: 201 })
}
