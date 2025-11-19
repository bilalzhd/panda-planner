import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/tenant'
import { DirectMessages } from '@/components/direct-messages'

export const dynamic = 'force-dynamic'

type Recipient = {
  id: string
  name: string | null
  email: string | null
  sharedProjects: string[]
  isSuperAdmin: boolean
}

async function getRecipients(userId: string, workspaceId: string, workspaceOwnerId: string | null) {
  const currentIsSuper = workspaceOwnerId === userId
  let myProjectIds: string[] = []
  if (currentIsSuper) {
    const projects = await prisma.project.findMany({
      where: { teamId: workspaceId },
      select: { id: true },
    })
    myProjectIds = projects.map((p) => p.id)
  } else {
    const myProjects = await prisma.projectAccess.findMany({
      where: { userId, project: { teamId: workspaceId } },
      select: { projectId: true },
    })
    myProjectIds = myProjects.map((p) => p.projectId)
  }
  const memberships = await prisma.membership.findMany({
    where: { teamId: workspaceId, userId: { not: userId } },
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
  return memberships
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
}

export default async function MessagesPage() {
  const { user, workspace } = await requireUser()
  if (!workspace) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Direct Messages</h1>
        <p className="text-sm text-white/60">Select or create a workspace to start messaging teammates.</p>
      </div>
    )
  }
  const recipients = await getRecipients(user.id, workspace.id, workspace.ownerId)
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
