import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, getUserCapability, getWorkspaceContext, isSuperAdmin } from '@/lib/tenant'
import { sendWorkspaceInviteEmail } from '@/lib/email'

type AccessInput = { projectId: string; accessLevel: 'READ' | 'EDIT' }

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function GET() {
  const { user } = await requireUser()
  const capability = await getUserCapability(user.id)
  if (!capability.canAccessUsers) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { workspaceId } = await getWorkspaceContext(user.id, capability.isSuperAdmin)
  if (!workspaceId) {
    return Response.json({ users: [], projects: [], capability })
  }
  const [members, projects] = await Promise.all([
    prisma.membership.findMany({
      where: { teamId: workspaceId },
      include: {
        user: {
          include: {
            permissions: true,
            projectAccesses: {
              where: { project: { teamId: workspaceId } },
              include: { project: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.project.findMany({ where: { teamId: workspaceId }, orderBy: { name: 'asc' } }),
  ])
  const mappedUsers = members.map((member) => {
    const u = member.user
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      isSuperAdmin: isSuperAdmin(u),
      accesses: u.projectAccesses.map((p) => ({
        projectId: p.projectId,
        projectName: p.project?.name,
        accessLevel: p.accessLevel,
      })),
      permissions: {
        canAccessUsers: !!u.permissions?.canAccessUsers,
        canCreateUsers: !!u.permissions?.canCreateUsers,
        canEditUsers: !!u.permissions?.canEditUsers,
        canDeleteUsers: !!u.permissions?.canDeleteUsers,
      },
    }
  })
  return Response.json({
    users: mappedUsers,
    projects: projects.map((p) => ({ id: p.id, name: p.name })),
    capability,
  })
}

export async function POST(req: NextRequest) {
  const { user } = await requireUser()
  const capability = await getUserCapability(user.id)
  if (!capability.canCreateUsers) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { workspaceId } = await getWorkspaceContext(user.id, capability.isSuperAdmin)
  if (!workspaceId) {
    return Response.json({ error: 'Select a workspace first' }, { status: 400 })
  }
  const body = await req.json().catch(() => ({}))
  const rawEmail = String(body?.email || '').trim()
  if (!rawEmail) return Response.json({ error: 'Email is required' }, { status: 400 })
  const email = normalizeEmail(rawEmail)
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return Response.json({ error: 'Email already exists' }, { status: 409 })
  const name = typeof body?.name === 'string' ? body.name.trim() : null
  const accesses = Array.isArray(body?.projectAccesses) ? (body.projectAccesses as AccessInput[]) : []
  const permissionsInput = body?.permissions || {}
  const created = await prisma.user.create({
    data: {
      name,
      email,
    },
  })
  const allowedProjects = await prisma.project.findMany({
    where: { teamId: workspaceId },
    select: { id: true, name: true },
  })
  const allowedMap = new Map(allowedProjects.map((p) => [p.id, p.name]))
  const cleanedAccesses = accesses
    .filter((a) => typeof a?.projectId === 'string' && allowedMap.has(a.projectId) && (a.accessLevel === 'READ' || a.accessLevel === 'EDIT'))
    .map((a) => ({ projectId: a.projectId, userId: created.id, accessLevel: a.accessLevel }))

  if (cleanedAccesses.length) {
    await prisma.projectAccess.createMany({ data: cleanedAccesses })
  }

  await prisma.membership.upsert({
    where: { teamId_userId: { teamId: workspaceId, userId: created.id } },
    update: {},
    create: { teamId: workspaceId, userId: created.id, role: 'MEMBER' },
  })

  await prisma.userPermission.upsert({
    where: { userId: created.id },
    create: {
      userId: created.id,
      canAccessUsers: !!permissionsInput?.canAccessUsers,
      canCreateUsers: !!permissionsInput?.canCreateUsers,
      canEditUsers: !!permissionsInput?.canEditUsers,
      canDeleteUsers: !!permissionsInput?.canDeleteUsers,
    },
    update: {
      canAccessUsers: !!permissionsInput?.canAccessUsers,
      canCreateUsers: !!permissionsInput?.canCreateUsers,
      canEditUsers: !!permissionsInput?.canEditUsers,
      canDeleteUsers: !!permissionsInput?.canDeleteUsers,
    },
  })
  if (created.email) {
    const workspace = await prisma.team.findUnique({ where: { id: workspaceId }, select: { name: true } })
    const assignedNames = cleanedAccesses.map((a) => allowedMap.get(a.projectId)).filter(Boolean) as string[]
    try {
      await sendWorkspaceInviteEmail({
        to: created.email,
        recipientName: created.name,
        workspaceName: workspace?.name || 'PandaPlanner Workspace',
        inviter: { name: user.name, email: user.email },
        projects: assignedNames,
      })
    } catch (e) {
      console.error('Failed to send workspace invite', e)
    }
  }

  return Response.json({ id: created.id }, { status: 201 })
}
