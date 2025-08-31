import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { requireUser, teamIdsForUser } from '@/lib/tenant'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const task = await prisma.task.findFirst({ where: { id: params.id, project: { teamId: { in: teamIds } } } })
  if (!task) return Response.json({ error: 'Not found' }, { status: 404 })
  const comments = await prisma.comment.findMany({ where: { taskId: params.id }, include: { author: true }, orderBy: { createdAt: 'asc' } })
  return Response.json(comments)
}

export async function POST(req: NextRequest, { params }: Params) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const task = await prisma.task.findFirst({ where: { id: params.id, project: { teamId: { in: teamIds } } } })
  if (!task) return Response.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  if (!body?.content) return Response.json({ error: 'content required' }, { status: 400 })
  const c = await prisma.comment.create({ data: { taskId: params.id, authorId: user.id, content: body.content } })
  return Response.json(c, { status: 201 })
}
