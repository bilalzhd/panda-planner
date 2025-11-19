import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, getUserCapability, workspaceLimit } from '@/lib/tenant'
import { sendWorkspaceInviteEmail } from '@/lib/email'

type AccessInput = { projectId: string; accessLevel: 'READ' | 'EDIT' }

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function GET() {
  const { user, workspaceId, workspace } = await requireUser()
  const capability = await getUserCapability(user.id, workspaceId)
  if (!capability.canAccessUsers) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
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
      isSuperAdmin: workspace?.ownerId === u.id,
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
  const { user, workspaceId, workspace } = await requireUser()
  const capability = await getUserCapability(user.id, workspaceId)
  if (!capability.canCreateUsers) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!workspaceId) {
    return Response.json({ error: 'Select a workspace first' }, { status: 400 })
  }
  const body = await req.json().catch(() => ({}))
  const rawEmail = String(body?.email || '').trim()
  if (!rawEmail) return Response.json({ error: 'Email is required' }, { status: 400 })
  const email = normalizeEmail(rawEmail)
  const existing = await prisma.user.findUnique({ where: { email } })
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
  const buildAccessPayload = (userId: string) =>
    accesses
      .filter(
        (a) =>
          typeof a?.projectId === 'string' &&
          allowedMap.has(a.projectId) &&
          (a.accessLevel === 'READ' || a.accessLevel === 'EDIT'),
      )
      .map((a) => ({ projectId: a.projectId, userId, accessLevel: a.accessLevel }))

  if (existing) {
    const alreadyMember = await prisma.membership.findUnique({
      where: { teamId_userId: { teamId: workspaceId, userId: existing.id } },
    })
    if (alreadyMember) {
      return Response.json({ error: 'User is already a member of this workspace' }, { status: 409 })
    }
    const maxWorkspaces = workspaceLimit()
    if (maxWorkspaces > 0) {
      const membershipCount = await prisma.membership.count({ where: { userId: existing.id } })
      if (membershipCount >= maxWorkspaces) {
        return Response.json({ error: 'User already has full workspaces' }, { status: 409 })
      }
    }
    const updatedAccesses = buildAccessPayload(existing.id)
    if (updatedAccesses.length) {
      await prisma.projectAccess.createMany({ data: updatedAccesses, skipDuplicates: true })
    }
    await prisma.membership.create({
      data: { teamId: workspaceId, userId: existing.id, role: 'MEMBER' },
    })
    await prisma.userPermission.upsert({
      where: { userId: existing.id },
      create: {
        userId: existing.id,
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
    if (existing.email) {
      const assignedNames = updatedAccesses.map((a) => allowedMap.get(a.projectId)).filter(Boolean) as string[]
      try {
        await sendWorkspaceInviteEmail({
          to: existing.email,
          recipientName: existing.name,
          workspaceName: workspace?.name || 'PandaPlanner Workspace',
          inviter: { name: user.name, email: user.email },
          projects: assignedNames,
        })
      } catch (e) {
        console.error('Failed to send workspace invite', e)
      }
    }
    return Response.json({ id: existing.id, invited: true }, { status: 200 })
  }

  const cleanedAccesses = buildAccessPayload(created.id)
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
