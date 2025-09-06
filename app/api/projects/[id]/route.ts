import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, teamIdsForUser } from '@/lib/tenant'

type Ctx = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const project = await prisma.project.findFirst({ where: { id: params.id, teamId: { in: teamIds } } })
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({
    id: project.id,
    description: project.description,
    health: (project as any).health,
    healthAuto: (project as any).healthAuto,
  })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const body = await req.json().catch(() => ({})) as any

  // Only allow updates to projects within the user's teams
  const project = await prisma.project.findFirst({ where: { id: params.id, teamId: { in: teamIds } } })
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const data: any = {}
  if (typeof body.description === 'string') data.description = body.description.trim() || null
  if (typeof body.health === 'string') data.health = body.health
  if (typeof body.healthAuto === 'boolean') data.healthAuto = body.healthAuto

  if (Object.keys(data).length === 0) return Response.json({ ok: true })

  const updated = await prisma.project.update({ where: { id: project.id }, data })
  return Response.json({ ok: true, project: updated })
}
