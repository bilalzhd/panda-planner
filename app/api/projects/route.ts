import { prisma } from '@/lib/prisma'
import { projectSchema } from '@/lib/validators'
import { NextRequest } from 'next/server'
import { requireUser, projectWhereForUser, projectScopeForUser } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const { user } = await requireUser()
  const scope = await projectScopeForUser(user.id)
  const projectWhere = await projectWhereForUser(user.id)
  const projects = await prisma.project.findMany({
    where: projectWhere,
    orderBy: { createdAt: 'desc' },
  })
  const direct = new Set(scope.projectIds)
  const enriched = projects.map((p) => ({ ...p, isClient: direct.has(p.id) }))
  const includeScope = new URL(req.url).searchParams.has('scope')
  if (includeScope) {
    const hasTeamProject = enriched.some((p) => !p.isClient)
    const isClientOnly = !hasTeamProject && enriched.length > 0
    return Response.json({ projects: enriched, scope: { isClientOnly } })
  }
  return Response.json(enriched)
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
  return Response.json(project, { status: 201 })
}
