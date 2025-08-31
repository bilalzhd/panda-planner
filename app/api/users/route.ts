import { prisma } from '@/lib/prisma'
import { requireUser, teamIdsForUser } from '@/lib/tenant'

export async function GET() {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  // Users who share at least one team with the requester
  const users = await prisma.user.findMany({
    where: {
      memberships: { some: { teamId: { in: teamIds } } },
    },
    select: { id: true, name: true, email: true, image: true },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  })
  return Response.json(users)
}

