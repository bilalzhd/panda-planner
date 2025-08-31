import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/tenant'

export async function GET() {
  const { user } = await requireUser()
  const teams = await prisma.team.findMany({
    where: { members: { some: { userId: user.id } } },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json(teams)
}

export async function POST(req: Request) {
  const { user } = await requireUser()
  const body = await req.json()
  const name = String(body?.name || '').trim()
  if (!name) return Response.json({ error: 'name required' }, { status: 400 })
  const team = await prisma.team.create({ data: { name, ownerId: user.id } })
  await prisma.membership.create({ data: { teamId: team.id, userId: user.id, role: 'OWNER' } })
  return Response.json(team, { status: 201 })
}

