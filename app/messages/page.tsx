import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/tenant'
import Link from 'next/link'
import { TeamChat } from '@/components/team-chat'

export const dynamic = 'force-dynamic'

export default async function MessagesPage({ searchParams }: { searchParams: { teamId?: string } }) {
  const { user } = await requireUser()
  // Choose a team: prefer explicit query, fallback to most recent membership
  const memberships = await prisma.membership.findMany({ where: { userId: user.id }, include: { team: true }, orderBy: { createdAt: 'desc' } })
  if (memberships.length === 0) return <div className="text-white/60">Join or create a team to start messaging.</div>
  const allowedIds = new Set(memberships.map((m) => m.teamId))
  const teamId = (searchParams.teamId && allowedIds.has(searchParams.teamId)) ? searchParams.teamId : memberships[0].teamId
  const messages = await prisma.teamMessage.findMany({ where: { teamId }, include: { author: true, reads: { include: { user: true } } }, orderBy: { createdAt: 'asc' }, take: 500 })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Quick Messages</h1>
        <Link href="/dashboard" className="text-sm text-white/70 hover:text-white underline">Dashboard</Link>
      </div>
      <TeamChat teamId={teamId} initial={messages as any} currentUserId={user.id} currentUser={{ id: user.id, name: user.name, email: user.email, image: user.image }} />
    </div>
  )
}
