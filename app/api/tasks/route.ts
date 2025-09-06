import { prisma } from '@/lib/prisma'
import { taskSchema } from '@/lib/validators'
import { NextRequest } from 'next/server'
import { requireUser, teamIdsForUser } from '@/lib/tenant'

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
    include: { project: true, assignedTo: true },
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
  const task = await prisma.task.create({
    data: { ...rest, dueDate: dueDate ? new Date(dueDate) : null },
    include: { project: true, assignedTo: true },
  })
  return Response.json(task, { status: 201 })
}
