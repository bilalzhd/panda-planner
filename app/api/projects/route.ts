import { prisma } from '@/lib/prisma'
import { projectSchema } from '@/lib/validators'
import { NextRequest } from 'next/server'
import { requireUser, projectWhereForUser, projectScopeForUser, getUserCapability } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const { user, workspaceId } = await requireUser()
  const scope = await projectScopeForUser(user.id, workspaceId)
  const params = new URL(req.url).searchParams
  const includeArchived = params.has('includeArchived')
  const projectWhere = await projectWhereForUser(user.id, { includeArchived, workspaceId })
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
    const capability = await getUserCapability(user.id, workspaceId)
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
  const { user, workspaceId } = await requireUser()
  if (!workspaceId) {
    return Response.json({ error: 'Select a workspace first' }, { status: 400 })
  }
  const teamId = workspaceId
  if (body?.teamId && body.teamId !== workspaceId) {
    return Response.json({ error: 'Projects can only be created in the active workspace' }, { status: 400 })
  }

  const project = await prisma.project.create({ data: { ...parsed.data, teamId } })
  await prisma.projectAccess.create({
    data: { projectId: project.id, userId: user.id, accessLevel: 'EDIT' },
  }).catch(() => {})
  return Response.json(project, { status: 201 })
}
