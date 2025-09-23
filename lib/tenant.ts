import { prisma } from '@/lib/prisma'
import { auth, currentUser } from '@clerk/nextjs/server'
import type { Prisma } from '@prisma/client'

export async function requireUser() {
  const { userId } = auth()
  if (!userId) throw new Error('Unauthorized')
  // Fetch Clerk user details best-effort; avoid hard failure during render
  let cu: Awaited<ReturnType<typeof currentUser>> | null = null
  try {
    cu = await currentUser()
  } catch (e) {
    // Swallow to prevent opaque Server Components error; we'll upsert minimal user
    cu = null
  }
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

export async function projectScopeForUser(userId: string) {
  // Be defensive in dev: if the Prisma client hasn't regenerated yet,
  // prisma.projectAccess may be undefined. Fallback to empty direct access
  // to avoid runtime 500s during hot-reload.
  const hasProjectAccess = !!(prisma as any).projectAccess?.findMany
  const [teamIds, direct] = await Promise.all([
    teamIdsForUser(userId),
    hasProjectAccess
      ? (prisma as any).projectAccess.findMany({ where: { userId }, select: { projectId: true } })
      : Promise.resolve([]),
  ])
  const projectIds = direct.map((d: any) => d.projectId)
  return { teamIds, projectIds }
}

export function buildProjectWhere(scope: { teamIds: string[]; projectIds: string[] }): Prisma.ProjectWhereInput {
  const { teamIds, projectIds } = scope
  const clauses: Prisma.ProjectWhereInput[] = []
  if (teamIds.length) clauses.push({ teamId: { in: teamIds } })
  if (projectIds.length) clauses.push({ id: { in: projectIds } })
  if (clauses.length === 0) {
    return { id: { in: [] } }
  }
  if (clauses.length === 1) return clauses[0]
  return { OR: clauses }
}

export async function projectWhereForUser(userId: string) {
  const scope = await projectScopeForUser(userId)
  return buildProjectWhere(scope)
}

export async function isClientForProject(userId: string, projectId: string) {
  const access = await prisma.projectAccess.findUnique({ where: { projectId_userId: { projectId, userId } } })
  if (!access) return false
  // If they are also a team member, treat them as a normal user
  const team = await prisma.project.findUnique({ where: { id: projectId }, select: { teamId: true } })
  if (!team) return false
  const member = await prisma.membership.findFirst({ where: { teamId: team.teamId, userId } })
  return !member
}
