import { prisma } from '@/lib/prisma'
import { requireUser, teamIdsForUser } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { user } = await requireUser()
  const teams = await teamIdsForUser(user.id)
  if (teams.length === 0) return Response.json({ count: 0 })
  const count = await prisma.teamMessage.count({
    where: {
      teamId: { in: teams },
      authorId: { not: user.id },
      reads: { none: { userId: user.id } },
    },
  })
  return Response.json({ count })
}

