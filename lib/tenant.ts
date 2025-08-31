import { prisma } from '@/lib/prisma'
import { auth, currentUser } from '@clerk/nextjs/server'

export async function requireUser() {
  const { userId } = auth()
  if (!userId) throw new Error('Unauthorized')
  const cu = await currentUser()
  // Ensure local user exists and is linked via clerkId
  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: { name: cu?.fullName || cu?.username || cu?.emailAddresses?.[0]?.emailAddress || undefined, email: cu?.emailAddresses?.[0]?.emailAddress || undefined, image: cu?.imageUrl || undefined },
    create: {
      clerkId: userId,
      name: cu?.fullName || cu?.username || undefined,
      email: cu?.emailAddresses?.[0]?.emailAddress || undefined,
      image: cu?.imageUrl || undefined,
    },
  })

  // Ensure a personal team exists
  const personalName = `${user.name || 'My'} Team`
  let team = await prisma.team.findFirst({ where: { ownerId: user.id, name: personalName } })
  if (!team) {
    team = await prisma.team.create({ data: { name: personalName, ownerId: user.id } })
    await prisma.membership.create({ data: { teamId: team.id, userId: user.id, role: 'OWNER' } })
  } else {
    // Ensure membership exists
    await prisma.membership.upsert({
      where: { teamId_userId: { teamId: team.id, userId: user.id } },
      update: { role: 'OWNER' },
      create: { teamId: team.id, userId: user.id, role: 'OWNER' },
    })
  }

  return { user, personalTeam: team }
}

export async function teamIdsForUser(userId: string) {
  const memberships = await prisma.membership.findMany({ where: { userId }, select: { teamId: true } })
  return memberships.map((m) => m.teamId)
}

