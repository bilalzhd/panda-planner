import { prisma } from '@/lib/prisma'
import { projectSchema } from '@/lib/validators'
import { NextRequest } from 'next/server'
import { requireUser, teamIdsForUser } from '@/lib/tenant'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const project = await prisma.project.findFirst({
    where: { id: params.id, teamId: { in: teamIds } },
    include: {
      tasks: {
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      },
    },
  })
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(project)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const existing = await prisma.project.findFirst({ where: { id: params.id, teamId: { in: teamIds } } })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  const parsed = projectSchema.partial().safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.format() }, { status: 400 })
  const project = await prisma.project.update({ where: { id: params.id }, data: parsed.data })
  return Response.json(project)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const existing = await prisma.project.findFirst({ where: { id: params.id, teamId: { in: teamIds } } })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
  await prisma.$transaction(async (tx) => {
    const tasks = await tx.task.findMany({ where: { projectId: params.id }, select: { id: true } })
    const taskIds = tasks.map((t) => t.id)
    if (taskIds.length > 0) {
      // Remove dependent records with restrictive FKs first
      await tx.timesheet.deleteMany({ where: { taskId: { in: taskIds } } })
      // Schedules, comments, and attachments are CASCADE in migrations, but call defensively
      await tx.taskSchedule.deleteMany({ where: { taskId: { in: taskIds } } }).catch(() => {})
      await tx.comment.deleteMany({ where: { taskId: { in: taskIds } } }).catch(() => {})
      await tx.attachment.deleteMany({ where: { taskId: { in: taskIds } } }).catch(() => {})
      await tx.task.deleteMany({ where: { id: { in: taskIds } } })
    }
    // Project-scoped credentials, if present
    await tx.credential.deleteMany({ where: { projectId: params.id } }).catch(() => {})
    await tx.project.delete({ where: { id: params.id } })
  })
  return new Response(null, { status: 204 })
}
