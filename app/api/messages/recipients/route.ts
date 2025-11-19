import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/tenant'

export async function GET() {
  const { user, workspaceId, workspace } = await requireUser()
  if (!workspaceId || !workspace) {
    return Response.json({ recipients: [] })
  }
  const workspaceOwnerId = workspace.ownerId
  const currentIsSuper = workspaceOwnerId === user.id
  let myProjectIds: string[] = []
  if (currentIsSuper) {
    const projects = await prisma.project.findMany({
      where: { teamId: workspaceId },
      select: { id: true },
    })
    myProjectIds = projects.map((p) => p.id)
  } else {
    const myProjects = await prisma.projectAccess.findMany({
      where: { userId: user.id, project: { teamId: workspaceId } },
      select: { projectId: true },
    })
    myProjectIds = myProjects.map((p) => p.projectId)
  }

  const memberships = await prisma.membership.findMany({
    where: { teamId: workspaceId, userId: { not: user.id } },
    include: {
      user: {
        include: {
          projectAccesses: {
            where: { project: { teamId: workspaceId } },
            include: { project: { select: { name: true } } },
          },
        },
      },
      team: { select: { ownerId: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const recipients = memberships
    .map((member) => {
      const u = member.user
      const sharedProjects = currentIsSuper
        ? u.projectAccesses.map((pa) => pa.project?.name || '').filter((n): n is string => !!n)
        : u.projectAccesses
            .filter((pa) => myProjectIds.includes(pa.projectId))
            .map((pa) => pa.project?.name || '')
            .filter((n): n is string => !!n)
      const recipientIsSuper = member.team?.ownerId === u.id
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        sharedProjects,
        isSuperAdmin: recipientIsSuper,
      }
    })
    .filter((recipient) => currentIsSuper || recipient.isSuperAdmin || recipient.sharedProjects.length > 0)
    .sort((a, b) => {
      const aName = a.name || a.email || ''
      const bName = b.name || b.email || ''
      return aName.localeCompare(bName)
    })

  return Response.json({ recipients })
}
