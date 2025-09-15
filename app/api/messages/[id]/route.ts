import { prisma } from '@/lib/prisma'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await requireUser()
  const id = params.id
  const body = await req.json()
  const content = String(body?.content || '').trim()
  if (!content) return Response.json({ error: 'Content required' }, { status: 400 })

  const msg = await (prisma as any).teamMessage.findUnique({ where: { id }, include: { team: true } })
  if (!msg) return Response.json({ error: 'Not found' }, { status: 404 })
  const allowedTeamIds = new Set(await teamIdsForUser(user.id))
  if (!allowedTeamIds.has(msg.teamId)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (msg.authorId !== user.id) return Response.json({ error: 'Only author can edit' }, { status: 403 })

  const updated = await (prisma as any).teamMessage.update({ where: { id }, data: { content }, include: { author: true } })
  return Response.json(updated)
}

