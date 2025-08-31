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
  await prisma.project.delete({ where: { id: params.id } })
  return new Response(null, { status: 204 })
}
