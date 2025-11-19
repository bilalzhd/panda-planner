import { prisma } from '@/lib/prisma'
import { requireUser, isSuperAdmin } from '@/lib/tenant'
import { DirectMessages } from '@/components/direct-messages'

export const dynamic = 'force-dynamic'

type Recipient = {
  id: string
  name: string | null
  email: string | null
  sharedProjects: string[]
  isSuperAdmin: boolean
}

async function getRecipients(userId: string, superAdminEmail?: string | null) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return []
  const currentIsSuper = isSuperAdmin(user)
  if (currentIsSuper) {
    const others = await prisma.user.findMany({
      where: { id: { not: user.id } },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    })
    return others.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      sharedProjects: [],
      isSuperAdmin: isSuperAdmin(u),
    }))
  }
  const myProjects = await prisma.projectAccess.findMany({
    where: { userId },
    select: { projectId: true },
  })
  const projectIds = myProjects.map((p) => p.projectId)
  let recipients: Recipient[] = []
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
      sharedProjects: u.projectAccesses.map((pa) => pa.project?.name || '').filter((n): n is string => !!n),
      isSuperAdmin: isSuperAdmin(u),
    }))
  }
  if (superAdminEmail) {
    const admin = await prisma.user.findFirst({ where: { email: superAdminEmail } })
    if (admin && admin.id !== user.id && !recipients.some((r) => r.id === admin.id)) {
      recipients.unshift({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        sharedProjects: [],
        isSuperAdmin: true,
      })
    }
  }
  return recipients
}

export default async function MessagesPage() {
  const { user } = await requireUser()
  const superEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() || null
  const recipients = await getRecipients(user.id, superEmail)
  const first = recipients[0]
  let initialMessages: any[] = []
  if (first) {
    initialMessages = await prisma.userMessage.findMany({
      where: {
        OR: [
          { senderId: user.id, receiverId: first.id },
          { senderId: first.id, receiverId: user.id },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, name: true, email: true } } },
    })
  }
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Direct Messages</h1>
      <DirectMessages
        initialRecipients={recipients}
        initialMessages={initialMessages}
        initialSelectedId={first?.id}
        currentUserId={user.id}
      />
    </div>
  )
}
