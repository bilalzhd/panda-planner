import { prisma } from '@/lib/prisma'
import { auth, currentUser } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import type { Prisma, ProjectAccessLevel } from '@prisma/client'

const WORKSPACE_FREE_LIMIT = Number(process.env.WORKSPACE_FREE_LIMIT || 2)
const WORKSPACE_COOKIE = 'pp-workspace'
export const WORKSPACE_COOKIE_NAME = WORKSPACE_COOKIE

export class WorkspaceRequiredError extends Error {
  constructor(message = 'No workspace memberships found') {
    super(message)
    this.name = 'WorkspaceRequiredError'
  }
}

type WorkspaceContext = {
  workspaceId: string | null
  membershipIds: string[]
}

function readWorkspaceCookie() {
  try {
    return cookies().get(WORKSPACE_COOKIE)?.value || null
  } catch {
    return null
  }
}

async function resolveWorkspaceContext(userId: string): Promise<WorkspaceContext> {
  const cookieId = readWorkspaceCookie()
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { teamId: true },
    orderBy: { createdAt: 'asc' },
  })
  const membershipIds = memberships.map((m) => m.teamId)

  if (cookieId && membershipIds.includes(cookieId)) {
    return { workspaceId: cookieId, membershipIds }
  }

  return { workspaceId: membershipIds[0] || null, membershipIds }
}

export async function getWorkspaceContext(userId: string): Promise<WorkspaceContext> {
  return resolveWorkspaceContext(userId)
}

type RequireUserOptions = {
  requireWorkspace?: boolean
}

export async function requireUser(opts: RequireUserOptions = {}) {
  const { requireWorkspace = false } = opts
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
  const normalizedEmail = cu?.emailAddresses?.[0]?.emailAddress?.toLowerCase() || null
  const baseData = {
    name: cu?.fullName || cu?.username || normalizedEmail || undefined,
    email: normalizedEmail || undefined,
    image: cu?.imageUrl || undefined,
  }
  let user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (user) {
    user = await prisma.user.update({ where: { id: user.id }, data: baseData })
  } else {
    if (normalizedEmail) {
      const pending = await prisma.user.findUnique({ where: { email: normalizedEmail } })
      if (pending) {
        user = await prisma.user.update({ where: { id: pending.id }, data: { ...baseData, clerkId: userId } })
      }
    }
    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          ...baseData,
        },
      })
    }
  }

  const { workspaceId, membershipIds } = await getWorkspaceContext(user.id)
  const hasMemberships = membershipIds.length > 0
  if (!hasMemberships && requireWorkspace) {
    throw new WorkspaceRequiredError('Join or create a workspace to continue')
  }

  let isWorkspaceOwner = false
  let workspace: { id: string; name: string; ownerId: string } | null = null
  if (workspaceId) {
    workspace = await prisma.team.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, ownerId: true },
    })
    isWorkspaceOwner = workspace?.ownerId === user.id
  } else if (requireWorkspace) {
    throw new WorkspaceRequiredError('Select an active workspace')
  }

  return { user, workspaceId, workspace, membershipIds, hasMemberships, isSuperAdmin: !!(workspaceId && isWorkspaceOwner) }
}

export function workspaceLimit() {
  return WORKSPACE_FREE_LIMIT
}

export async function ownedWorkspaceCount(userId: string) {
  return prisma.team.count({ where: { ownerId: userId } })
}

export async function canCreateWorkspace(userId: string) {
  const count = await ownedWorkspaceCount(userId)
  return count < WORKSPACE_FREE_LIMIT
}

export async function teamIdsForUser(userId: string) {
  const memberships = await prisma.membership.findMany({ where: { userId }, select: { teamId: true } })
  return memberships.map((m) => m.teamId)
}

export type ProjectScope = {
  workspaceId: string | null
  projectIds: string[]
  accessMap: Record<string, ProjectAccessLevel>
  isSuperAdmin: boolean
}

export async function projectScopeForUser(userId: string, workspaceId?: string | null): Promise<ProjectScope> {
  const resolvedWorkspaceId = workspaceId ?? (await getWorkspaceContext(userId)).workspaceId
  if (!resolvedWorkspaceId) {
    return { workspaceId: null, projectIds: [], accessMap: {}, isSuperAdmin: false }
  }
  const workspace = await prisma.team.findUnique({ where: { id: resolvedWorkspaceId }, select: { ownerId: true } })
  const isOwner = workspace?.ownerId === userId
  const projects = await prisma.project.findMany({
    where: { teamId: resolvedWorkspaceId },
    select: { id: true },
  })
  const projectIds = projects.map((p) => p.id)
  const accessMap: Record<string, ProjectAccessLevel> = {}
  projects.forEach((p) => {
    accessMap[p.id] = isOwner ? 'EDIT' : 'READ'
  })
  if (!isOwner && projectIds.length) {
    const overrides = await prisma.projectAccess.findMany({
      where: { userId, projectId: { in: projectIds } },
    })
    overrides.forEach((entry) => {
      accessMap[entry.projectId] = entry.accessLevel
    })
  }
  return { workspaceId: resolvedWorkspaceId, projectIds, accessMap, isSuperAdmin: isOwner }
}

export function buildProjectWhere(
  scope: ProjectScope,
  opts: { includeArchived?: boolean } = {},
): Prisma.ProjectWhereInput {
  if (scope.isSuperAdmin && scope.workspaceId) {
    const base: Prisma.ProjectWhereInput = { teamId: scope.workspaceId }
    return opts.includeArchived ? base : { AND: [base, { archivedAt: null }] }
  }
  const { projectIds } = scope
  if (projectIds.length === 0) {
    return { id: { in: [] }, ...(opts.includeArchived ? {} : { archivedAt: null }) }
  }
  const clause: Prisma.ProjectWhereInput = { id: { in: projectIds } }
  if (opts.includeArchived) return clause
  return { AND: [clause, { archivedAt: null }] }
}

export async function projectWhereForUser(
  userId: string,
  opts: { includeArchived?: boolean; workspaceId?: string | null } = {},
) {
  const scope = await projectScopeForUser(userId, opts.workspaceId)
  return buildProjectWhere(scope, opts)
}

export async function getProjectAccessLevel(userId: string, projectId: string) {
  const access = await prisma.projectAccess.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { accessLevel: true },
  })
  return access?.accessLevel ?? null
}

export async function ensureProjectPermission(
  user: { id: string; email?: string | null },
  projectId: string,
  required: 'READ' | 'EDIT',
) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { teamId: true } })
  if (!project) return null
  const workspace = await prisma.team.findUnique({ where: { id: project.teamId }, select: { ownerId: true } })
  if (workspace?.ownerId === user.id) return 'EDIT'
  const access = await prisma.projectAccess.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { accessLevel: true },
  })
  if (!access) return null
  if (required === 'EDIT' && access.accessLevel !== 'EDIT') return null
  return access.accessLevel
}

export type UserCapability = {
  isSuperAdmin: boolean
  canAccessUsers: boolean
  canCreateUsers: boolean
  canEditUsers: boolean
  canDeleteUsers: boolean
}

export async function getUserCapability(userId: string, workspaceId?: string | null): Promise<UserCapability> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { permissions: true },
  })
  const resolvedWorkspaceId = workspaceId ?? (await getWorkspaceContext(userId)).workspaceId
  const workspace = resolvedWorkspaceId
    ? await prisma.team.findUnique({ where: { id: resolvedWorkspaceId }, select: { ownerId: true } })
    : null
  const isOwner = workspace?.ownerId === userId
  const perms = user?.permissions
  const canAccessUsers = !!resolvedWorkspaceId && (isOwner || !!perms?.canAccessUsers)
  return {
    isSuperAdmin: !!(resolvedWorkspaceId && isOwner),
    canAccessUsers,
    canCreateUsers: canAccessUsers && (isOwner || !!perms?.canCreateUsers),
    canEditUsers: canAccessUsers && (isOwner || !!perms?.canEditUsers),
    canDeleteUsers: canAccessUsers && (isOwner || !!perms?.canDeleteUsers),
  }
}
