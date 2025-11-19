import { prisma } from '@/lib/prisma'
import { projectSchema } from '@/lib/validators'
import { NextRequest } from 'next/server'
import { requireUser, projectWhereForUser, projectScopeForUser, getUserCapability } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const { user } = await requireUser()
  const scope = await projectScopeForUser(user.id)
  const params = new URL(req.url).searchParams
  const includeArchived = params.has('includeArchived')
  const projectWhere = await projectWhereForUser(user.id, { includeArchived })
  const activeWhere = includeArchived ? { AND: [projectWhere, { archivedAt: null }] } : projectWhere
  const [projects, archived] = await Promise.all([
    prisma.project.findMany({
      where: activeWhere,
      orderBy: { createdAt: 'desc' },
    }),
    includeArchived
      ? prisma.project.findMany({
          where: { AND: [projectWhere, { archivedAt: { not: null } }] },
          orderBy: { archivedAt: 'desc' },
        })
      : Promise.resolve([]),
  ])
  const enriched = projects.map((p) => {
    const accessLevel = scope.isSuperAdmin ? 'EDIT' : scope.accessMap[p.id] || 'READ'
    return { ...p, accessLevel }
  })
  const includeScope = params.has('scope')
  const payload: any = includeScope || includeArchived ? { projects: enriched } : enriched
  if (includeArchived) {
    payload.archivedProjects = archived.map((p) => {
      const accessLevel = scope.isSuperAdmin ? 'EDIT' : scope.accessMap[p.id] || 'READ'
      return { ...p, accessLevel }
    })
  }
  if (includeScope) {
    const capability = await getUserCapability(user.id)
    const hasEditableProjects = scope.isSuperAdmin || enriched.some((p) => p.accessLevel === 'EDIT')
    payload.scope = {
      hasEditableProjects,
      isSuperAdmin: capability.isSuperAdmin,
      canAccessUsers: capability.canAccessUsers,
      canCreateUsers: capability.canCreateUsers,
      canEditUsers: capability.canEditUsers,
      canDeleteUsers: capability.canDeleteUsers,
    }
  }
  return Response.json(payload)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = projectSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.format() }, { status: 400 })
  const { user, personalTeam } = await requireUser()

  // If teamId supplied, use it after verifying membership
  let teamId = (body?.teamId as string) || ''
  if (teamId) {
    const membership = await prisma.membership.findFirst({ where: { teamId, userId: user.id } })
    if (!membership) return Response.json({ error: 'Forbidden' }, { status: 403 })
  } else {
    // Choose a sensible default team: pick the team the user belongs to
    // with the most members (shared team), else fall back to personal team.
    const teams = await prisma.team.findMany({
      where: { members: { some: { userId: user.id } } },
      include: { _count: { select: { members: true } } },
    })
    const best = teams.sort((a, b) => b._count.members - a._count.members)[0]
    teamId = best?.id || personalTeam.id
  }

  const project = await prisma.project.create({ data: { ...parsed.data, teamId } })
  await prisma.projectAccess.create({
    data: { projectId: project.id, userId: user.id, accessLevel: 'EDIT' },
  }).catch(() => {})
  return Response.json(project, { status: 201 })
}
