import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/tenant'

type Params = { params: { id: string; userId: string } }

export async function DELETE(_req: Request, { params }: Params) {
  const { user } = await requireUser()
  const team = await prisma.team.findFirst({ where: { id: params.id } })
  if (!team) return Response.json({ error: 'Not found' }, { status: 404 })
  if (team.ownerId !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (params.userId === team.ownerId) return Response.json({ error: 'Cannot remove the team owner' }, { status: 400 })

  // Ensure the target user is actually a member
  const membership = await prisma.membership.findFirst({ where: { teamId: team.id, userId: params.userId } })
  if (!membership) return Response.json({ error: 'Member not found' }, { status: 404 })

  await prisma.membership.delete({ where: { id: membership.id } })
  return new Response(null, { status: 204 })
}

