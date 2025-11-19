import { prisma } from '@/lib/prisma'
import { requireUser, getUserCapability } from '@/lib/tenant'
import { notFound } from 'next/navigation'
import { UserManagement } from '@/components/user-management'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const { user, workspaceId } = await requireUser()
  const capability = await getUserCapability(user.id, workspaceId)
  if (!capability.canAccessUsers || !workspaceId) {
    notFound()
  }
  const members = await prisma.membership.findMany({
    where: { teamId: workspaceId },
    include: {
      team: { select: { ownerId: true, name: true } },
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
  })
  const projects = await prisma.project.findMany({ where: { teamId: workspaceId }, orderBy: { name: 'asc' } })
  const mappedUsers = members.map((member) => {
    const u = member.user
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      isSuperAdmin: member.team?.ownerId === u.id,
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
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-sm text-white/60">Manage project access and permissions.</p>
      </div>
      <UserManagement
        initialUsers={mappedUsers}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        capability={capability}
        currentUserId={user.id}
      />
    </div>
  )
}
