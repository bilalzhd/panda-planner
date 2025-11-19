import { prisma } from '@/lib/prisma'
import { requireUser, isSuperAdmin } from '@/lib/tenant'

export async function GET() {
  const { user } = await requireUser()
  const currentIsSuper = isSuperAdmin(user)
  let recipients: {
    id: string
    name: string | null
    email: string | null
    sharedProjects: string[]
    isSuperAdmin: boolean
  }[] = []

  if (currentIsSuper) {
    const others = await prisma.user.findMany({
      where: { id: { not: user.id } },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    })
    recipients = others.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      sharedProjects: [],
      isSuperAdmin: isSuperAdmin(u),
    }))
  } else {
    const myProjects = await prisma.projectAccess.findMany({
      where: { userId: user.id },
      select: { projectId: true },
    })
    const projectIds = myProjects.map((p) => p.projectId)
    if (projectIds.length > 0) {
      const others = await prisma.user.findMany({
        where: {
          id: { not: user.id },
          projectAccesses: { some: { projectId: { in: projectIds } } },
        },
        include: {
          projectAccesses: {
            where: { projectId: { in: projectIds } },
            include: { project: { select: { name: true } } },
          },
        },
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
      })
      recipients = others.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        sharedProjects: u.projectAccesses
          .map((pa) => pa.project?.name)
          .filter((n): n is string => !!n),
        isSuperAdmin: isSuperAdmin(u),
      }))
    }
  }

  const adminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
  if (!currentIsSuper && adminEmail) {
    const adminUser = await prisma.user.findFirst({ where: { email: adminEmail } })
    if (adminUser && adminUser.id !== user.id) {
      const exists = recipients.some((r) => r.id === adminUser.id)
      if (!exists) {
        recipients.unshift({
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          sharedProjects: [],
          isSuperAdmin: true,
        })
      }
    }
  }

  return Response.json({ recipients })
}
