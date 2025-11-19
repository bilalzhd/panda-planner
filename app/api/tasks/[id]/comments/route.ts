import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { requireUser, projectWhereForUser, ensureProjectPermission } from '@/lib/tenant'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const { user, workspaceId } = await requireUser()
  if (!workspaceId) {
    return Response.json({ error: 'Select a workspace first' }, { status: 400 })
  }
  const projectWhere = await projectWhereForUser(user.id)
  const task = await prisma.task.findFirst({ where: { id: params.id, project: projectWhere } })
  if (!task) return Response.json({ error: 'Not found' }, { status: 404 })
  const comments = await prisma.comment.findMany({ where: { taskId: params.id }, include: { author: true }, orderBy: { createdAt: 'asc' } })
  return Response.json(comments)
}

export async function POST(req: NextRequest, { params }: Params) {
  const { user, workspaceId } = await requireUser()
  if (!workspaceId) {
    return Response.json({ error: 'Select a workspace first' }, { status: 400 })
  }
  const projectWhere = await projectWhereForUser(user.id)
  const task = await prisma.task.findFirst({ where: { id: params.id, project: projectWhere } })
  if (!task) return Response.json({ error: 'Not found' }, { status: 404 })
  const canEdit = await ensureProjectPermission(user, task.projectId, 'EDIT')
  if (!canEdit) return Response.json({ error: 'Read-only access' }, { status: 403 })
  const body = await req.json()
  if (!body?.content) return Response.json({ error: 'content required' }, { status: 400 })
  const c = await prisma.comment.create({ data: { taskId: params.id, authorId: user.id, content: body.content } })
  return Response.json(c, { status: 201 })
}
